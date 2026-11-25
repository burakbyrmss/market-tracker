import en from '@/shared/i18n/locales/en.json';
import tr from '@/shared/i18n/locales/tr.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [[prefix + key, value]] : flatten(value, `${prefix + key}.`),
  );
}

// Strings that read the same in both languages: names, codes, and labels made only of values.
const SAME_IN_BOTH = new Set([
  'settings.language.en',
  'settings.language.tr',
  'settings.displayCurrency.EUR',
  'market.rowLabel',
  'market.rowLabelNoChange',
  'search.placeholder',
  'converter.rate',
  'fx.unit',
  'fx.rowLabel',
  'chart.range.1Y',
  'chart.range.5Y',
  'currency.EUR',
]);

// The compiler already rejects a missing Turkish key. This catches English pasted in as Turkish.
test('every Turkish string is translated', () => {
  const english = new Map(flatten(en));
  const copied = flatten(tr)
    .filter(([key, value]) => english.get(key) === value && !SAME_IN_BOTH.has(key))
    .map(([key]) => key);
  expect(copied).toEqual([]);
});

test('both languages fill the same placeholders', () => {
  const names = (text: string) => [...text.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
  const turkish = new Map(flatten(tr));
  const mismatched = flatten(en)
    .filter(
      ([key, value]) =>
        JSON.stringify(names(value)) !== JSON.stringify(names(turkish.get(key) ?? '')),
    )
    .map(([key]) => key);
  expect(mismatched).toEqual([]);
});
