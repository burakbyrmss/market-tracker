import { render, screen } from '@testing-library/react-native';

import type { AssetId } from '@/domain/ids';
import { CoinIcon, coinName } from '@/features/coins';
import { COIN_ICONS } from '@/features/coins/generated/coin-icons';

const id = (raw: string) => raw as AssetId;

test('names coins from the icon set', () => {
  expect(coinName(id('BTC'))).toBe('Bitcoin');
  expect(coinName(id('ETH'))).toBe('Ethereum');
});

test('hand-written names fill gaps and replace dated ones', () => {
  expect(coinName(id('SUI'))).toBe('Sui');
  expect(coinName(id('FIL'))).toBe('Filecoin');
  expect(coinName(id('BNB'))).toBe('BNB');
});

test('an excluded entry loses its icon: the ticker now means another coin', () => {
  expect(coinName(id('AMP'))).toBe('Amp');
  expect(COIN_ICONS.AMP).toBeUndefined();
  expect(COIN_ICONS.GENERIC).toBeUndefined();
});

test('an unknown coin has no name', () => {
  expect(coinName(id('NOTACOIN42'))).toBeNull();
});

test('a covered coin shows its logo, others a lettered circle', async () => {
  await render(<CoinIcon assetId={id('BTC')} />);
  expect(screen.getByTestId('coin-icon-BTC')).toBeOnTheScreen();

  await render(<CoinIcon assetId={id('NOTACOIN42')} />);
  expect(screen.queryByTestId('coin-icon-NOTACOIN42')).toBeNull();
  // The circle is hidden from screen readers: the row's label names the coin.
  expect(screen.getByText('N', { includeHiddenElements: true })).toBeOnTheScreen();
});
