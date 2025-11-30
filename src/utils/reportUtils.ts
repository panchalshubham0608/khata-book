import type { Report } from "../firebase/types";

export const topupAmount = (report: Report) => report.expenses.filter(e => !e.deleted && e.amount > 0).reduce((total, e) => total + e.amount, 0);
export const spentAmount = (report: Report) => Math.abs(report.expenses.filter(e => !e.deleted && e.amount < 0).reduce((total, e) => total + e.amount, 0));
export const shared = (report : Report) => false;