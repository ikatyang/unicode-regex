import fs from 'node:fs/promises'
import * as prettier from 'prettier'
import { Charset } from 'regexp-util'

const dataId = '@unicode/unicode-16.0.0'
const isSupported = (category: string) =>
  !['Names', 'Sequence_Property'].includes(category)

const categoryMaps: Record<string, string[]> = await require(dataId)
const sourceDirectory = new URL('../src/', import.meta.url)

async function writeFile(file: URL, code: string) {
  const directory = new URL('./', file)
  await fs.mkdir(directory, { recursive: true })
  await fs.writeFile(
    file,
    await prettier.format(code, { parser: 'typescript' }),
  )
}

/* ----------------------------- types.generated ---------------------------- */

const typesFilename = new URL('./types.generated.ts', sourceDirectory)
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

const dataDirectory = new URL('./data.generated/', sourceDirectory)
const categories = Object.keys(categoryMaps).filter(isSupported)

await fs.rm(dataDirectory, { recursive: true, force: true })

await writeFile(
  new URL('./index.ts', dataDirectory),
  categories
    .map(
      subCategory =>
        `export {default as ${subCategory}} from './${subCategory}/index.js';`,
    )
    .join('\n'),
)

for (const category of categories) {
  const categoryDirectory = new URL(`./${category}/`, dataDirectory)

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

  await writeFile(new URL('./index.ts', categoryDirectory), code)

  for (const subCategory of subCategories) {
    const filename = new URL(`./${subCategory}.ts`, categoryDirectory)
    let content = new Charset()

    const { default: data } = await import(
      `${dataId}/${category}/${subCategory}/code-points.js`
    )
    const batch = 1000
    for (let i = 0; i < data.length; i += batch) {
      content = content.union(...data.slice(i, i + batch))
    }

    await writeFile(
      filename,
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
