export interface Expense {
  id: number;
  amount: number;
  category: string;
  description: string;
  timestamp: number;
  user: string;
}

export type Category = "Food" | "Travel" | "Shopping" | "Bills" | "Others";

export const CATEGORIES: Category[] = ["Food", "Travel", "Shopping", "Bills", "Others"];

export interface SummaryStats {
  total: number;
  categoryBreakdown: { name: string; value: number }[];
  monthlySummary: { month: string; amount: number }[];
}
