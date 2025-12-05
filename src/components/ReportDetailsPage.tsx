// ReportDetailsPage.tsx
import { useState, useEffect, useCallback } from "react";
import { FiShare2, FiPlus, FiFileText } from "react-icons/fi";
import { FiArrowLeft } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import AmountModalInput from "./AmountModalInput";
import ReportHamburgerMenu from "./ReportDetailsHamburger";
import "./ReportDetailsPage.css";
import { useParams } from "react-router-dom";
import { auth } from "../firebase/firebase";
import type { Report } from "../firebase/types";
import { createExpense, deleteExpense, deleteReport, getReport, shareReport, unshareReport, updateExense } from "../firebase/reportService";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { isShared, isOwner, getRemainingDays, calculateAmountSpent, calculateTopupAmount } from "../utils/reportUtils";
import { type User } from "firebase/auth";
import EditExpense from "./EditExpense";

const ReportDetailsPage = () => {
    const { reportId } = useParams();
    const { alert, showAlert } = useAlert();
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [openExpenseModal, setOpenExpenseModal] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);

    useEffect(() => {
        if (!reportId) return;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) setUser(user);
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
        if (!user || !user.email || !user.displayName) {
            showAlert("खर्चे के मालिक की जानकारी नहीं है", "error");
            return;
        }
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
                authorEmail: user.email,
                authorDisplayName: user.displayName
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
    }, [reportId, showAlert, user]);

    const handleAddExpense = useCallback(async (title: string, amount: number) => await createExpenseHelper(title, -1 * Math.abs(amount), "खर्चा"), [createExpenseHelper]);
    const handleTopup = useCallback(async (amount: number) => await createExpenseHelper("टॉप उप", Math.abs(amount), "टॉप उप"), [createExpenseHelper]);

    // Utility method for adding/removing emails
    const manageEmailShare = useCallback(async (
        email: string,
        action: "add" | "remove",
        successLabel: string
    ) => {
        if (!reportId) {
            showAlert("रिपोर्ट आईडी उपलब्ध नहीं है", "error");
            return;
        }

        if (!email || !email.includes("@")) {
            showAlert("कृपया एक मान्य ईमेल दर्ज करें", "error");
            return;
        }

        try {
            setLoading(true);
            if (action === "add") await shareReport(reportId, email);
            else await unshareReport(reportId, email);

            // Refresh report
            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            showAlert(`${successLabel} सफलतापूर्वक हो गया`, "success");
        } catch (err) {
            console.error(err);
            showAlert(`ईमेल ${successLabel.toLowerCase()} में समस्या हुई`, "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, showAlert, getReport, shareReport, unshareReport]);

    const handleAddEmail = useCallback(async (email: string) =>
        await manageEmailShare(email, "add", "शेयर"), [manageEmailShare]);
    const handleRemoveEmail = useCallback(async (email: string) =>
        await manageEmailShare(email, "remove", "अनशेयर"), [manageEmailShare]);


    const handleEditExpense = useCallback(async (title: string, amount: number) => {
        try {
            if (!reportId) {
                showAlert("रिपोर्ट आईडी उपलब्ध नहीं है", "error");
                return;
            }
            if (!selectedExpenseId) {
                showAlert("खर्चे की आईडी उपलब्ध नहीं है", "error");
                return;

            }

            // Update expense
            setLoading(true);
            await updateExense({ reportId, expenseId: selectedExpenseId, title, amount });

            // Refresh report
            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            showAlert("खर्चा सफलता पूर्वक बदला गया", "success");
        } catch (err) {
            console.log(err);
            showAlert("खर्चा बदलने में समस्या हुई", "error");
        } finally {
            setSelectedExpenseId(null);
            setLoading(false);
        }
    }, [reportId, selectedExpenseId, setSelectedExpenseId, setLoading, getReport, setReport, showAlert]);

    const handleDeleteExpense = useCallback(async () => {
        try {
            if (!reportId) {
                showAlert("रिपोर्ट आईडी उपलब्ध नहीं है", "error");
                return;
            }
            if (!selectedExpenseId) {
                showAlert("खर्चे की आईडी उपलब्ध नहीं है", "error");
                return;

            }

            // Delete expense
            setLoading(true);
            await deleteExpense(reportId, selectedExpenseId);

            // Refresh report
            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            showAlert("खर्चा सफलता पूर्वक हटाया गया", "success");
        } catch (err) {
            console.log(err);
            showAlert("खर्चा हटाने में समस्या हुई", "error");
        } finally {
            setSelectedExpenseId(null);
            setLoading(false);
        }
    }, [reportId, selectedExpenseId, setSelectedExpenseId, setLoading, showAlert, deleteExpense]);

    const handleDeleteReport = async () => {
        try {
            if (!reportId) {
                showAlert("रिपोर्ट आईडी उपलब्ध नहीं है", "error");
                return;
            }

            setLoading(true);
            await deleteReport(reportId);
            navigate("/reports");
        } catch (err) {
            console.log(err);
            showAlert("रिपोर्ट हटाने में समस्या हुई", "error");
        } finally {
            setLoading(false);
        }
    };

    if (!report) return <Loader visible={true} />;

    const topupAmount = calculateTopupAmount(report);
    const spentAmount = calculateAmountSpent(report);
    const remainingBudget = report.budget + topupAmount - spentAmount;
    const selectedExpense = selectedExpenseId && report.expenses.find(e => e.id === selectedExpenseId);
    const canActOnExpense = isOwner(report, user?.email) && !report.deleted;

    return (
        <div className="report-details-container">
            <Alert alert={alert} />
            <Loader visible={loading} />
            <Link to="/reports" className="back-button">
                <FiArrowLeft size={20} />
                <span>वापस जाएँ</span>
            </Link>
            {isOwner(report, user?.email) && !report.deleted &&
                <ReportHamburgerMenu
                    sharedWith={report.sharedWith}
                    onAddEmail={handleAddEmail}
                    onRemoveEmail={handleRemoveEmail}
                    onDeleteReport={handleDeleteReport}
                    onTopup={handleTopup}
                />}

            {report.deletedAt && <p className="deleted-message">
                यह रिपोर्ट सॉफ्ट-डिलीटेड है और {getRemainingDays(report.deletedAt)} दिन में स्थायी रूप से हट जाएगी।</p>}

            <div className="report-header">
                <h2 className="report-title">{report.title}</h2>
                {isShared(report, user?.email) && (
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
                {canActOnExpense && <div className="expense-note">
                    (खर्चे में बदलाव करने के लिए दो बार खर्चे पर दबाएँ)
                </div>}
            </div>

            <div className="expenses-list">
                {report.expenses.map((expense) => (
                    <div className={`expense-item ${expense.deleted && "deleted"}`} key={expense.id}
                        onDoubleClick={() => {
                            if (canActOnExpense && !expense.deleted) {
                                setSelectedExpenseId(expense.id);
                            }
                        }}>
                        <div className="expense-info">
                            <p className="expense-title">{expense.title}</p>
                            <p className="expense-date">{new Date(expense.date).toLocaleDateString("hi-IN")}</p>
                            {expense.authorDisplayName && <p className="expense-author">{expense.authorDisplayName}</p>}
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

            {!report.deleted && <button
                className="add-expense-btn"
                onClick={() => setOpenExpenseModal(true)}
            >
                <FiPlus size={22} />
            </button>}

            {openExpenseModal &&
                <AmountModalInput
                    header="नया ख़र्च जोड़ें"
                    titlePlaceholder="ख़र्च का नाम"
                    amountPlaceholder="खर्च की राशि"
                    onReject={() => setOpenExpenseModal(false)}
                    onAccept={handleAddExpense}
                />
            }

            {
                selectedExpense &&
                <EditExpense
                    expenseTitle={selectedExpense.title}
                    expenseAmount={selectedExpense.amount.toString()}
                    onCancel={() => setSelectedExpenseId(null)}
                    onDelete={handleDeleteExpense}
                    onEdit={handleEditExpense}
                />
            }
        </div>
    );
};

export default ReportDetailsPage;
