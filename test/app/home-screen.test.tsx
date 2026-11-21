import { render, screen } from '@testing-library/react-native';

import MarketsScreen from '@/app/index';
import i18n from '@/shared/i18n';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

test('markets screen shows its title as a header', async () => {
  await render(<MarketsScreen />);

  expect(screen.getByRole('header', { name: 'Markets' })).toBeOnTheScreen();
});

test('markets screen shows Turkish text when the language is Turkish', async () => {
  await i18n.changeLanguage('tr');
  await render(<MarketsScreen />);

  expect(screen.getByRole('header', { name: 'Piyasalar' })).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: 'Ayarlar' })).toBeOnTheScreen();
});
