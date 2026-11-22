import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { CurrencyCode } from '@/domain/ids';
import { search } from '@/domain/search';
import { useWatchlists } from '@/features/watchlist/store';
import { WatchToggle } from '@/features/watchlist/watch-toggle';
import { fxQueries } from '@/services/fx';
import { useLivePrices } from '@/services/market-data';
import { useCurrencyName } from '@/shared/i18n';
import { LetterAvatar } from '@/shared/ui/letter-avatar';
import { Screen } from '@/shared/ui/screen';

const RESULTS_PER_MARKET = 20;

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

function ResultRow({ label, detail }: { label: string; detail?: string }) {
  return (
    <View className="flex-1 flex-row items-center gap-3">
      <LetterAvatar label={label} />
      <View className="flex-1">
        <Text className="text-base font-semibold text-black dark:text-white">{label}</Text>
        {detail !== undefined && <Text className="text-sm text-gray-500">{detail}</Text>}
      </View>
    </View>
  );
}

const rowClass =
  'h-16 flex-row items-center border-b border-gray-200 pl-4 pr-2 dark:border-gray-800';

export function SearchScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const listed = useLivePrices((state) => state.listed);
  const fx = useQuery(fxQueries.latest()).data;
  const currencyName = useCurrencyName();
  const watchedCoins = useWatchlists((state) => state.crypto);
  const watchedCurrencies = useWatchlists((state) => state.fx);
  const { toggleCrypto, toggleFx } = useWatchlists.getState();

  // Coins come by volume, so a tie goes to the bigger market.
  const coins = useMemo(
    () =>
      search(
        listed.map((id) => ({ id, terms: [id] })),
        query,
        RESULTS_PER_MARKET,
      ),
    [listed, query],
  );
  const currencies = useMemo(() => {
    if (!fx) return [];
    const codes: CurrencyCode[] = [fx.base, ...fx.rates.keys()].sort();
    return search(
      codes.map((code) => ({ id: code, terms: [code, currencyName(code)] })),
      query,
      RESULTS_PER_MARKET,
    );
  }, [fx, query, currencyName]);

  const empty = query.trim() === '';

  return (
    <Screen title={t('search.title')}>
      <TextInput
        accessibilityLabel={t('search.label')}
        placeholder={t('search.placeholder')}
        placeholderTextColor="#6b7280"
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        testID="search-input"
        className="mx-4 my-2 rounded-lg bg-gray-100 px-3 py-2 text-base text-black dark:bg-gray-900 dark:text-white"
      />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {empty ? (
          <Text className="px-4 py-6 text-center text-base text-gray-500">{t('search.hint')}</Text>
        ) : coins.length === 0 && currencies.length === 0 ? (
          <Text className="px-4 py-6 text-center text-base text-gray-500">
            {t('search.noMatches')}
          </Text>
        ) : (
          <>
            {coins.length > 0 && (
              <Section title={t('markets.crypto')}>
                {coins.map((id) => (
                  <View key={id} className={rowClass}>
                    <Link href={{ pathname: '/asset/[id]', params: { id } }} asChild>
                      <Pressable testID={`search-crypto-${id}`} className="flex-1">
                        <ResultRow label={id} />
                      </Pressable>
                    </Link>
                    <WatchToggle
                      name={id}
                      watched={watchedCoins.includes(id)}
                      onToggle={() => toggleCrypto(id)}
                      testID={`watch-crypto-${id}`}
                    />
                  </View>
                ))}
              </Section>
            )}
            {currencies.length > 0 && (
              <Section title={t('markets.fx')}>
                {currencies.map((code) => (
                  <View key={code} testID={`search-fx-${code}`} className={rowClass}>
                    <ResultRow label={code} detail={currencyName(code)} />
                    <WatchToggle
                      name={code}
                      watched={watchedCurrencies.includes(code)}
                      onToggle={() => toggleFx(code)}
                      testID={`watch-fx-${code}`}
                    />
                  </View>
                ))}
              </Section>
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
