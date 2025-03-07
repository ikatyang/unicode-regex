import fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as prettier from 'prettier'
import { Charset } from 'regexp-util'

const dataId = '@unicode/unicode-16.0.0'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = async <T>(id: string) => (await import(id)).default as T

const isSupported = (category: string) =>
  !['Names', 'Sequence_Property'].includes(category)

const categoryMaps: Record<string, string[]> = await require(dataId)
const srcDirname = path.resolve(__dirname, '../src')

async function writeFile(file: string, code: string) {
  const directory = path.dirname(file)
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(
    file,
    await prettier.format(code, { parser: 'typescript' }),
  )
}

/* ----------------------------- types.generated ---------------------------- */

const typesFilename = path.join(srcDirname, 'types.generated.ts')
await writeFile(
  typesFilename,
  `export interface Category {${Object.keys(categoryMaps)
    .filter(isSupported)
    .map(category => {
      const subCategories = categoryMaps[category]
      return `${JSON.stringify(category)}: Array<${
        subCategories.length === 0
          ? 'never'
          : subCategories.map(x => JSON.stringify(x)).join('|')
      }>`
    })
    .join(';')}}`,
)

/* ----------------------------- data.generated ----------------------------- */

const dataDirname = path.join(srcDirname, 'data.generated')
const categories = Object.keys(categoryMaps).filter(isSupported)

await fs.rm(dataDirname, { recursive: true, force: true })

await writeFile(
  path.join(dataDirname, 'index.ts'),
  categories
    .map(subCategory => `export {default as ${subCategory}} from './${subCategory}/index.js';`)
    .join('\n'),
)

for (const category of categories) {
  const subDirname = path.join(dataDirname, category)

  const subCategories = categoryMaps[category]
  const code = [
    ...subCategories.map(
      (subCategory, index) =>
        `import { default as $${index} } from './${subCategory}.js';`,
    ),
    '',
    `export default {
${subCategories
  .map((subCategory, index) => `  ${JSON.stringify(subCategory)}: $${index},`)
  .join('\n')}
};`,
  ].join('\n')

  await writeFile(path.join(subDirname, 'index.ts'), code)

  for (const subCategory of subCategories) {
    const filename = path.join(subDirname, subCategory)
    let content = new Charset()

    const data: number[] =
      await require(`${dataId}/${category}/${subCategory}/code-points.js`)
    const batch = 1000
    for (let i = 0; i < data.length; i += batch) {
      content = content.union(...data.slice(i, i + batch))
    }

    await writeFile(
      `${filename}.ts`,
      [
        `const _: Array<number | [number, number]> = ${JSON.stringify(
          content.data.map(([start, end]) =>
            start === end ? start : [start, end],
          ),
        )}`,
        `export default _`,
      ].join('\n'),
    )
  }
}
