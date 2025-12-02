export function parseHindiExpense(input: string): { title: string, amount: number } | null {
    // Normalize input
    const text = input.trim().replace(/\s+/g, " ");

    const regex =
        /(.+?)\s*(?:के|का|की)\s*(?:₹\s*)?(\d+)\s*(?:रुपए|रुपये|रुपया|rs|रु)?/i;

    const match = text.match(regex);

    if (!match) return null;

    const title = match[1].trim();
    const amount = Number(match[2]);

    return { title, amount };
}
