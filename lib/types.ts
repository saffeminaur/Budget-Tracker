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
  // null for Income entries — categories only apply to Expenses.
  category: Category | null;
  note: string | null;
  entry_date: string;
  // Expenses only. False excludes this entry from monthly budget totals
  // and spending stats, without affecting the account balance.
  counts_toward_budget: boolean;
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

// ============================================================
// Quick Add — free-text entries parsed by the Gemini API into one of
// these nine concrete intents. The type fully encodes both the account
// and the direction, so no separate sign/account fields are needed.
// ============================================================
export type QuickAddType =
  | "maribank_add"
  | "maribank_subtract"
  | "dbs_income"
  | "dbs_expense"
  | "receivables_i_paid"
  | "receivables_they_paid_back"
  | "hsbc_contribution"
  | "hsbc_valuation"
  | "mendaki_repayment";

export const QUICK_ADD_TYPES: QuickAddType[] = [
  "maribank_add",
  "maribank_subtract",
  "dbs_income",
  "dbs_expense",
  "receivables_i_paid",
  "receivables_they_paid_back",
  "hsbc_contribution",
  "hsbc_valuation",
  "mendaki_repayment",
];

export interface QuickAddTypeMeta {
  label: string;
  needsCategory: boolean;
  needsPerson: boolean;
}

export const QUICK_ADD_TYPE_META: Record<QuickAddType, QuickAddTypeMeta> = {
  maribank_add: { label: "MariBank · Add", needsCategory: false, needsPerson: false },
  maribank_subtract: {
    label: "MariBank · Subtract",
    needsCategory: false,
    needsPerson: false,
  },
  dbs_income: { label: "DBS · Income", needsCategory: false, needsPerson: false },
  dbs_expense: { label: "DBS · Expense", needsCategory: true, needsPerson: false },
  receivables_i_paid: {
    label: "Receivables · I paid for them",
    needsCategory: false,
    needsPerson: true,
  },
  receivables_they_paid_back: {
    label: "Receivables · They paid me back",
    needsCategory: false,
    needsPerson: true,
  },
  hsbc_contribution: {
    label: "HSBC · Contribution",
    needsCategory: false,
    needsPerson: false,
  },
  hsbc_valuation: {
    label: "HSBC · Portfolio value",
    needsCategory: false,
    needsPerson: false,
  },
  mendaki_repayment: {
    label: "Mendaki · Repayment",
    needsCategory: false,
    needsPerson: false,
  },
};

// A single parsed/editable entry in the Quick Add review screen.
export interface QuickAddDraft {
  id: string;
  type: QuickAddType;
  amount: number;
  category?: Category;
  person?: string;
  note: string;
  entry_date: string;
  // dbs_expense only — defaults to true. See DbsEntry.counts_toward_budget.
  countsTowardBudget?: boolean;
}
