import { get_data, Category } from './data.generated';
import { build_regex, normalize_ranges, Range } from './utils';

export = (categories: Category[], flag?: string) => {
  const data = get_data();
  const ranges = categories.reduce<Range[]>(
    (current, category) => [...current, ...data[category]],
    [],
  );
  return build_regex(normalize_ranges(ranges), flag);
};
