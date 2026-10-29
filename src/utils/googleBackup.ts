import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase/firebase";
import type { Report } from "../firebase/types";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

async function ensureGoogleAccessToken(): Promise<string> {
  const provider = new GoogleAuthProvider();
  provider.addScope(DRIVE_SCOPE);
  provider.addScope(SHEETS_SCOPE);

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error("Google Drive access was not granted.");
  }

  return accessToken;
}

async function googleApi<T>(accessToken: string, url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? (payload as { error?: { message?: string } }).error?.message || "Google API request failed."
      : "Google API request failed.";
    throw new Error(message);
  }

  return payload as T;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*]/g, "-").trim() || "backup";
}

function formatLocalDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatSheetName(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

async function findFolder(accessToken: string, folderName: string): Promise<string | null> {
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${folderName.replace(/'/g, "\\'")}' and trashed=false`
  );

  const response = await googleApi<{ files?: Array<{ id: string; name: string }> }>(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`
  );

  return response.files?.[0]?.id ?? null;
}

async function createFolder(accessToken: string, folderName: string): Promise<string> {
  const createdFolder = await googleApi<{ id: string }>(
    accessToken,
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      }),
    }
  );

  return createdFolder.id;
}

async function findSpreadsheet(accessToken: string, folderId: string, reportTitle: string): Promise<string | null> {
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.spreadsheet' and name='${sanitizeFileName(reportTitle)}' and '${folderId}' in parents and trashed=false`
  );

  const response = await googleApi<{ files?: Array<{ id: string; name: string }> }>(
    accessToken,
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`
  );

  return response.files?.[0]?.id ?? null;
}

async function createSpreadsheet(accessToken: string, fileName: string, folderId: string): Promise<string> {
  const createdFile = await googleApi<{ id: string }>(
    accessToken,
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      body: JSON.stringify({
        name: fileName,
        mimeType: "application/vnd.google-apps.spreadsheet",
        parents: [folderId],
      }),
    }
  );

  return createdFile.id;
}

async function addSheet(accessToken: string, spreadsheetId: string, sheetTitle: string): Promise<void> {
  await googleApi<unknown>(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: {
              title: sheetTitle,
            },
          },
        }],
      }),
    }
  );
}

async function writeSpreadsheetRows(accessToken: string, spreadsheetId: string, sheetTitle: string, rows: string[][]): Promise<void> {
  const encodedSheetTitle = encodeURIComponent(sheetTitle);
  await googleApi<unknown>(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetTitle}!A1:Z1000?valueInputOption=RAW`,
    {
      method: "PUT",
      body: JSON.stringify({ values: rows }),
    }
  );
}

export async function backupReportToGoogleSheets(report: Report): Promise<string> {
  const accessToken = await ensureGoogleAccessToken();
  const folderName = "KhataBook";

  let folderId = await findFolder(accessToken, folderName);
  if (!folderId) {
    folderId = await createFolder(accessToken, folderName);
  }

  const reportSpreadsheetName = sanitizeFileName(report.title);
  let spreadsheetId = await findSpreadsheet(accessToken, folderId, report.title);
  if (!spreadsheetId) {
    spreadsheetId = await createSpreadsheet(accessToken, reportSpreadsheetName, folderId);
  }

  const sheetTitle = `Backup ${formatSheetName(new Date().toISOString())}`;
  await addSheet(accessToken, spreadsheetId, sheetTitle);

  const rows: string[][] = [
    ["Report Title", report.title],
    ["Budget", report.budget.toString()],
    ["Owner", report.owner],
    ["Created At", formatLocalDateTime(report.createdAt)],
    [],
    ["Title", "Amount", "Date", "Author"],
    ...report.expenses.map((expense) => [
      expense.title,
      expense.amount.toString(),
      formatLocalDateTime(expense.date),
      `${expense.authorDisplayName} <${expense.authorEmail}>`,
    ]),
  ];

  await writeSpreadsheetRows(accessToken, spreadsheetId, sheetTitle, rows);
  return spreadsheetId;
}

