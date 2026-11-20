import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import i18n from '@/shared/i18n';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

test('home screen shows the app name as a header', async () => {
  await render(<HomeScreen />);

  expect(screen.getByRole('header', { name: 'Market Tracker' })).toBeOnTheScreen();
});

test('home screen shows Turkish text when the language is Turkish', async () => {
  await i18n.changeLanguage('tr');
  await render(<HomeScreen />);

  expect(screen.getByText('M2 performans testini aç')).toBeOnTheScreen();
});
