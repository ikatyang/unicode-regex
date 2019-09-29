import del = require('del');
import * as fs from 'fs';
import mkdir = require('make-dir');
import * as path from 'path';
import { format } from 'prettier';
import { Charset, CharsetDataUnit } from 'regexp-util';

const data_id = 'unicode-12.1.0';

const is_supported = (category: string) => category !== 'Sequence_Property';

// tslint:disable-next-line:no-var-requires
const category_maps: Record<string, string[]> = require(data_id);
const src_dirname = path.resolve(__dirname, '../src');

/* ----------------------------- types.generated ---------------------------- */

const types_filename = path.join(src_dirname, 'types.generated.ts');
fs.writeFileSync(
  types_filename,
  format(
    `// tslint:disable\nexport interface Category {${Object.keys(category_maps)
      .filter(is_supported)
      .map(category => {
        const sub_categories = category_maps[category];
        return `${JSON.stringify(category)}: Array<${
          sub_categories.length === 0
            ? 'never'
            : sub_categories.map(x => JSON.stringify(x)).join('|')
        }>`;
      })
      .join(';')}}`,
    { parser: 'typescript' },
  ),
);

/* ----------------------------- data.generated ----------------------------- */

const data_dirname = path.join(src_dirname, 'data.generated');
del.sync(data_dirname);
mkdir.sync(data_dirname);

for (const category of Object.keys(category_maps).filter(is_supported)) {
  const sub_dirname = path.join(data_dirname, category);
  fs.mkdirSync(sub_dirname);

  for (const sub_category of category_maps[category]) {
    const filename = path.join(sub_dirname, sub_category);
    let content = new Charset();

    // tslint:disable-next-line:no-var-requires
    const data = require(`${data_id}/${category}/${sub_category}/code-points`);
    const batch = 1000;
    for (let i = 0; i < data.length; i += batch) {
      content = content.union(...data.slice(i, i + batch));
    }

    fs.writeFileSync(
      `${filename}.json`,
      JSON.stringify(
        content.data.map(([start, end]) =>
          start === end ? start : [start, end],
        ),
      ),
    );
  }
}
