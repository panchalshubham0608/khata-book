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
  arrayUnion
} from "firebase/firestore";
import { db, auth } from "./firebase";
import type { Expense, Report } from "./types";

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

export async function createExpense(reportId: string, expense: Expense) {
  const expensesRef = collection(db, "reports", reportId, "expenses");
  const expenseRef = await addDoc(expensesRef, {
    ...expense,
    createdAt: Date.now(),
  });

  return expenseRef.id;
}

export async function deleteExpense(reportId: string, expenseId: string) {
  const expenseRef = doc(db, "reports", reportId, "expenses", expenseId);
  await updateDoc(expenseRef, { deleted: true });
}

export async function getReports(email: string): Promise<Report[]> {
  const reportsRef = collection(db, "reports");

  const sharedQ = query(
    reportsRef,
    where("sharedWith", "array-contains", email)
  );

  const ownerQ = query(
    reportsRef,
    where("owner", "==", email)
  );

  const [sharedSnap, ownerSnap] = await Promise.all([
    getDocs(sharedQ),
    getDocs(ownerQ),
  ]);

  const shared = sharedSnap.docs.map((d) => ({
    ...(d.data() as Report),
    id: d.id,
  }));

  const owned = ownerSnap.docs.map((d) => ({
    ...(d.data() as Report),
    id: d.id,
  }));

  // merge & dedupe (in case a user appears in both)
  const all = [...owned, ...shared];

  const unique = Object.values(
    all.reduce((acc, report) => {
      acc[report.id] = report;
      return acc;
    }, {} as Record<string, Report>)
  );

  return unique;
}

export async function getReport(reportId: string): Promise<Report | null> {
  const reportRef = doc(db, "reports", reportId);
  const reportSnap = await getDoc(reportRef);

  if (!reportSnap.exists()) return null;

  // Cast Firestore data to Report (without expenses)
  const baseReport = reportSnap.data() as Omit<Report, "id" | "expenses">;

  // Fetch subcollection expenses
  const expensesRef = collection(db, "reports", reportId, "expenses");
  const expensesSnap = await getDocs(expensesRef);

  const expenses: Expense[] = expensesSnap.docs.map((d) => ({
    ...(d.data() as Expense),
    id: d.id,
  }));

  // Return full report
  return {
    id: reportId,
    ...baseReport,
    expenses,
  };
}
