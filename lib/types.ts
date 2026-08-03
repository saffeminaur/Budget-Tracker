export type Category = "Food" | "Transport" | "Shopping" | "Bills" | "Other";

export const CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Other",
];

export interface MaribankEntry {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
  entry_date: string;
  created_at: string;
}

export interface DbsEntry {
  id: string;
  user_id: string;
  amount: number;
  category: Category;
  note: string | null;
  entry_date: string;
  created_at: string;
}

export interface ReceivableEntry {
  id: string;
  user_id: string;
  person: string;
  amount: number;
  note: string | null;
  entry_date: string;
  created_at: string;
}

export interface HsbcContribution {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
  entry_date: string;
  created_at: string;
}

export interface HsbcValuation {
  id: string;
  user_id: string;
  value: number;
  entry_date: string;
  created_at: string;
}

export interface MendakiLoan {
  id: string;
  user_id: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface MendakiRepayment {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
  entry_date: string;
  created_at: string;
}
