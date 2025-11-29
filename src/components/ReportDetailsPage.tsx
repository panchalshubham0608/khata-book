// ReportDetailsPage.tsx
import { useState } from "react";
import { FiShare2, FiPlus, FiTrash } from "react-icons/fi";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import AmountModalInput from "./AmountModalInput";
import "./ReportDetailsPage.css";


interface Expense {
    id: string;
    title: string;
    amount: number;
    date: string; // ISO string
    deleted: boolean
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
        { id: "e1", title: "सब्ज़ियाँ", amount: 1500, date: "2025-11-01", deleted: false },
        { id: "e2", title: "दवा", amount: 1200, date: "2025-11-03", deleted: true },
        { id: "e3", title: "पेट्रोल", amount: 3000, date: "2025-11-10", deleted: false },
    ],
};


const ReportDetailsPage = () => {
    const report = sampleReport;
    const remainingBudget = report.budget - report.spent;

    const [openExpenseModal, setOpenExpenseModal] = useState(false);
    const [expenseTitle, setExpenseTitle] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
    const [showDeleteExpenseDialog, setShowDeleteExpenseDialog] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

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


    const handleExpenseDoubleClick = (expenseId: string) => {
        console.log(expenseId);
        setSelectedExpenseId(expenseId);
        setShowDeleteExpenseDialog(true);
    };

    const deleteExpense = () => {
        if (!selectedExpenseId) return;
        setShowDeleteExpenseDialog(false);
        setSelectedExpenseId(null);
    };

    return (
        <div className="report-details-container">
            <Link to="/reports" className="back-button">
                <FiArrowLeft size={20} />
                <span>वापस जाएँ</span>
            </Link>

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

            <div className="expenses-title">
                खर्चों की सूची
                <div className="expense-note">
                    (खर्चा हटाने के लिए दो बार खर्चे पर दबाएँ)
                </div>
            </div>

            <div className="expenses-list">
                {report.expenses.map((expense) => (
                    <div className={`expense-item ${expense.deleted && "deleted"}`} key={expense.id}
                        onDoubleClick={() => !expense.deleted && handleExpenseDoubleClick(expense.id)}
                    >
                        <div className="expense-info">
                            <p className="expense-title">{expense.title}</p>
                            <p className="expense-date">{new Date(expense.date).toLocaleDateString("hi-IN")}</p>
                        </div>
                        <p className="expense-amount">₹ {expense.amount.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <button
                className="delete-report-btn"
                onClick={() => setOpenDeleteConfirmDialog(true)}
            >
                <FiTrash size={22} />
            </button>
            <button
                className="add-expense-btn"
                onClick={() => setOpenExpenseModal(true)}
            >
                <FiPlus size={22} />
            </button>

            {openExpenseModal &&
                <AmountModalInput
                    header="नया ख़र्च जोड़ें"
                    titlePlaceholder="ख़र्च का नाम"
                    title={expenseTitle}
                    setTitle={setExpenseTitle}
                    amount={expenseAmount}
                    setAmount={setExpenseAmount}
                    amountPlaceholder="खर्च की राशि"
                    onReject={() => setOpenExpenseModal(false)}
                    onAccept={handleAddExpense}
                />
            }

            <ConfirmDialog
                open={openDeleteConfirmDialog}
                title="रिपोर्ट हटाना चाहते हैं?"
                message="यह क्रिया स्थायी है और वापस नहीं की जा सकती।"
                confirmText="हटाएँ"
                cancelText="रद्द करें"
                onConfirm={() => {
                    console.log("Report deleted");
                    setOpenDeleteConfirmDialog(false);
                }}
                onCancel={() => setOpenDeleteConfirmDialog(false)}
            />

            <ConfirmDialog
                open={showDeleteExpenseDialog}
                title="खर्च हटाना चाहते हैं?"
                message="यह खर्च स्थायी रूप से हट जाएगा।"
                confirmText="हटाएँ"
                cancelText="रद्द करें"
                onConfirm={deleteExpense}
                onCancel={() => setShowDeleteExpenseDialog(false)}
            />

        </div>
    );
};

export default ReportDetailsPage;
