import { useTranslation } from 'react-i18next';

import { marketData, useLivePrices } from '@/services/market-data';
import { formatChartTime } from '@/shared/format';
import { useFormatLocale } from '@/shared/i18n';
import { Notice } from '@/shared/ui/notice';

// Says how old the prices on screen are whenever they are not arriving live: saved prices at
// launch, offline, or while the socket reconnects. Renders nothing for live prices.
export function PricesNotice() {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const status = useLivePrices((state) => state.status);
  const connected = useLivePrices((state) => state.connected);
  const asOf = useLivePrices((state) => state.asOf);

  if (asOf === null || (status === 'live' && connected)) return null;

  const time = formatChartTime(asOf, locale, { withTime: true, utc: false });
  if (status === 'error') {
    return (
      <Notice text={t('market.savedOffline', { time })} onRetry={() => void marketData.start()} />
    );
  }
  return (
    <Notice
      text={t(status === 'live' ? 'market.reconnecting' : 'market.savedConnecting', { time })}
    />
  );
}
