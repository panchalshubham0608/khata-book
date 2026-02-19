// Helper method to check if an email is valid
export function isValidEmail(email: string): boolean {
    if (!email) return false;

    // Basic RFC 5322 compliant pattern (practical version)
    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    return emailRegex.test(email.trim());
}
