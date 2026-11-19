import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

test('home screen shows the app name as a header', async () => {
  await render(<HomeScreen />);

  expect(screen.getByRole('header', { name: 'Market Tracker' })).toBeOnTheScreen();
});
