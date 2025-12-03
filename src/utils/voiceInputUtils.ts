export function parseHindiExpense(input: string): { title: string, amount: number } | null {
    let text = input
        .toLowerCase()
        .replace(/,/g, "")
        .trim();

    // Normalize currency references
    text = text
        .replace(/रुप(ये|ए|इया|या)/g, "rs")
        .replace(/रु/g, "rs")
        .replace(/₹/g, "rs")
        .replace(/rs /g, "rs");

    // Extract amount anywhere in the string
    const amountMatch = text.match(/(\d+(\.\d+)?)/);
    const amount = amountMatch ? Number(amountMatch[1]) : null;

    // Remove the amount + currency from the text
    let title = text
        .replace(/(\d+(\.\d+)?)/, "")       // numbers
        .replace(/rs/g, "")                 // currency
        .replace(/के|का|की|लिए|लीए| हेतु/g, "")  // Hindi filler words
        .replace(/bill|expense|kharcha/g, "") // optional english fillers
        .replace(/\s+/g, " ")
        .trim();

    // Fix title capitalization (optional)
    if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Check if parsing was successful
    if (!title || !amount) return null;

    return {
        title: title || "",
        amount: amount,
    };
}
