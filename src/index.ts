import { Charset } from 'regexp-util'
import { Category } from './types.generated.js'
import * as data from './data.generated/index.js'

export default function unicode(categories: Partial<Category>): Charset {
  const keys = Object.keys(categories) as (keyof Category)[]

  if (keys.length === 0) {
    throw new Error(`Expected at least one category, but received 0.`)
  }

  if (
    keys.some(key => {
      const subCategories = categories[key]
      return subCategories === undefined || subCategories.length === 0
    })
  ) {
    throw new Error(`Expected at least one sub category, but received 0.`)
  }

  const charsets = keys.map(key => {
    const subCategories: Category[typeof key][number][] = categories[key]!
    const subCharsets = subCategories.map(_ => getCharset(key, _))
    return new Charset().union(...subCharsets)
  })

  return charsets.reduce((a, b) => a.intersect(b))
}

function getCharset<C extends keyof Category>(
  category: C,
  subCategory: Category[C][number],
) {
  const categoryData = data[category]
  const charsetInputs: (number | [number, number])[] =
    categoryData[subCategory as keyof typeof categoryData]
  return new Charset().union(...charsetInputs)
}
