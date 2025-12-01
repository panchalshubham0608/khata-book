// ReportDetailsPage.tsx
import { useState, useEffect, useCallback } from "react";
import { FiShare2, FiPlus, FiFileText } from "react-icons/fi";
import { FiArrowLeft } from "react-icons/fi";
import { Link } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import AmountModalInput from "./AmountModalInput";
import ReportHamburgerMenu from "./ReportHamburgerMenu";
import "./ReportDetailsPage.css";
import { useParams } from "react-router-dom";
import { auth } from "../firebase/firebase";
import type { Report } from "../firebase/types";
import { createExpense, getReport } from "../firebase/reportService";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { shared } from "../utils/reportUtils";

const ReportDetailsPage = () => {
    const { reportId } = useParams();
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const { alert, showAlert } = useAlert();

    const [openExpenseModal, setOpenExpenseModal] = useState(false);
    const [showDeleteExpenseDialog, setShowDeleteExpenseDialog] = useState<boolean>(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

    useEffect(() => {
        if (!reportId) return;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user?.email) {
                setReport(null);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const fetched = await getReport(reportId);

                if (!fetched) {
                    showAlert("रिपोर्ट नहीं मिली", "error");
                    setReport(null);
                    return;
                }

                if (
                    fetched.owner !== user.email &&
                    !fetched.sharedWith?.includes(user.email)
                ) {
                    showAlert("आपको इस रिपोर्ट को देखने की अनुमति नहीं है", "error");
                    setReport(null);
                    return;
                }

                setReport(fetched);
            } catch (error) {
                console.error(error);
                showAlert("रिपोर्ट लाने में समस्या हुई", "error");
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [reportId]);

    const createExpenseHelper = useCallback(async (title: string, amount: number, label: string) => {
        if (!reportId) {
            showAlert("रिपोर्ट आईडी उपलब्ध नहीं है", "error");
            return;
        }

        try {
            setLoading(true);
            await createExpense({
                reportId,
                expenseTitle: title,
                expenseAmount: amount,
            });

            // Refetch updated report
            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            setOpenExpenseModal(false);
            showAlert(`${label} सफलतापूर्वक जोड़ दिया गया`, "success");
        } catch (err) {
            console.error(err);
            showAlert(`${label} जोड़ने में समस्या हुई`, "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, showAlert]);

    const handleAddExpense = useCallback(async (title: string, amount: number) => await createExpenseHelper(title, -1 * Math.abs(amount), "खर्चा"), [createExpenseHelper]);
    const handleTopup = useCallback(async (amount: number) => await createExpenseHelper("टॉप उप", Math.abs(amount), "टॉप उप"), [createExpenseHelper]);;

    const handleExpenseDoubleClick = (expenseId: string) => {
        console.log(expenseId);
        setSelectedExpenseId(expenseId);
        setShowDeleteExpenseDialog(true);
    };

    const deleteExpense = () => {
        // if (!selectedExpenseId) return;
        // setShowDeleteExpenseDialog(false);
        // setSelectedExpenseId(null);
        // let expenseIdx = report.expenses.findIndex(report => report.id === selectedExpenseId);
        // if (expenseIdx !== -1) {
        //     setReport({
        //         ...report,
        //         expenses: report.expenses.splice(expenseIdx, 1)
        //     });
        // }
    };

    if (!report) return <Loader visible={true} />;

    const topupAmount = report.expenses.filter(e => !e.deleted && e.amount > 0).reduce((total, e) => total + e.amount, 0);
    const spentAmount = Math.abs(report.expenses.filter(e => !e.deleted && e.amount < 0).reduce((total, e) => total + e.amount, 0));
    const remainingBudget = report.budget + topupAmount - spentAmount;

    return (
        <div className="report-details-container">
            <Alert alert={alert} />
            <Loader visible={loading} />
            <Link to="/reports" className="back-button">
                <FiArrowLeft size={20} />
                <span>वापस जाएँ</span>
            </Link>
            <ReportHamburgerMenu
                onDeleteReport={() => {
                    console.log("Report deleted!");
                }}
                onTopup={handleTopup}
            />

            <div className="report-header">
                <h2 className="report-title">{report.title}</h2>
                {shared(report) && (
                    <span className="shared-badge">
                        <FiShare2 size={16} /> साझा
                    </span>
                )}
            </div>

            <div className="report-summary">
                <div className="chips-container">
                    <span className="chip">बजट: ₹{report.budget.toLocaleString()}</span>
                    <span className="chip spent">खर्च: ₹{spentAmount.toLocaleString()}</span>
                    <span className="chip remaining">शेष: ₹{remainingBudget.toLocaleString()}</span>
                    <span className="chip date">निर्मित: {new Date(report.createdAt).toLocaleDateString("hi-IN")}</span>
                    <span className="chip topup">टॉप उप: {topupAmount}</span>
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
                        <p className={`expense-amount ${expense.amount < 0 ? 'debit' : 'credit'}`}>₹ {Math.abs(expense.amount).toLocaleString()}</p>
                    </div>
                ))}
                {report.expenses.length === 0 &&
                    <div className="no-reports-container">
                        <FiFileText size={48} className="no-reports-icon" />
                        <p className="no-reports-text">अभी कोई खर्चा नहीं जोड़ा गया</p>
                        <p className="no-reports-subtext">नया खर्चा जोड़ने के लिए नीचे का बटन दबाएँ</p>
                    </div>}

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
