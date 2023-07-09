import { writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { deleteAsync } from 'del'
import mkdir from 'make-dir'
import { format } from 'prettier'
import { Charset } from 'regexp-util'

const dataId = '@unicode/unicode-15.0.0'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = async <T>(id: string) => (await import(id)).default as T

const isSupported = (category: string) =>
  !['Names', 'Sequence_Property'].includes(category)

const categoryMaps: Record<string, string[]> = await require(dataId)
const srcDirname = path.resolve(__dirname, '../src')

/* ----------------------------- types.generated ---------------------------- */

const typesFilename = path.join(srcDirname, 'types.generated.ts')
await writeFile(
  typesFilename,
  await format(
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
    { parser: 'typescript' },
  ),
)

/* ----------------------------- data.generated ----------------------------- */

const dataDirname = path.join(srcDirname, 'data.generated')
await deleteAsync(dataDirname)
await mkdir(dataDirname)
const categories = Object.keys(categoryMaps).filter(isSupported)

await writeFile(
  path.join(dataDirname, 'index.ts'),
  categories.map(_ => `export * as ${_} from './${_}/index.js'`).join('\n'),
)

for (const category of categories) {
  const subDirname = path.join(dataDirname, category)
  await mkdir(subDirname)

  await writeFile(
    path.join(subDirname, 'index.ts'),
    categoryMaps[category].length === 0
      ? 'export {}'
      : categoryMaps[category]
          .map(_ => [`export { default as ${_} } from './${_}.js'`])
          .join('\n'),
  )

  for (const subCategory of categoryMaps[category]) {
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
