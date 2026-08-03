import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const sgdFormatter = new Intl.NumberFormat("en-SG", {
  style: "currency",
  currency: "SGD",
});

export function formatCurrency(amount: number) {
  return sgdFormatter.format(amount);
}

export function sum(amounts: number[]) {
  return amounts.reduce((total, amount) => total + amount, 0);
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-SG", { month: "long", year: "numeric" });
}

export function firstOfPreviousMonthIsoDate() {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return d.toISOString().slice(0, 10);
}

export function isSameMonth(isoDate: string, reference: Date) {
  const d = new Date(`${isoDate}T00:00:00`);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth()
  );
}
