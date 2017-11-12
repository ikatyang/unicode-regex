import * as fs from 'fs';
import * as path from 'path';
import { normalize_ranges } from '../src/utils';

const dist_filename = process.argv[2];

interface CharData {
  category: string;
}
interface CategoryData {
  category: string;
  ranges: [number, number][];
}

const category_dirname = path.resolve(
  __dirname,
  '../node_modules/unicode/category',
);
const category_database: CategoryData[] = [];

fs.readdirSync(category_dirname).forEach(raw_category => {
  const category = path.basename(raw_category, '.js');
  const char_codes: number[] = [];

  const id = `${category_dirname}/${category}`;
  const data: { [char_code: number]: CharData } = require(id);

  Object.keys(data).forEach(raw_char_code => {
    const char_code = +raw_char_code;
    if (char_code >= 0 && char_code <= 0xffff) {
      char_codes.push(char_code);
    }
  });

  const ranges = normalize_ranges(
    char_codes.map<[number, number]>(x => [x, x]),
  );

  category_database.push({ category, ranges });
});

fs.writeFileSync(
  dist_filename,
  [
    '// tslint:disable',
    `export type Category = ${category_database
      .map(category_data => JSON.stringify(category_data.category))
      .join('|')};`,
    `export const get_data = (): Record<Category, [number, number][]> => (${JSON.stringify(
      category_database.reduce(
        (current, category_data) => ({
          ...current,
          [category_data.category]: category_data.ranges,
        }),
        {},
      ),
    )});`,
  ].join('\n'),
);
