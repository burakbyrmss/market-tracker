import { fireEvent, render, screen } from '@testing-library/react-native';
import { colorScheme } from 'nativewind';

import i18n from '@/shared/i18n';
import { storage } from '@/shared/storage';

import { startSettings } from './apply';
import { SettingsScreen } from './settings-screen';
import { DEFAULT_SETTINGS, useSettings } from './store';

const stored = () => JSON.parse(storage.getString('settings') ?? 'null') as { state: unknown };

// Simulates an app restart: the store reads what MMKV holds.
async function restart(saved: string) {
  storage.set('settings', saved);
  await useSettings.persist.rehydrate();
}

beforeAll(() => {
  startSettings();
});

afterEach(async () => {
  useSettings.setState(DEFAULT_SETTINGS);
  storage.clearAll();
  await i18n.changeLanguage('en');
});

describe('settings screen', () => {
  test('shows its title in a header with a back button', async () => {
    await render(<SettingsScreen />);
    expect(screen.getByRole('header', { name: 'Settings' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
  });

  test('switches the app to Turkish when Türkçe is chosen', async () => {
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Türkçe' }));

    expect(await screen.findByRole('header', { name: 'Tema' })).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Türkçe' })).toBeChecked();
  });

  test('saves the chosen display currency', async () => {
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Euro (EUR)' }));

    expect(screen.getByRole('radio', { name: 'Euro (EUR)' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'US dollar (USD)' })).not.toBeChecked();
    expect(stored().state).toEqual({ displayCurrency: 'EUR', language: 'system', theme: 'system' });
  });

  test('applies the chosen theme', async () => {
    await render(<SettingsScreen />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));

    expect(colorScheme.get()).toBe('dark');
  });
});

describe('stored settings', () => {
  test('come back after a restart', async () => {
    await restart(
      JSON.stringify({
        state: { displayCurrency: 'TRY', language: 'tr', theme: 'light' },
        version: 1,
      }),
    );

    expect(useSettings.getState()).toMatchObject({
      displayCurrency: 'TRY',
      language: 'tr',
      theme: 'light',
    });
    expect(i18n.language).toBe('tr');
  });

  test('reset only the field that is no longer valid', async () => {
    await restart(
      JSON.stringify({
        state: { displayCurrency: 'GBP', language: 'tr', theme: 'dark' },
        version: 1,
      }),
    );

    expect(useSettings.getState()).toMatchObject({
      displayCurrency: 'USD',
      language: 'tr',
      theme: 'dark',
    });
  });

  test('fall back to defaults when the stored data is damaged', async () => {
    await restart('{not json');

    expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS);
  });
});
