/**
 * @jest-environment node
 */
import { ESLint } from 'eslint';

import config from '../../eslint.config.js';

// The M15 exit check: lint fails on text a user would see or hear that skips t().
// Jest cannot run ESLint's dynamic import of the config file, so the test passes the config itself.
const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });

// The lines that broke the rule, once each.
async function messages(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: 'src/features/probe.tsx' });
  const lines = (result?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-syntax')
    .map((message) => code.split('\n')[message.line - 1]?.trim() ?? '');
  return [...new Set(lines)];
}

const wrap = (jsx: string) =>
  `import { Text, TextInput, View } from 'react-native';\nexport function Probe({ on, n }: { on: boolean; n: number }) {\n  return (\n    <View>\n${jsx}\n    </View>\n  );\n}\n`;

test.each([
  ['text', '<Text>Hello</Text>'],
  ['a string expression', "<Text>{'Loading'}</Text>"],
  ['a conditional', "<Text>{on ? 'Yes' : 'No'}</Text>"],
  ['a template', '<Text>{`${n} items`}</Text>'],
  ['a placeholder', '<TextInput placeholder="Search" />'],
  ['a screen reader label', '<View accessibilityLabel={`Close ${n}`} />'],
])(
  'fails on untranslated %s',
  async (_kind, jsx) => {
    expect(await messages(wrap(jsx))).toEqual([jsx]);
  },
  30_000,
);

test('allows t(), numbers, and symbols', async () => {
  const code = wrap(
    '<Text accessibilityLabel={t(\'common.back\')}>{t(\'home.title\')}</Text>\n<Text>{n} ↑ ✕ – %</Text>\n<View testID="price-row" className="flex-1" />',
  ).replace('return (', 'const t = (key: string) => key;\n  return (');
  expect(await messages(code)).toEqual([]);
}, 30_000);
