/**
 * Zod validation schemas for form inputs.
 * Provides client-side validation with clear error messages.
 */

import { z } from 'zod';

// Phone validation - Indian mobile format (10 digits starting with 6-9)
const phoneRegex = /^[6-9]\d{9}$/;

export const memberSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Name is required'),
  phone: z
    .string()
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(phoneRegex, 'Invalid phone number format'),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email is too long')
    .optional()
    .or(z.literal('')),
  start_date: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid start date'),
  expiry_date: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid expiry date'),
  plan_id: z.string().uuid().optional().or(z.literal('')),
  custom_price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(10000000, 'Price is too high')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

export const paymentSchema = z.object({
  member_id: z
    .string()
    .uuid('Invalid member selection'),
  amount: z
    .number()
    .min(1, 'Amount must be at least ₹1')
    .max(10000000, 'Amount is too high'),
  payment_mode: z.enum(['cash', 'upi', 'card'], {
    errorMap: () => ({ message: 'Please select a payment method' }),
  }),
  plan_id: z.string().uuid().optional().or(z.literal('')),
  extend_days: z
    .number()
    .int('Days must be a whole number')
    .min(1, 'Extension must be at least 1 day')
    .max(365, 'Extension cannot exceed 365 days')
    .optional(),
  notes: z
    .string()
    .max(500, 'Notes must be less than 500 characters')
    .optional(),
});

export const expenseSchema = z.object({
  category: z.enum(['rent', 'salary', 'electricity', 'maintenance', 'other'], {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
  amount: z
    .number()
    .min(1, 'Amount must be at least ₹1')
    .max(100000000, 'Amount is too high'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  expense_date: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
});

export const planSchema = z.object({
  name: z
    .string()
    .min(2, 'Plan name must be at least 2 characters')
    .max(50, 'Plan name must be less than 50 characters')
    .trim(),
  description: z
    .string()
    .max(200, 'Description must be less than 200 characters')
    .optional(),
  duration_days: z
    .number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days'),
  price: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(10000000, 'Price is too high'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z
    .string()
    .email('Invalid email address')
    .max(255, 'Email is too long'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

// Helper function to safely parse and validate
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Validation failed' };
  }
}
