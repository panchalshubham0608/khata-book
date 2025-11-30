export interface Expense {
    id: string;            // Unique ID of the expense
    title: string;         // Title/description of the expense
    amount: number;        // +ve = top-up, -ve = spend
    date: string;          // ISO timestamp
    deleted: boolean;      // Soft delete flag
}

export interface Report {
    id: string;            // Unique ID of the report
    title: string;         // Title of the report
    budget: number;        // Initial budget
    owner: string;         // Owner name (translated Hindi name)
    createdAt: string;     // ISO timestamp
    sharedWith: string[];  // List of emails with access
    expenses: Expense[];   // All expenses inside this report
}
