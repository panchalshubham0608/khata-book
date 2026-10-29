export interface RawSmsMessage {
  id: string;
  sender: string;
  body: string;
  timestamp: number;
}

export type TransactionType = "credit" | "debit";

export interface AnalyzedSmsTransaction {
  amount: number;
  type: TransactionType;
  title?: string;
}

/**
 * Blackbox SMS analyzer service.
 * Accepts a single SMS message and returns an optional response containing
 * the transaction amount and whether it is a credit or debit.
 * Returns null if the SMS does not represent a transaction.
 *
 * NOTE: This is a placeholder blackbox service — replace the implementation
 * below when building the full SMS analyzer.
 */
export async function analyzeSmsMessage(
  sms: RawSmsMessage
): Promise<AnalyzedSmsTransaction | null> {
  if (!sms.body) {
    return null;
  }

  // TODO: Replace this blackbox placeholder with the full SMS transaction analyzer.
  const body = sms.body;
  const lower = body.toLowerCase();

  const isDebit = /\b(debited|spent|paid|withdrawn|sent)\b/i.test(lower);
  const isCredit = /\b(credited|received|deposited|refunded)\b/i.test(lower);

  if (!isDebit && !isCredit) {
    return null;
  }

  const amountMatch = body.match(
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i
  );
  if (!amountMatch) {
    return null;
  }

  const parsedAmount = Number(amountMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  const type: TransactionType = isDebit ? "debit" : "credit";

  return {
    amount: parsedAmount,
    type,
    title: sms.sender ? `SMS (${sms.sender})` : undefined,
  };
}
