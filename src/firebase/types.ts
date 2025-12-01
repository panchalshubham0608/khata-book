export interface Expense {
    id: string;                 // Unique ID of the expense
    title: string;              // Title/description of the expense
    amount: number;             // +ve = top-up, -ve = spend
    date: string;               // ISO timestamp
    authorEmail: string;        // Email of the author who created this expense
    authorDisplayName: string;  // Display name of the author who created this expense
    createdAt: string;          // Timestamp when this expense was created
    deleted?: boolean;          // Soft delete flag
    deletedAt?: string;         // Timestamp when this expense was soft-deleted
}

export interface Report {
    id: string;             // Unique ID of the report
    title: string;          // Title of the report
    budget: number;         // Initial budget
    owner: string;          // Owner name (translated Hindi name)
    createdAt: string;      // ISO timestamp
    sharedWith: string[];   // List of emails with access
    expenses: Expense[];    // All expenses inside this report
    deleted?: boolean;      // Soft delete flag
    deletedAt?: string;     // Timestamp when this expense was soft-deleted
}
