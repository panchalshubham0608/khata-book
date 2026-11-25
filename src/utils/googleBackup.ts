import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase/firebase";
import type { Report } from "../firebase/types";
import {
  buildBackupSheetProperties,
  buildRichSheetBatches,
  type BackupSheetProperties,
  type SheetsBatchUpdateRequest,
} from "./googleSheetFormatter";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

interface AddSheetBatchResponse {
  replies?: Array<{
    addSheet?: {
      properties?: {
        sheetId?: number;
      };
    };
  }>;
}

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

function escapeDriveQueryLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
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
  const escapedName = escapeDriveQueryLiteral(folderName);
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`
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
  const escapedTitle = escapeDriveQueryLiteral(sanitizeFileName(reportTitle));
  const escapedFolderId = escapeDriveQueryLiteral(folderId);
  const query = encodeURIComponent(
    `mimeType='application/vnd.google-apps.spreadsheet' and name='${escapedTitle}' and '${escapedFolderId}' in parents and trashed=false`
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

async function addSheet(
  accessToken: string,
  spreadsheetId: string,
  properties: BackupSheetProperties
): Promise<number> {
  const response = await googleApi<AddSheetBatchResponse>(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties } }],
      }),
    }
  );

  const sheetId = response.replies?.[0]?.addSheet?.properties?.sheetId;
  if (typeof sheetId !== "number") {
    throw new Error("Unable to determine created Google Sheet ID.");
  }

  return sheetId;
}

async function applyRichSheetBatches(
  accessToken: string,
  spreadsheetId: string,
  batches: SheetsBatchUpdateRequest[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}:batchUpdate`;

  for (const requests of batches) {
    if (requests.length === 0) continue;
    await googleApi<unknown>(accessToken, url, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
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

  const backupTimestampIso = new Date().toISOString();
  const sheetTitle = `Backup ${formatSheetName(backupTimestampIso)}`;
  const sheetProperties = buildBackupSheetProperties(sheetTitle, report.expenses.length);
  const sheetId = await addSheet(accessToken, spreadsheetId, sheetProperties);

  const batches = buildRichSheetBatches(sheetId, report, backupTimestampIso);
  await applyRichSheetBatches(accessToken, spreadsheetId, batches);

  return spreadsheetId;
}


