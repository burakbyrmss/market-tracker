import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { convert, parseAmount, type CryptoPrices, type Unit } from '@/domain/converter';
import { displayCurrencyCode, type AssetId, type CurrencyCode } from '@/domain/ids';
import type { Decimal } from '@/domain/money';
import { PricesNotice } from '@/features/market/prices-notice';
import { useSettings } from '@/features/settings/store';
import { FX_SOURCE_NAME, fxQueries } from '@/services/fx';
import { useLivePrices } from '@/services/market-data';
import { formatCryptoAmount, formatDate, formatPrice } from '@/shared/format';
import { useCurrencyName, useFormatLocale } from '@/shared/i18n';
import { Screen } from '@/shared/ui/screen';

import { UnitPicker } from './unit-picker';

const NO_DIRECT_PRICES = new Map<CurrencyCode, Decimal>();

// Live prices of one side when it is a coin. Reads only that coin, like a list row.
function useCryptoPrices(unit: Unit): CryptoPrices {
  const id = unit.kind === 'crypto' ? unit.id : null;
  const quote = useLivePrices((state) => (id ? state.quotes[id] : undefined));
  const direct = useLivePrices((state) => (id && state.directPrices[id]) || NO_DIRECT_PRICES);
  return useMemo(() => ({ usdPrice: quote?.price ?? null, directPrices: direct }), [quote, direct]);
}

function unitLabel(unit: Unit): string {
  return unit.kind === 'crypto' ? unit.id : unit.code;
}

function formatIn(value: Decimal, unit: Unit, locale: string): string {
  return unit.kind === 'crypto'
    ? `${formatCryptoAmount(value, locale)} ${unit.id}`
    : formatPrice(value, unit.code, locale);
}

function UnitButton({
  side,
  unit,
  onPress,
}: {
  side: 'from' | 'to';
  unit: Unit;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const currencyName = useCurrencyName();
  const label = unitLabel(unit);
  const detail = unit.kind === 'crypto' ? t('converter.crypto') : currencyName(unit.code);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(`converter.${side}`)}: ${label}, ${detail}`}
      accessibilityHint={t('converter.pick')}
      testID={`converter-${side}`}
      onPress={onPress}
      className="flex-row items-center justify-between rounded-xl bg-gray-100 px-4 py-3 active:bg-gray-200 dark:bg-gray-900 dark:active:bg-gray-800"
    >
      <View>
        <Text className="text-xs uppercase text-gray-500 dark:text-gray-400">
          {t(`converter.${side}`)}
        </Text>
        <Text className="text-xl font-semibold text-black dark:text-white">{label}</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-400">{detail}</Text>
      </View>
      <Text className="text-xl text-gray-500 dark:text-gray-400">›</Text>
    </Pressable>
  );
}

export function ConverterScreen() {
  const { t } = useTranslation();
  const locale = useFormatLocale();
  const display = useSettings((state) => state.displayCurrency);
  const [amountText, setAmountText] = useState('1');
  const [from, setFrom] = useState<Unit>({ kind: 'crypto', id: 'BTC' as AssetId });
  const [to, setTo] = useState<Unit>({ kind: 'fiat', code: displayCurrencyCode(display) });
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const fx = useQuery(fxQueries.latest()).data ?? null;
  const source = useLivePrices((state) => state.source);
  const fromPrices = useCryptoPrices(from);
  const toPrices = useCryptoPrices(to);

  const amount = parseAmount(amountText);
  const result =
    amount === null || amount === 'empty'
      ? null
      : convert(amount, from, to, {
          crypto: (id) => (from.kind === 'crypto' && from.id === id ? fromPrices : toPrices),
          fx,
        });

  const notes: string[] = [];
  if (result?.ok && source) {
    const coin = from.kind === 'crypto' ? from : to.kind === 'crypto' ? to : null;
    const fiat = from.kind === 'fiat' ? from : to.kind === 'fiat' ? to : null;
    if (result.method === 'direct' && coin?.kind === 'crypto' && fiat?.kind === 'fiat') {
      notes.push(t('converter.direct', { pair: `${coin.id}/${fiat.code}`, source: source.name }));
    } else if (result.method === 'usd-fx' && coin?.kind === 'crypto') {
      notes.push(t('converter.usdFx', { coin: coin.id, source: source.name }));
    } else if (result.method === 'cross') {
      notes.push(t('converter.cross', { source: source.name }));
    } else if (result.method === 'usd') {
      notes.push(t('market.source', { name: source.name }));
    }
  }
  if (result?.ok && result.fxDate) {
    notes.push(
      `${t('market.source', { name: FX_SOURCE_NAME })}. ${t('fxDetail.rateOf', {
        date: formatDate(result.fxDate, locale),
      })}`,
    );
  }

  return (
    <Screen title={t('converter.title')}>
      <ScrollView contentContainerClassName="gap-4 p-4" keyboardShouldPersistTaps="handled">
        <TextInput
          accessibilityLabel={t('converter.amount')}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          testID="converter-amount"
          className="rounded-xl bg-gray-100 px-4 py-3 text-2xl tabular-nums text-black dark:bg-gray-900 dark:text-white"
        />
        {amount === null && (
          <Text accessibilityLiveRegion="polite" className="text-sm text-red-600 dark:text-red-400">
            {t('converter.invalid')}
          </Text>
        )}
        <UnitButton side="from" unit={from} onPress={() => setPicking('from')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('converter.swap')}
          testID="converter-swap"
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
          className="h-11 w-11 items-center justify-center self-center rounded-full bg-gray-100 dark:bg-gray-900"
        >
          <Text className="text-xl text-blue-600 dark:text-blue-400">⇅</Text>
        </Pressable>
        <UnitButton side="to" unit={to} onPress={() => setPicking('to')} />

        {result && (
          <View className="gap-1 pt-2">
            {result.ok ? (
              <>
                <Text
                  testID="converter-result"
                  accessibilityLiveRegion="polite"
                  className="text-3xl font-bold tabular-nums text-black dark:text-white"
                >
                  {formatIn(result.amount, to, locale)}
                </Text>
                <Text
                  testID="converter-rate"
                  className="text-base text-gray-500 dark:text-gray-400"
                >
                  {t('converter.rate', {
                    from: unitLabel(from),
                    rate: formatIn(result.rate, to, locale),
                  })}
                </Text>
                {notes.map((note) => (
                  <Text key={note} className="text-sm text-gray-500 dark:text-gray-400">
                    {note}
                  </Text>
                ))}
                {(from.kind === 'crypto' || to.kind === 'crypto') && <PricesNotice />}
              </>
            ) : (
              <Text
                testID="converter-result"
                className="text-base text-gray-500 dark:text-gray-400"
              >
                {t('converter.unavailable')}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
      <UnitPicker
        visible={picking !== null}
        onClose={() => setPicking(null)}
        onPick={(unit) => {
          if (picking === 'from') setFrom(unit);
          else setTo(unit);
          setPicking(null);
        }}
      />
    </Screen>
  );
}
