'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTRPC } from './trpc';
import {
  validateOrderForm,
  type OrderFormErrors,
  type OrderFormValues,
} from './order-form-validation';

const emptyValues: OrderFormValues = { customerEmail: '', item: '', amount: '' };

export function OrderForm() {
  const trpc = useTRPC();
  const [values, setValues] = useState<OrderFormValues>(emptyValues);
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const create = useMutation(
    trpc.order.create.mutationOptions({ onSuccess: () => setValues(emptyValues) }),
  );

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateOrderForm(values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(result.data);
  };

  const field = (name: keyof OrderFormValues, label: string, type = 'text') => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        value={values[name]}
        onChange={(e) => setValues({ ...values, [name]: e.target.value })}
      />
      {errors[name] && <span role="alert">{errors[name]}</span>}
    </label>
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      {field('customerEmail', 'Customer email', 'email')}
      {field('item', 'Item')}
      {field('amount', 'Amount', 'number')}
      <button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Creating…' : 'Create order'}
      </button>
      {create.isSuccess && <p role="status">Order {create.data.order.id} created.</p>}
      {create.isError && <p role="alert">Failed: {create.error.message}</p>}
    </form>
  );
}
