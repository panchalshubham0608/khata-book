// ReportDetailsPage.tsx
import { useState } from "react";
import { FiShare2, FiPlus, FiMic } from "react-icons/fi";
import "./ReportDetailsPage.css";

interface Expense {
    id: string;
    title: string;
    amount: number;
    date: string; // ISO string
}

interface Report {
    id: string;
    title: string;
    budget: number;
    spent: number;
    shared: boolean;
    createdAt: string; // ISO string
    owner: string;     // e.g., "शुभम"
    expenses: Expense[];
}


const sampleReport: Report = {
    id: "1",
    title: "मासिक खर्च",
    budget: 15000,
    spent: 8200,
    shared: true,
    createdAt: "2025-11-28T10:00:00.000Z",
    owner: "शुभम",
    expenses: [
        { id: "e1", title: "सब्ज़ियाँ", amount: 1500, date: "2025-11-01" },
        { id: "e2", title: "दवा", amount: 1200, date: "2025-11-03" },
        { id: "e3", title: "पेट्रोल", amount: 3000, date: "2025-11-10" },
    ],
};


const ReportDetailsPage = () => {
    const report = sampleReport;
    const remainingBudget = report.budget - report.spent;

    const [openExpenseModal, setOpenExpenseModal] = useState(false);
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");

    const handleAddExpense = () => {
        if (!expenseTitle || !expenseAmount) return;

        const newExp = {
            id: Date.now(),
            title: expenseTitle,
            amount: Number(expenseAmount),
        };

        // TODO: Add to your backend or local state
        console.log("New Expense →", newExp);

        setExpenseTitle("");
        setExpenseAmount("");
        setOpenExpenseModal(false);
    };

    return (
        <div className="report-details-container">
            <div className="report-header">
                <h2 className="report-title">{report.title}</h2>
                {report.shared && (
                    <span className="shared-badge">
                        <FiShare2 size={16} /> साझा
                    </span>
                )}
            </div>

            <div className="report-summary">
                <div className="chips-container">
                    <span className="chip">बजट: ₹{report.budget.toLocaleString()}</span>
                    <span className="chip spent">खर्च: ₹{report.spent.toLocaleString()}</span>
                    <span className="chip remaining">शेष: ₹{remainingBudget.toLocaleString()}</span>
                    <span className="chip date">निर्मित: {new Date(report.createdAt).toLocaleDateString("hi-IN")}</span>
                    <span className="chip owner">मालिक: {report.owner}</span>
                </div>
            </div>

            <h3 className="expenses-title">खर्चों की सूची</h3>
            <div className="expenses-list">
                {report.expenses.map((expense) => (
                    <div className="expense-item" key={expense.id}>
                        <div className="expense-info">
                            <p className="expense-title">{expense.title}</p>
                            <p className="expense-date">{new Date(expense.date).toLocaleDateString("hi-IN")}</p>
                        </div>
                        <p className="expense-amount">₹ {expense.amount.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <button
                className="add-expense-btn"
                onClick={() => setOpenExpenseModal(true)}
            >
                <FiPlus size={22} />
            </button>

            {openExpenseModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 className="text-lg font-semibold mb-4">नया ख़र्च जोड़ें</h2>
                        <div className="flex flex-col gap-3">
                            <div className="input-with-voice input-group">
                                <input
                                    type="text"
                                    placeholder="ख़र्च का नाम"
                                    value={expenseTitle}
                                    onChange={(e) => setExpenseTitle(e.target.value)}
                                    className="input-field"
                                />
                                <button className="voice-btn">
                                    <FiMic size={24} />
                                </button>
                            </div>


                            <div className="input-group">
                                <input
                                    type="number"
                                    placeholder="खर्च की राशि"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setOpenExpenseModal(false)}>रद्द करें</button>
                            <button className="btn-add" onClick={handleAddExpense}>जोड़ें</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportDetailsPage;
