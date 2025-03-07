import { Charset } from 'regexp-util'
import type { Category } from './types.generated.js'
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

  const charsets = keys.map(category => {
    const subCategories: Category[typeof category][number][] =
      categories[category]!
    const subCharsets = subCategories.map(subCategory =>
      getCharset(category, subCategory),
    )
    return new Charset().union(...subCharsets)
  })

  return charsets.reduce((a, b) => a.intersect(b))
}

function getCharset<CategoryName extends keyof Category>(
  category: CategoryName,
  subCategory: Category[CategoryName][number],
) {
  const categoryData = data[category]
  const charsetInputs = categoryData[
    subCategory as keyof typeof categoryData
  ] as (number | [number, number])[]
  return new Charset().union(...charsetInputs)
}
