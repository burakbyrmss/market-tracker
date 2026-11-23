import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { FxRates } from '@/domain/fx';
import { displayCurrencyCode, type AssetId, type DisplayCurrency } from '@/domain/ids';
import { FxRateRow } from '@/features/fx/fx-list';
import { CryptoRow } from '@/features/market/crypto-list';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { useLivePrices, useLiveQuote } from '@/services/market-data';
import { LetterAvatar } from '@/shared/ui/letter-avatar';

import { useWatchlists, type WatchMarket } from './store';

const rowClass =
  'h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text
        accessibilityRole="header"
        className="px-4 pb-1 pt-4 text-sm font-semibold uppercase text-gray-500"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

// A row with only a label and a note, for items without a price.
function PlainRow({ label, note, testID }: { label: string; note: string; testID: string }) {
  return (
    <View accessible testID={testID} className={rowClass}>
      <LetterAvatar label={label} />
      <Text className="flex-1 text-base font-semibold text-black dark:text-white">{label}</Text>
      <Text className="text-sm text-gray-500">{note}</Text>
    </View>
  );
}

function WatchedCoin({
  assetId,
  currency,
  fx,
}: {
  assetId: AssetId;
  currency: DisplayCurrency;
  fx: FxRates | null;
}) {
  const { t } = useTranslation();
  const quote = useLiveQuote(assetId);
  const source = useLivePrices((state) => state.source);
  if (quote) return <CryptoRow assetId={assetId} currency={currency} fx={fx} />;
  // ADR 0004: a coin the active provider does not list stays in the list, marked as such.
  const note = source ? t('watchlist.unavailable', { source: source.name }) : '–';
  return <PlainRow label={assetId} note={note} testID={`crypto-row-${assetId}`} />;
}

function EditButton({
  label,
  text,
  onPress,
}: {
  label: string;
  text: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center"
    >
      <Text className="text-xl text-blue-600">{text}</Text>
    </Pressable>
  );
}

// Buttons, not drag and drop: they work with a screen reader and need no new dependency.
function EditRow({
  market,
  label,
  index,
  count,
  onRemove,
}: {
  market: WatchMarket;
  label: string;
  index: number;
  count: number;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const move = useWatchlists((state) => state.move);
  return (
    <View testID={`edit-${market}-${label}`} className={rowClass}>
      <Text className="flex-1 text-base font-semibold text-black dark:text-white">{label}</Text>
      {index > 0 && (
        <EditButton
          label={t('watchlist.moveUp', { name: label })}
          text="↑"
          onPress={() => move(market, index, index - 1)}
        />
      )}
      {index < count - 1 && (
        <EditButton
          label={t('watchlist.moveDown', { name: label })}
          text="↓"
          onPress={() => move(market, index, index + 1)}
        />
      )}
      <EditButton label={t('watchlist.delete', { name: label })} text="✕" onPress={onRemove} />
    </View>
  );
}

export function WatchlistView() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const coins = useWatchlists((state) => state.crypto);
  const currencies = useWatchlists((state) => state.fx);
  const { toggleCrypto, toggleFx } = useWatchlists.getState();
  const currency = useSettings((state) => state.displayCurrency);
  const fx = useQuery(fxQueries.latest()).data ?? null;
  const source = useLivePrices((state) => state.source);

  if (coins.length === 0 && currencies.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 px-8">
        <Text className="text-center text-base text-gray-500">{t('watchlist.empty')}</Text>
        <Link href="/search" asChild>
          <Pressable className="rounded-lg bg-blue-600 px-4 py-2">
            <Text className="font-semibold text-white">{t('home.openSearch')}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const display = displayCurrencyCode(currency);

  return (
    <ScrollView>
      <View className="flex-row justify-end px-2">
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing(!editing)}
          className="h-11 justify-center px-2"
        >
          <Text className="text-base font-semibold text-blue-600">
            {t(editing ? 'watchlist.done' : 'watchlist.edit')}
          </Text>
        </Pressable>
      </View>
      {coins.length > 0 && (
        <Section title={t('markets.crypto')}>
          {coins.map((id, index) =>
            editing ? (
              <EditRow
                key={id}
                market="crypto"
                label={id}
                index={index}
                count={coins.length}
                onRemove={() => toggleCrypto(id)}
              />
            ) : (
              <WatchedCoin key={id} assetId={id} currency={currency} fx={fx} />
            ),
          )}
        </Section>
      )}
      {currencies.length > 0 && (
        <Section title={t('markets.fx')}>
          {currencies.map((code, index) =>
            editing ? (
              <EditRow
                key={code}
                market="fx"
                label={code}
                index={index}
                count={currencies.length}
                onRemove={() => toggleFx(code)}
              />
            ) : fx ? (
              <FxRateRow key={code} code={code} fx={fx} display={display} />
            ) : (
              <PlainRow key={code} label={code} note="–" testID={`fx-row-${code}`} />
            ),
          )}
        </Section>
      )}
      <Text className="px-4 py-3 text-center text-xs text-gray-500">
        {source
          ? t('market.sources', { crypto: source.name, fx: FX_SOURCE_NAME })
          : t('market.source', { name: FX_SOURCE_NAME })}
      </Text>
    </ScrollView>
  );
}
