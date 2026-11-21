import { z } from 'zod';

import { decimal, isDecimalString } from '@/domain/money';

// Providers send prices as decimal strings. Parse them straight into Decimal so no price
// passes through a float.
export const decimalString = z
  .string()
  .refine(isDecimalString, { message: 'Not a decimal string' })
  .transform((raw) => decimal(raw));

// A decimal string read as a plain number. Only for volumes and chart points.
export const numberString = z
  .string()
  .refine(isDecimalString, { message: 'Not a decimal string' })
  .transform(Number);
