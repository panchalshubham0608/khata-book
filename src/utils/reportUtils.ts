import type { Report } from "../firebase/types";

export const topupAmount = (report: Report) => report.expenses.filter(e => !e.deleted && e.amount > 0).reduce((total, e) => total + e.amount, 0);
export const spentAmount = (report: Report) => Math.abs(report.expenses.filter(e => !e.deleted && e.amount < 0).reduce((total, e) => total + e.amount, 0));
export const isShared = (report: Report, currentUserEmail: string | null | undefined) => currentUserEmail && report.sharedWith.includes(currentUserEmail);
export const isOwner = (report: Report, currentUserEmail: string | null | undefined) => currentUserEmail && report.owner === currentUserEmail;

export const getRemainingDays = (deletedAt: string | number): number => {
    const deletedDate = new Date(deletedAt).getTime();
    const now = Date.now();
    const expiryMs = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    const remainingMs = expiryMs - (now - deletedDate);
    return remainingMs > 0 ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : 0;
}