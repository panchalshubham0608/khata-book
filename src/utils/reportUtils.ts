import type { Report } from "../firebase/types";

export const calculateTopupAmount = (report: Report) => report.expenses.filter(e => !e.deleted && Number(e.amount) > 0).reduce((total, e) => total + Number(e.amount), 0);
export const calculateAmountSpent = (report: Report) => Math.abs(report.expenses.filter(e => !e.deleted && Number(e.amount) < 0).reduce((total, e) => total + Number(e.amount), 0));
export const calculateEffectiveBudget = (report: Report) => Number(report.budget) + calculateTopupAmount(report);
export const isShared = (report: Report, currentUserEmail: string | null | undefined) => currentUserEmail && report.sharedWith.includes(currentUserEmail);
export const isOwner = (report: Report, currentUserEmail: string | null | undefined) => currentUserEmail && report.owner === currentUserEmail;
export const isArchived = (
    reportId: string | undefined | null,
    archivedReports: string[] | undefined | null
): boolean => Boolean(reportId && archivedReports?.includes(reportId));

export const getRemainingDays = (deletedAt: string | number): number => {
    const deletedDate = new Date(deletedAt).getTime();
    const now = Date.now();
    const expiryMs = 60 * 24 * 60 * 60 * 1000; // 60 days in ms
    const remainingMs = expiryMs - (now - deletedDate);
    return remainingMs > 0 ? Math.ceil(remainingMs / (1000 * 60 * 60 * 24)) : 0;
};

export const toLocalDateInputValue = (value?: string | number | Date): string => {
    const d = value !== undefined ? new Date(value) : new Date();
    const validDate = Number.isNaN(d.getTime()) ? new Date() : d;
    const year = validDate.getFullYear();
    const month = String(validDate.getMonth() + 1).padStart(2, "0");
    const day = String(validDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const localDateInputToIso = (dateInput: string, referenceIso?: string): string => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.trim());
    if (!match) {
        return referenceIso || new Date().toISOString();
    }
    const [, yStr, mStr, dStr] = match;
    const ref = referenceIso ? new Date(referenceIso) : new Date();
    const base = Number.isNaN(ref.getTime()) ? new Date() : ref;
    const combined = new Date(
        Number(yStr),
        Number(mStr) - 1,
        Number(dStr),
        base.getHours(),
        base.getMinutes(),
        base.getSeconds(),
        base.getMilliseconds()
    );
    return Number.isNaN(combined.getTime()) ? new Date().toISOString() : combined.toISOString();
};