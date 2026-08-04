// Central display-name mapping. Routes, table names, and component/action
// names stay as their original brand words (maribank/dbs/hsbc/mendaki) —
// only what's rendered on screen changes.
export const ACCOUNT_LABELS = {
  maribank: { primary: "Savings", tag: "MariBank" },
  dbs: { primary: "Bank", tag: "DBS" },
  hsbc: { primary: "Investments", tag: "HSBC" },
  mendaki: { primary: "Loan", tag: "Mendaki" },
} as const;

export type AccountKey = keyof typeof ACCOUNT_LABELS;
