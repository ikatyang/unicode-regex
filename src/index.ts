import { Charset } from 'regexp-util';
import { Category } from './types.generated';

function unicode(categories: Partial<Category>): Charset {
  const keys = Object.keys(categories) as Array<keyof Category>;

  if (keys.length === 0) {
    throw new Error(`Expected at least one category, but received 0.`);
  }

  if (
    keys.some(key => {
      const sub_categories = categories[key];
      return sub_categories === undefined || sub_categories.length === 0;
    })
  ) {
    throw new Error(`Expected at least one sub category, but received 0.`);
  }

  const charsets = keys.map(key => {
    const sub_categories: Array<Category[typeof key][number]> = categories[
      key
    ]!;
    const sub_charsets = sub_categories.map(x => get_charset(key, x));
    return new Charset().union(...sub_charsets);
  });

  return charsets.reduce((a, b) => a.intersect(b));
}

function get_charset<C extends keyof Category>(
  category: C,
  sub_category: Category[C][number],
) {
  return new Charset().union(
    ...require(`./data.generated/${category}/${sub_category}`),
  );
}

export = unicode;
