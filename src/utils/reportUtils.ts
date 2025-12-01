import type { Report } from "../firebase/types";

export const topupAmount = (report: Report) => report.expenses.filter(e => !e.deleted && e.amount > 0).reduce((total, e) => total + e.amount, 0);
export const spentAmount = (report: Report) => Math.abs(report.expenses.filter(e => !e.deleted && e.amount < 0).reduce((total, e) => total + e.amount, 0));
export const isShared = (report : Report, currentUserEmail: string | null | undefined) => currentUserEmail && report.sharedWith.includes(currentUserEmail);
export const isOwner = (report: Report, currentUserEmail: string | null | undefined) => currentUserEmail && report.owner === currentUserEmail;
