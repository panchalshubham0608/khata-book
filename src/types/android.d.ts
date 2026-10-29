export {};

declare global {
  interface Window {
    Android?: {
      signInWithGoogle(): void;
    };
  }
}
