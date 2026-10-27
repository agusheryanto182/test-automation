import { createOrderInputSchema, type CreateOrderInput } from '@app/shared';

export interface OrderFormValues {
  customerEmail: string;
  item: string;
  amount: string;
}

export type OrderFormErrors = Partial<Record<keyof OrderFormValues, string>>;

export type OrderFormResult =
  { success: true; data: CreateOrderInput } | { success: false; errors: OrderFormErrors };

/** Validates raw form strings with the same zod schema the server uses. */
export function validateOrderForm(values: OrderFormValues): OrderFormResult {
  const amount = values.amount.trim() === '' ? NaN : Number(values.amount);
  const parsed = createOrderInputSchema.safeParse({
    customerEmail: values.customerEmail.trim(),
    item: values.item.trim(),
    amount,
  });
  if (parsed.success) return { success: true, data: parsed.data };

  const errors: OrderFormErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (key === 'customerEmail' || key === 'item' || key === 'amount') {
      errors[key] ??= issue.message;
    }
  }
  return { success: false, errors };
}
