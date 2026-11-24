import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { ChartRange, PricePoint } from '@/domain/market';
import { ChartSection } from '@/features/chart/chart-section';
import i18n from '@/shared/i18n';

const HOUR = 3_600_000;
const points: PricePoint[] = [
  { time: 0, price: 100 },
  { time: HOUR, price: 150 },
  { time: 2 * HOUR, price: 120 },
];

const query = (
  overrides: Partial<{ data: PricePoint[]; isError: boolean; dataUpdatedAt: number }> = {},
) => ({
  data: undefined,
  dataUpdatedAt: 0,
  isError: false,
  refetch: jest.fn(),
  ...overrides,
});

async function renderChart(props: Partial<Parameters<typeof ChartSection<ChartRange>>[0]> = {}) {
  const onRange = jest.fn();
  await render(
    <ChartSection<ChartRange>
      ranges={['1D', '1W', 'ALL']}
      range="1D"
      onRange={onRange}
      query={query({ data: points })}
      note="Chart: BTC/USDT on Binance"
      formatValue={(value) => `$${value}`}
      formatTime={(time) => `hour ${time / HOUR}`}
      formatSavedAt={(time) => `hour ${time / HOUR}`}
      {...props}
    />,
  );
  return { onRange };
}

async function layOut(width = 216) {
  await act(() =>
    fireEvent(screen.getByTestId('price-chart'), 'layout', {
      nativeEvent: { layout: { width, height: 200 } },
    }),
  );
}

afterEach(async () => {
  await i18n.changeLanguage('en');
});

test('shows the last price and the change over the range, and names the pair', async () => {
  await renderChart();
  expect(screen.getByTestId('chart-value')).toHaveTextContent('$120');
  expect(screen.getByTestId('chart-caption')).toHaveTextContent('+20.00% over 1 day');
  expect(screen.getByText('Chart: BTC/USDT on Binance')).toBeOnTheScreen();
});

test('summarizes the chart for screen readers', async () => {
  await renderChart();
  expect(
    screen.getByLabelText('1 day chart from $100 to $120. High $150, low $100.'),
  ).toBeOnTheScreen();
});

test('a finger on the chart reads the nearest point, and lifting it returns to the last', async () => {
  await renderChart();
  await layOut();
  const chart = screen.getByTestId('price-chart');

  // Width 216 with 8 px padding: points at x = 8, 108, and 208.
  await act(() => fireEvent(chart, 'responderGrant', { nativeEvent: { locationX: 100 } }));
  expect(screen.getByTestId('chart-value')).toHaveTextContent('$150');
  expect(screen.getByTestId('chart-caption')).toHaveTextContent('hour 1');

  await act(() => fireEvent(chart, 'responderMove', { nativeEvent: { locationX: 20 } }));
  expect(screen.getByTestId('chart-value')).toHaveTextContent('$100');

  await act(() => fireEvent(chart, 'responderRelease'));
  expect(screen.getByTestId('chart-value')).toHaveTextContent('$120');
});

test('range tabs show the selected range and report a new one', async () => {
  const { onRange } = await renderChart();
  expect(screen.getByRole('tab', { name: '1 day', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('tab', { name: 'all time' }));
  expect(onRange).toHaveBeenCalledWith('ALL');
});

test('says when the chart is loading', async () => {
  await renderChart({ query: query() });
  expect(screen.getByText('Loading chart…')).toBeOnTheScreen();
});

test('offers a retry when the chart fails', async () => {
  const failed = query({ isError: true });
  await renderChart({ query: failed });
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(failed.refetch).toHaveBeenCalled();
});

test('says when a range has too little data to draw', async () => {
  await renderChart({ query: query({ data: points.slice(0, 1) }) });
  expect(screen.getByText('No chart data for this range.')).toBeOnTheScreen();
});

test('keeps a saved chart that could not update, says how old it is, and offers a retry', async () => {
  const failed = query({ data: points, isError: true, dataUpdatedAt: 5 * HOUR });
  await renderChart({ query: failed });
  expect(screen.getByTestId('chart-value')).toHaveTextContent('$120');
  expect(screen.getByText('Could not update. Showing the chart saved hour 5.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(failed.refetch).toHaveBeenCalled();
});

test('a chart that updated shows no notice', async () => {
  await renderChart();
  expect(screen.queryByTestId('stale-notice')).toBeNull();
});
