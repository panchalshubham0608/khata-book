import {
  analyzeSmsMessage,
  type AnalyzedSmsTransaction,
  type RawSmsMessage,
} from "./smsAnalyzerService";

export interface PendingSmsTransaction {
  sms: RawSmsMessage;
  transaction: AnalyzedSmsTransaction;
}

const SMS_ENABLED_KEY_PREFIX = "smsTrackingEnabled_";
const PROCESSED_SMS_IDS_KEY_PREFIX = "processedSmsIds_";
const SMS_ENABLED_SINCE_KEY_PREFIX = "smsEnabledSince_";

function normalizeUserKey(userEmail?: string | null): string {
  return (userEmail || "default").trim().toLowerCase();
}

export function isSmsTrackingEnabled(userEmail?: string | null): boolean {
  const key = `${SMS_ENABLED_KEY_PREFIX}${normalizeUserKey(userEmail)}`;
  return localStorage.getItem(key) === "true";
}

export function setSmsTrackingEnabled(
  userEmail: string | null | undefined,
  enabled: boolean
): void {
  const userKey = normalizeUserKey(userEmail);
  const enabledKey = `${SMS_ENABLED_KEY_PREFIX}${userKey}`;
  const sinceKey = `${SMS_ENABLED_SINCE_KEY_PREFIX}${userKey}`;

  localStorage.setItem(enabledKey, enabled ? "true" : "false");

  if (enabled && !localStorage.getItem(sinceKey)) {
    localStorage.setItem(sinceKey, "0");
  }
  window.dispatchEvent(new CustomEvent("smsTrackingSettingChanged"));
}

export interface StagedApprovedSmsTransaction {
  smsId: string;
  reportId: string;
  expenseTitle: string;
  signedAmount: number;
}

export function getProcessedSmsIds(userEmail?: string | null): Set<string> {
  const key = `${PROCESSED_SMS_IDS_KEY_PREFIX}${normalizeUserKey(userEmail)}`;
  const raw = localStorage.getItem(key);
  if (!raw) return new Set<string>();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set<string>(parsed.map(String));
    }
  } catch {
    // ignore corrupted storage
  }
  return new Set<string>();
}

export function markSmsProcessed(
  userEmail: string | null | undefined,
  smsId: string
): void {
  if (!smsId) return;
  markSmsProcessedBatch(userEmail, [smsId]);
}

export function markSmsProcessedBatch(
  userEmail: string | null | undefined,
  smsIds: string[]
): void {
  const validIds = smsIds.filter(Boolean);
  if (validIds.length === 0) return;

  const key = `${PROCESSED_SMS_IDS_KEY_PREFIX}${normalizeUserKey(userEmail)}`;
  const processed = getProcessedSmsIds(userEmail);
  for (const id of validIds) {
    processed.add(id);
  }
  localStorage.setItem(key, JSON.stringify(Array.from(processed)));

  if (window.Android?.markSmsProcessedBatch) {
    window.Android.markSmsProcessedBatch(JSON.stringify(validIds));
  } else if (window.Android?.markSmsProcessed) {
    for (const id of validIds) {
      window.Android.markSmsProcessed(id);
    }
  }
}

export async function scanUnprocessedSmsTransactions(
  userEmail?: string | null
): Promise<PendingSmsTransaction[]> {
  if (!userEmail) {
    return [];
  }

  let messages: RawSmsMessage[] = [];

  if (window.Android?.hasSmsPermission?.() && isSmsTrackingEnabled(userEmail)) {
    const rawJson = window.Android.getSmsMessages(0);
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        messages = parsed;
      }
    } catch {
      messages = [];
    }
  }

  const processedIds = getProcessedSmsIds(userEmail);
  const pending: PendingSmsTransaction[] = [];
  const ignoredIds: string[] = [];

  for (const sms of messages) {
    if (!sms.id || processedIds.has(sms.id)) {
      continue;
    }

    const result = await analyzeSmsMessage(sms);
    if (result && result.amount > 0) {
      pending.push({
        sms,
        transaction: result,
      });
    } else {
      ignoredIds.push(sms.id);
    }
  }

  if (ignoredIds.length > 0) {
    markSmsProcessedBatch(userEmail, ignoredIds);
  }

  return pending;
}



