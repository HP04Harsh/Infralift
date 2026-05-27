import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text)
    .then(() => true)
    .catch(() => false);
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
