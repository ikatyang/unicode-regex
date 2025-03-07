import fs from 'node:fs/promises'
import * as prettier from 'prettier'
import { outdent } from 'outdent'
import { Charset } from 'regexp-util'
import packageJson from '../package.json' with { type: 'json' }

const unicodeDataPackageName = Object.keys(packageJson.devDependencies).find(
  name => name.startsWith('@unicode/unicode-'),
)

const { default: unicodeData } = await import(unicodeDataPackageName)

const unSupportedCategories = new Set([
  'Names',
  'Sequence_Property',
  'Special_Casing',
])
const sourceDirectory = new URL('../src/', import.meta.url)
const categories = new Map(
  Object.entries(unicodeData).filter(
    ([category]) => !unSupportedCategories.has(category),
  ),
)

async function writeFile(file, code) {
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
  outdent`
    export interface Category {
      ${[...categories.entries()]
        .map(([category, subCategories]) => {
          const types =
            subCategories.length === 0
              ? 'never'
              : `(${subCategories
                  .map(subCategory => `| ${JSON.stringify(subCategory)}`)
                  .join('\n')})[]`
          return `${JSON.stringify(category)}: ${types};`
        })
        .join('\n')}
    };
  `,
)

/* ----------------------------- data.generated ----------------------------- */

const dataDirectory = new URL('./data.generated/', sourceDirectory)

await fs.rm(dataDirectory, { recursive: true, force: true })

await writeFile(
  new URL('./index.ts', dataDirectory),
  [...categories.keys()]
    .map(
      subCategory =>
        `export * as ${subCategory} from './${subCategory}/index.js';`,
    )
    .join('\n'),
)

for (const [category, subCategories] of categories) {
  const categoryDirectory = new URL(`./${category}/`, dataDirectory)

  await writeFile(
    new URL('./index.ts', categoryDirectory),
    subCategories
      .map(
        subCategory =>
          `export { default as ${subCategory} } from './${subCategory}.js';`,
      )
      .join('\n'),
  )

  for (const subCategory of subCategories) {
    const filename = new URL(`./${subCategory}.ts`, categoryDirectory)
    let content = new Charset()

    const { default: data } = await import(
      `${unicodeDataPackageName}/${category}/${subCategory}/code-points.js`
    )
    const batch = 1000
    for (let i = 0; i < data.length; i += batch) {
      content = content.union(...data.slice(i, i + batch))
    }

    await writeFile(
      filename,
      outdent`
        const _: (number | [number, number])[] = ${JSON.stringify(
          content.data.map(([start, end]) =>
            start === end ? start : [start, end],
          ),
        )};

        export default _;
      `,
    )
  }
}
