import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import type { Unit } from '@/domain/converter';
import type { CurrencyCode } from '@/domain/ids';
import { search } from '@/domain/search';
import { CoinIcon, coinName } from '@/features/coins';
import { fxQueries } from '@/services/fx';
import { useLivePrices } from '@/services/market-data';
import { useCurrencyName } from '@/shared/i18n';
import { LetterAvatar } from '@/shared/ui/letter-avatar';
import { Screen } from '@/shared/ui/screen';

type Choice = { key: string; unit: Unit; label: string; detail: string; terms: string[] };

export function unitKey(unit: Unit): string {
  return unit.kind === 'crypto' ? `crypto-${unit.id}` : `fiat-${unit.code}`;
}

// Currencies first, then coins by volume. Search covers both, like the search screen.
function useChoices(query: string): Choice[] {
  const { t } = useTranslation();
  const listed = useLivePrices((state) => state.listed);
  const fx = useQuery(fxQueries.latest()).data;
  const currencyName = useCurrencyName();

  const all = useMemo(() => {
    const codes: CurrencyCode[] = fx ? [fx.base, ...fx.rates.keys()].sort() : [];
    return [
      ...codes.map((code): Choice => {
        const name = currencyName(code);
        return {
          key: unitKey({ kind: 'fiat', code }),
          unit: { kind: 'fiat', code },
          label: code,
          detail: name,
          terms: [code, name],
        };
      }),
      ...listed.map((id): Choice => ({
        key: unitKey({ kind: 'crypto', id }),
        unit: { kind: 'crypto', id },
        label: id,
        detail: coinName(id) ?? t('converter.crypto'),
        terms: [id, coinName(id) ?? ''],
      })),
    ];
  }, [fx, listed, currencyName, t]);

  return useMemo(() => {
    if (query.trim() === '') return all;
    const byKey = new Map(all.map((choice) => [choice.key, choice]));
    return search(
      all.map((choice) => ({ id: choice.key, terms: choice.terms })),
      query,
      50,
    ).flatMap((key) => byKey.get(key) ?? []);
  }, [all, query]);
}

export function UnitPicker({
  visible,
  onPick,
  onClose,
}: {
  visible: boolean;
  onPick: (unit: Unit) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const choices = useChoices(query);
  const close = () => {
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <Screen title={t('converter.pickTitle')} onBack={close}>
        <TextInput
          accessibilityLabel={t('converter.searchLabel')}
          placeholder={t('search.placeholder')}
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          className="mx-4 my-2 rounded-lg bg-gray-100 px-3 py-2 text-base text-black dark:bg-gray-900 dark:text-white"
        />
        <FlashList
          data={choices}
          keyExtractor={(choice) => choice.key}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${item.detail}`}
              testID={`unit-${item.key}`}
              onPress={() => {
                setQuery('');
                onPick(item.unit);
              }}
              className="min-h-16 flex-row items-center gap-3 border-b border-gray-200 px-4 py-2 active:bg-gray-100 dark:border-gray-800 dark:active:bg-gray-900"
            >
              {item.unit.kind === 'crypto' ? (
                <CoinIcon assetId={item.unit.id} />
              ) : (
                <LetterAvatar label={item.label} />
              )}
              <View className="flex-1">
                <Text className="text-base font-semibold text-black dark:text-white">
                  {item.label}
                </Text>
                <Text className="text-sm text-gray-500 dark:text-gray-400">{item.detail}</Text>
              </View>
            </Pressable>
          )}
        />
      </Screen>
    </Modal>
  );
}
