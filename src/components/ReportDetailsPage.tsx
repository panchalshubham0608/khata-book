// ReportDetailsPage.tsx
import { useState } from "react";
import { FiShare2, FiPlus, FiTrash } from "react-icons/fi";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import AmountModalInput from "./AmountModalInput";
import ReportHamburgerMenu from "./ReportHamburgerMenu";
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
    const [report, setReport] = useState<Report>(sampleReport);
    const remainingBudget = report.budget - report.spent;

    const [openExpenseModal, setOpenExpenseModal] = useState(false);
    const [showDeleteExpenseDialog, setShowDeleteExpenseDialog] = useState<boolean>(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [showAccessPopup, setShowAccessPopup] = useState(false);
const [sharedWith, setSharedWith] = useState(["test@gmail.com"]);

    const handleAddExpense = (title: string, amount: string) => {
        const newExp = {
            id: Date.now().toString(), title, amount: parseInt(amount), date: Date.now().toString(), deleted: false
        };

        // TODO: Add to your backend or local state
        console.log("New Expense →", newExp);
        setOpenExpenseModal(false);
        setReport({
            ...report,
            expenses: [
                newExp,
                ...report.expenses,
            ]
        });
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
        let expenseIdx = report.expenses.findIndex(report => report.id === selectedExpenseId);
        if (expenseIdx !== -1) {
            setReport({
                ...report,
                expenses: report.expenses.splice(expenseIdx, 1)
            });
        }
    };

    const addEmail = (email: string) => {
    setSharedWith([...sharedWith, email]);
};

const removeEmail = (email: string) => {
    setSharedWith(sharedWith.filter(e => e !== email));
};

    return (
        <div className="report-details-container">
            <Link to="/reports" className="back-button">
                <FiArrowLeft size={20} />
                <span>वापस जाएँ</span>
            </Link>
            <ReportHamburgerMenu
                onDeleteReport={() => {
                    console.log("Report deleted!");
                }}
            />

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
                className="add-expense-btn"
                onClick={() => setOpenExpenseModal(true)}
            >
                <FiPlus size={22} />
            </button>

            {openExpenseModal &&
                <AmountModalInput
                    header="नया ख़र्च जोड़ें"
                    titlePlaceholder="ख़र्च का नाम"
                    amountPlaceholder="खर्च की राशि"
                    onReject={() => setOpenExpenseModal(false)}
                    onAccept={handleAddExpense}
                />
            }

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
