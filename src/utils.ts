export type Range = [number, number];

export function normalize_ranges(ranges: Range[]) {
  return ranges
    .sort(([start1], [start2]) => start1 - start2)
    .reduce<Range[]>((current, tuple, index) => {
      if (index === 0) {
        return [tuple];
      }

      const [last_start, last_end] = current[current.length - 1];
      const [start, end] = tuple;

      return last_end + 1 === start
        ? [...current.slice(0, -1), [last_start, end]]
        : [...current, tuple];
    }, []);
}

export function build_regex(ranges: Range[], flag?: string) {
  const pattern = ranges
    .map(
      ([start, end]) =>
        start === end
          ? `\\u${start.toString(16)}`
          : `\\u${start.toString(16)}-\\u${end.toString(16)}`,
    )
    .join('');
  return new RegExp(`[${pattern}]`, flag);
}
