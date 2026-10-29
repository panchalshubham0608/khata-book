import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  arrayRemove,
  arrayUnion,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Expense, Report } from "./types";
import {
  archiveReportForUser,
  getUserProfile,
  unarchiveReportForUser,
} from "./userProfileService";

interface CreateReportOptions {
  title: string;
  budget: number;
}

export async function createReport(options: CreateReportOptions): Promise<Report> {
  const user = auth.currentUser;
  if (!user?.email) {
    throw new Error("यूज़र का ईमेल उपलब्ध नहीं है। कृपया लॉगिन करें।");
  }
  const reportData: Omit<Report, "id"> = {
    title: options.title,
    budget: options.budget,
    owner: user.email,
    sharedWith: [],
    expenses: [],
    createdAt: new Date().toISOString(),
    deleted: false,
  };

  const reportRef = await addDoc(collection(db, "reports"), reportData);

  return {
    id: reportRef.id,
    ...reportData,
  };
}

export async function deleteReport(reportId: string) {
  const reportRef = doc(db, "reports", reportId);
  await updateDoc(reportRef, {
    deleted: true,
    deletedAt: new Date().toISOString(),
  });
}

export async function shareReport(reportId: string, email: string) {
  const ref = doc(db, "reports", reportId);
  await updateDoc(ref, {
    sharedWith: arrayUnion(email),
  });
}

export async function unshareReport(reportId: string, email: string) {
  const ref = doc(db, "reports", reportId);
  await updateDoc(ref, {
    sharedWith: arrayRemove(email),
  });
}

export async function archiveReport(reportId: string, email?: string) {
  await archiveReportForUser(reportId, email);
}

export async function unarchiveReport(reportId: string, email?: string) {
  await unarchiveReportForUser(reportId, email);
}

export interface CreateExpenseOptions {
  reportId: string;
  expenseTitle: string;
  expenseAmount: number; // positive = topup, negative = debit
  authorEmail: string;
  authorDisplayName: string;
  categories?: string[];
}

export async function createExpense(options: CreateExpenseOptions) {
  const { reportId, expenseTitle, expenseAmount, authorEmail, authorDisplayName, categories } = options;

  const expensesRef = collection(db, "reports", reportId, "expenses");

  const expenseData: Omit<Expense, "id"> = {
    title: expenseTitle,
    amount: expenseAmount,
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    authorEmail,
    authorDisplayName,
    categories: categories || [],
  };

  const expenseRef = await addDoc(expensesRef, {
    ...expenseData,
    createdAt: Date.now(),
  });

  return expenseRef.id;
}

export async function createExpensesBatch(items: CreateExpenseOptions[]): Promise<string[]> {
  if (items.length === 0) return [];

  const batch = writeBatch(db);
  const createdIds: string[] = [];

  for (const options of items) {
    const { reportId, expenseTitle, expenseAmount, authorEmail, authorDisplayName, categories } = options;
    const expensesRef = collection(db, "reports", reportId, "expenses");
    const newExpenseDocRef = doc(expensesRef);

    const expenseData: Omit<Expense, "id"> = {
      title: expenseTitle,
      amount: expenseAmount,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      authorEmail,
      authorDisplayName,
      categories: categories || [],
    };

    batch.set(newExpenseDocRef, {
      ...expenseData,
      createdAt: Date.now(),
    });
    createdIds.push(newExpenseDocRef.id);
  }

  await batch.commit();
  return createdIds;
}

interface UpdateExpenseOptions {
  reportId: string;
  expenseId: string;
  title: string;
  amount: number;
}
export async function updateExense(options: UpdateExpenseOptions) {
  const { reportId, expenseId, title, amount } = options;
  const expenseRef = doc(db, "reports", reportId, "expenses", expenseId);
  await updateDoc(expenseRef, { title, amount, updatedAt: new Date().toISOString() });
}

export async function deleteExpense(reportId: string, expenseId: string) {
  const expenseRef = doc(db, "reports", reportId, "expenses", expenseId);
  await updateDoc(expenseRef, { deleted: true, deletedAt: new Date().toISOString() });
}

async function attachExpenses(report: Report): Promise<Report> {
  const expensesRef = collection(db, "reports", report.id, "expenses");
  const expensesSnap = await getDocs(expensesRef);

  const expenses: Expense[] = expensesSnap.docs
    .map((d) => ({
      ...(d.data() as Expense),
      id: d.id,
    }))
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  return {
    ...report,
    expenses,
  };
}

interface GetReportsOptions {
  showDeleted?: boolean;
  showArchived?: boolean;
  archivedReports?: string[];
}

export async function getReports(email: string, options: GetReportsOptions): Promise<Report[]> {
  const reportsRef = collection(db, "reports");

  const ownerQ = query(reportsRef, where("owner", "==", email));
  const sharedQ = query(reportsRef, where("sharedWith", "array-contains", email));

  const [ownerSnap, sharedSnap, resolvedArchivedIds] = await Promise.all([
    getDocs(ownerQ),
    getDocs(sharedQ),
    options.archivedReports
      ? Promise.resolve(options.archivedReports)
      : getUserProfile(email)
          .then((profile) => profile.archivedReports)
          .catch(() => [] as string[]),
  ]);

  const archivedReportIds = new Set(resolvedArchivedIds);
  const isReportArchived = (r: Report) => archivedReportIds.has(r.id);

  const reports = [...ownerSnap.docs, ...sharedSnap.docs]
    .map((d) => ({
      ...(d.data() as Report),
      id: d.id,
    }))
    .sort((r1, r2) => Date.parse(r2.createdAt) - Date.parse(r1.createdAt));

  let baseReports = reports.filter((r) => !r.deleted && !isReportArchived(r));

  if (options.showArchived) {
    const archivedReports = reports.filter(
      (r) => !r.deleted && isReportArchived(r)
    );
    baseReports = [...baseReports, ...archivedReports];
  }

  if (options.showDeleted) {
    const deletedReports = reports.filter(
      (r) =>
        r.deleted && (!isReportArchived(r) || Boolean(options.showArchived))
    );
    baseReports = [...baseReports, ...deletedReports];
  }

  // Dedupe
  const uniqueReports = Object.values(
    baseReports.reduce((acc, r) => {
      acc[r.id] = r;
      return acc;
    }, {} as Record<string, Report>)
  );

  // Attach expenses using shared helper
  return await Promise.all(uniqueReports.map((r) => attachExpenses(r)));
}

export async function getReport(reportId: string): Promise<Report | null> {
  const reportSnap = await getDoc(doc(db, "reports", reportId));
  if (!reportSnap.exists()) return null;

  const baseReport: Report = {
    id: reportId,
    ...(reportSnap.data() as Omit<Report, "id" | "expenses">),
    expenses: [],
  };

  return await attachExpenses(baseReport);
}
