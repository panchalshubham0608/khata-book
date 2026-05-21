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
import ExpenseRow from "./ExpenseRow";
import { useTranslation } from "../i18n/locale";

const ReportDetailsPage = () => {
    const { reportId } = useParams();
    const { alert, showAlert } = useAlert();
    const { t, locale } = useTranslation();
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
                    showAlert(t("reportDetails.reportNotFound"), "error");
                    setReport(null);
                    return;
                }

                if (
                    fetched.owner !== user.email &&
                    !fetched.sharedWith?.includes(user.email)
                ) {
                    showAlert(t("reportDetails.noPermission"), "error");
                    setReport(null);
                    return;
                }

                setReport(fetched);
            } catch (error) {
                console.error(error);
                showAlert(t("reportDetails.loadError"), "error");
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [reportId, showAlert, t]);

    const createExpenseHelper = useCallback(async (title: string, amount: number, label: string) => {
        if (!user || !user.email || !user.displayName) {
            showAlert(t("reportDetails.ownerMissing"), "error");
            return;
        }
        if (!reportId) {
            showAlert(t("reportDetails.reportIdMissing"), "error");
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

            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            setOpenExpenseModal(false);
            showAlert(t("reportDetails.addSuccess", { label }), "success");
        } catch (err) {
            console.error(err);
            showAlert(t("reportDetails.addError", { label }), "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, showAlert, user, t]);

    const handleAddExpense = useCallback(async (title: string, amount: number) => await createExpenseHelper(title, -1 * Math.abs(amount), t("reportDetails.expenseLabel")), [createExpenseHelper, t]);
    const handleTopup = useCallback(async (amount: number) => await createExpenseHelper(t("reportDetails.action.topup"), Math.abs(amount), t("reportDetails.action.topup")), [createExpenseHelper, t]);

    const manageEmailShare = useCallback(async (
        email: string,
        action: "add" | "remove",
        successLabel: string
    ) => {
        if (!reportId) {
            showAlert(t("reportDetails.reportIdMissing"), "error");
            return;
        }

        if (!email || !email.includes("@")) {
            showAlert(t("reportDetails.invalidEmail"), "error");
            return;
        }

        try {
            setLoading(true);
            if (action === "add") await shareReport(reportId, email);
            else await unshareReport(reportId, email);

            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            showAlert(t("reportDetails.addSuccess", { label: successLabel }), "success");
        } catch (err) {
            console.error(err);
            showAlert(t("reportDetails.emailActionError", { action: successLabel }), "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, showAlert, t]);

    const handleAddEmail = useCallback(async (email: string) =>
        await manageEmailShare(email, "add", t("reportDetails.action.add")), [manageEmailShare]);
    const handleRemoveEmail = useCallback(async (email: string) =>
        await manageEmailShare(email, "remove", t("reportDetails.action.remove")), [manageEmailShare]);

    const handleEditExpense = useCallback(async (title: string, amount: number) => {
        try {
            if (!reportId) {
                showAlert(t("reportDetails.reportIdMissing"), "error");
                return;
            }
            if (!selectedExpenseId) {
                showAlert(t("reportDetails.invalidExpenseId"), "error");
                return;
            }

            setLoading(true);
            await updateExense({ reportId, expenseId: selectedExpenseId, title, amount });

            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            showAlert(t("reportDetails.editSuccess"), "success");
        } catch (err) {
            console.log(err);
            showAlert(t("reportDetails.editError"), "error");
        } finally {
            setSelectedExpenseId(null);
            setLoading(false);
        }
    }, [reportId, selectedExpenseId, setSelectedExpenseId, setLoading, t]);

    const handleDeleteExpense = useCallback(async () => {
        try {
            if (!reportId) {
                showAlert(t("reportDetails.reportIdMissing"), "error");
                return;
            }
            if (!selectedExpenseId) {
                showAlert(t("reportDetails.invalidExpenseId"), "error");
                return;
            }

            setLoading(true);
            await deleteExpense(reportId, selectedExpenseId);

            const updated = await getReport(reportId);
            if (updated) setReport(updated);

            showAlert(t("reportDetails.deleteSuccess"), "success");
        } catch (err) {
            console.log(err);
            showAlert(t("reportDetails.deleteError"), "error");
        } finally {
            setSelectedExpenseId(null);
            setLoading(false);
        }
    }, [reportId, selectedExpenseId, setSelectedExpenseId, setLoading, showAlert, t]);

    const handleDeleteReport = async () => {
        try {
            if (!reportId) {
                showAlert(t("reportDetails.reportIdMissing"), "error");
                return;
            }

            setLoading(true);
            await deleteReport(reportId);
            navigate("/reports");
        } catch (err) {
            console.log(err);
            showAlert(t("reportDetails.reportDeleteError"), "error");
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
            <div className="report-header-row">
                <Link to="/reports" className="back-button">
                    <FiArrowLeft size={20} />
                    <span>{t("reportDetails.back")}</span>
                </Link>
            </div>
            {isOwner(report, user?.email) && !report.deleted &&
                <ReportHamburgerMenu
                    sharedWith={report.sharedWith}
                    onAddEmail={handleAddEmail}
                    onRemoveEmail={handleRemoveEmail}
                    onDeleteReport={handleDeleteReport}
                    onTopup={handleTopup}
                />}

            {report.deletedAt && <p className="deleted-message">
                {t("reportDetails.deletedMessage", { days: getRemainingDays(report.deletedAt) })}</p>}

            <div className="report-header">
                <h2 className="report-title">{report.title}</h2>
                {isShared(report, user?.email) && (
                    <span className="shared-badge">
                        <FiShare2 size={16} /> {t("reports.sharedBadge")}
                    </span>
                )}
            </div>

            <div className="report-summary">
                <div className="chips-container">
                    <span className="chip">{t("reportDetails.budgetChip", { amount: report.budget.toLocaleString() })}</span>
                    <span className="chip spent">{t("reportDetails.spentChip", { amount: spentAmount.toLocaleString() })}</span>
                    <span className="chip remaining">{t("reportDetails.remainingChip", { amount: remainingBudget.toLocaleString() })}</span>
                    <span className="chip date">{t("reportDetails.createdChip", { date: new Date(report.createdAt).toLocaleDateString(locale === "hi" ? "hi-IN" : "en-US") })}</span>
                    <span className="chip topup">{t("reportDetails.topupChip", { amount: topupAmount.toLocaleString() })}</span>
                </div>
            </div>

            <div className="expenses-title">
                {t("reportDetails.expensesTitle")}
                {canActOnExpense && <div className="expense-note">
                    {t("reportDetails.expensesNote")}
                </div>}
            </div>

            <div className="expenses-list">
                {report.expenses.map((expense) => (
                    <ExpenseRow key={expense.id} expense={expense} onAction={() => {
                        if (canActOnExpense && !expense.deleted) {
                            setSelectedExpenseId(expense.id)
                        }
                    }} />
                ))}
                {report.expenses.length === 0 &&
                    <div className="no-reports-container">
                        <FiFileText size={48} className="no-reports-icon" />
                        <p className="no-reports-text">{t("reportDetails.noExpenses")}</p>
                        <p className="no-reports-subtext">{t("reportDetails.noExpensesSubtext")}</p>
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
                    header={t("reportDetails.addExpenseHeader")}
                    titlePlaceholder={t("reportDetails.expenseNamePlaceholder")}
                    amountPlaceholder={t("reportDetails.expenseAmountPlaceholder")}
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
