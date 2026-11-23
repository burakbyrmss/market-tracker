import { z } from 'zod';

import { parseAssetId, parseCurrencyCode } from '@/domain/ids';
import { decimal, isDecimalString } from '@/domain/money';

// Schemas for our own types as stored on the device. Money is stored as a decimal string, so
// saved prices read back exactly.
export const storedDecimal = z
  .string()
  .refine(isDecimalString, { message: 'Not a decimal string' })
  .transform((raw) => decimal(raw));

export const storedAssetId = z.string().transform((raw, context) => {
  const id = parseAssetId(raw);
  if (id === null) {
    context.addIssue({ code: 'custom', message: 'Not an asset ID' });
    return z.NEVER;
  }
  return id;
});

export const storedCurrencyCode = z.string().transform((raw, context) => {
  const code = parseCurrencyCode(raw);
  if (code === null) {
    context.addIssue({ code: 'custom', message: 'Not a currency code' });
    return z.NEVER;
  }
  return code;
});

// Chart points are plain numbers already (see PricePoint).
export const storedPricePoints = z.array(z.object({ time: z.number(), price: z.number() }));
