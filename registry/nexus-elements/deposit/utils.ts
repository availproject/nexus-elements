import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as USD currency string (e.g., 1234.56 -> "1,234.56")
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse currency input by removing $ and commas, keeping only numbers and decimal
 */
export function parseCurrencyInput(input: string): string {
  return input.replace(/[^0-9.]/g, "");
}