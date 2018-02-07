import unicode = require('../src/index');

test('P-category', () => {
  const regex = unicode({ General_Category: ['Punctuation'] }).toRegExp('u');
  expect(regex.test('a')).toBe(false);
  expect(regex.test('"')).toBe(true);
  expect(regex.test('“')).toBe(true);
});

test('union multi sub category', () => {
  const letter_regex = unicode({
    General_Category: ['Letter'],
  }).toRegExp('u');
  expect(letter_regex.test('0')).toBe(false);
  expect(letter_regex.test('a')).toBe(true);
  expect(letter_regex.test(',')).toBe(false);

  const punctuation_regex = unicode({
    General_Category: ['Punctuation'],
  }).toRegExp('u');
  expect(punctuation_regex.test('0')).toBe(false);
  expect(punctuation_regex.test('a')).toBe(false);
  expect(punctuation_regex.test(',')).toBe(true);

  const letter_or_punctuation_regex = unicode({
    General_Category: ['Letter', 'Punctuation'],
  }).toRegExp('u');
  expect(letter_or_punctuation_regex.test('0')).toBe(false);
  expect(letter_or_punctuation_regex.test('a')).toBe(true);
  expect(letter_or_punctuation_regex.test(',')).toBe(true);
});

test('intersect multi category', () => {
  const han_regex = unicode({
    Script: ['Han'],
  }).toRegExp('u');
  expect(han_regex.test('a')).toBe(false);
  expect(han_regex.test('。')).toBe(false);
  expect(han_regex.test('〸')).toBe(true);

  const cjk_s_and_p = unicode({
    Block: ['CJK_Symbols_And_Punctuation'],
  }).toRegExp('u');
  expect(cjk_s_and_p.test('a')).toBe(false);
  expect(cjk_s_and_p.test('。')).toBe(true);
  expect(cjk_s_and_p.test('〸')).toBe(true);

  const han_s_and_p = unicode({
    Script: ['Han'],
    Block: ['CJK_Symbols_And_Punctuation'],
  }).toRegExp('u');
  expect(han_s_and_p.test('a')).toBe(false);
  expect(han_s_and_p.test('。')).toBe(false);
  expect(han_s_and_p.test('〸')).toBe(true);
});

test('throw if no category', () => {
  expect(() => unicode({})).toThrowErrorMatchingSnapshot();
});

test('throw if no sub category', () => {
  expect(() =>
    unicode({ General_Category: [] }),
  ).toThrowErrorMatchingSnapshot();
});
