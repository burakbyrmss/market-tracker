import { Image } from 'react-native';

import type { AssetId } from '@/domain/ids';
import { LetterAvatar } from '@/shared/ui/letter-avatar';

import { COIN_ICONS } from './generated/coin-icons';
import generatedNames from './generated/coin-names.json';

const NAMES: Readonly<Record<string, string>> = generatedNames;

// The coin's full name, such as "Bitcoin". Null for coins the bundled list does not know yet:
// screens then show the ticker alone.
export function coinName(assetId: AssetId): string | null {
  return NAMES[assetId] ?? null;
}

// The bundled CC0 logo, or a lettered circle for coins the icon set does not cover (ADR 0008).
// Decorative: the row's label already names the coin.
export function CoinIcon({ assetId }: { assetId: AssetId }) {
  const icon = COIN_ICONS[assetId];
  if (!icon) return <LetterAvatar label={assetId} />;
  return (
    <Image
      source={icon}
      accessible={false}
      importantForAccessibility="no"
      testID={`coin-icon-${assetId}`}
      className="h-9 w-9"
    />
  );
}
