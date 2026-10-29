export {};

declare global {
  interface Window {
    Android?: {
      signInWithGoogle(): void;
      hasSmsPermission(): boolean;
      requestSmsPermission(): void;
      getSmsMessages(sinceTimestampMillis: number): string;
      markSmsProcessed?(smsId: string): void;
      markSmsProcessedBatch?(smsIdsJson: string): void;
    };
  }
}


