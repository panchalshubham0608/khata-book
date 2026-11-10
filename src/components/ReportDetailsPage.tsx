// ReportDetailsPage.tsx
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    FiShare2,
    FiPlus,
    FiFileText,
    FiSearch,
    FiX,
    FiCalendar,
    FiAlertCircle,
    FiTrendingDown,
    FiTrendingUp,
    FiLayers,
    FiArchive,
    FiMic,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import AmountModalInput from "./AmountModalInput";
import ReportHamburgerMenu from "./ReportDetailsHamburger";
import "./ReportDetailsPage.css";
import { auth } from "../firebase/firebase";
import type { Report } from "../firebase/types";
import {
    archiveReport,
    createExpense,
    createExpensesBatch,
    deleteExpense,
    deleteReport,
    getReport,
    restoreReport,
    shareReport,
    unarchiveReport,
    unshareReport,
    updateExense,
} from "../firebase/reportService";
import { getUserProfile } from "../firebase/userProfileService";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import {
    isShared,
    isOwner,
    isArchived,
    getRemainingDays,
    calculateAmountSpent,
    calculateTopupAmount,
    calculateEffectiveBudget,
} from "../utils/reportUtils";
import { backupReportToGoogleSheets } from "../utils/googleBackup";
import { type User } from "firebase/auth";
import EditExpense from "./EditExpense";
import ExpenseRow from "./ExpenseRow";
import GeminiKeyModal from "./GeminiKeyModal";
import GeminiVoiceRecorderModal from "./GeminiVoiceRecorderModal";
import GeminiExpenseCarousel, {
    type ApprovedGeminiExpense,
} from "./GeminiExpenseCarousel";
import type { GeminiAudioAnalysisResult } from "../services/geminiAudioService";
import { useTranslation } from "../i18n/locale";

const ReportDetailsPage = () => {
    const { reportId } = useParams();
    const { alert, showAlert } = useAlert();
    const { t, locale } = useTranslation();
    const navigate = useNavigate();

    const [user, setUser] = useState<User | null>(null);
    const [report, setReport] = useState<Report | null>(null);
    const [archivedReports, setArchivedReports] = useState<string[]>([]);
    const [geminiApiKey, setGeminiApiKey] = useState<string>("");
    const [showGeminiKeyModal, setShowGeminiKeyModal] = useState<boolean>(false);
    const [pendingVoiceAfterKey, setPendingVoiceAfterKey] =
        useState<boolean>(false);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState<boolean>(false);
    const [geminiResult, setGeminiResult] =
        useState<GeminiAudioAnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [openExpenseModal, setOpenExpenseModal] = useState(false);
    const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

    useEffect(() => {
        if (!reportId) return;
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) setUser(user);
            if (!user?.email) {
                setReport(null);
                setArchivedReports([]);
                setGeminiApiKey("");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const [fetched, profile] = await Promise.all([
                    getReport(reportId),
                    getUserProfile(user.email).catch(() => ({
                        id: user.email!,
                        owner: user.email!,
                        archivedReports: [] as string[],
                        geminiApiKey: undefined,
                        updatedAt: "",
                    })),
                ]);

                setArchivedReports(profile.archivedReports);
                setGeminiApiKey(profile.geminiApiKey || "");

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

    const createExpenseHelper = useCallback(
        async (
            title: string,
            amount: number,
            label: string,
            categories?: string[],
            date?: string
        ) => {
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
                    authorDisplayName: user.displayName,
                    categories,
                    date,
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
        },
        [reportId, showAlert, user, t]
    );

    const handleAddExpense = useCallback(
        async (
            title: string,
            amount: number,
            categories?: string[],
            date?: string
        ) =>
            await createExpenseHelper(
                title,
                -1 * Math.abs(amount),
                t("reportDetails.expenseLabel"),
                categories,
                date
            ),
        [createExpenseHelper, t]
    );

    const handleTopup = useCallback(
        async (amount: number, date?: string) =>
            await createExpenseHelper(
                t("reportDetails.action.topup"),
                Math.abs(amount),
                t("reportDetails.action.topup"),
                undefined,
                date
            ),
        [createExpenseHelper, t]
    );

    const manageEmailShare = useCallback(
        async (email: string, action: "add" | "remove", successLabel: string) => {
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

                showAlert(
                    t("reportDetails.addSuccess", { label: successLabel }),
                    "success"
                );
            } catch (err) {
                console.error(err);
                showAlert(
                    t("reportDetails.emailActionError", { action: successLabel }),
                    "error"
                );
            } finally {
                setLoading(false);
            }
        },
        [reportId, showAlert, t]
    );

    const handleAddEmail = useCallback(
        async (email: string) =>
            await manageEmailShare(email, "add", t("reportDetails.action.add")),
        [manageEmailShare, t]
    );
    const handleRemoveEmail = useCallback(
        async (email: string) =>
            await manageEmailShare(
                email,
                "remove",
                t("reportDetails.action.remove")
            ),
        [manageEmailShare, t]
    );

    const handleEditExpense = useCallback(
        async (title: string, amount: number, date: string) => {
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
                await updateExense({
                    reportId,
                    expenseId: selectedExpenseId,
                    title,
                    amount,
                    date,
                });

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
        },
        [reportId, selectedExpenseId, showAlert, t]
    );

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
    }, [reportId, selectedExpenseId, showAlert, t]);

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

    const handleRestoreReport = useCallback(async () => {
        try {
            if (!reportId) {
                showAlert(t("reportDetails.reportIdMissing"), "error");
                return;
            }

            setLoading(true);
            await restoreReport(reportId);
            const updated = await getReport(reportId);
            if (updated) setReport(updated);
            showAlert(t("trash.restoreSuccess"), "success");
        } catch (err) {
            console.error(err);
            showAlert(t("trash.restoreError"), "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, showAlert, t]);

    const handleArchiveReport = useCallback(async () => {
        try {
            if (!reportId || !user?.email) {
                showAlert(t("reportDetails.reportIdMissing"), "error");
                return;
            }

            setLoading(true);
            await archiveReport(reportId, user.email);
            setArchivedReports((prev) =>
                prev.includes(reportId) ? prev : [...prev, reportId]
            );
            navigate("/reports");
        } catch (err) {
            console.error(err);
            showAlert(t("reportDetails.reportArchiveError"), "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, user, navigate, showAlert, t]);

    const handleUnarchiveReport = useCallback(async () => {
        try {
            if (!reportId || !user?.email) {
                showAlert(t("reportDetails.reportIdMissing"), "error");
                return;
            }

            setLoading(true);
            await unarchiveReport(reportId, user.email);
            setArchivedReports((prev) => prev.filter((id) => id !== reportId));
            showAlert(t("reportDetails.reportUnarchiveSuccess"), "success");
        } catch (err) {
            console.error(err);
            showAlert(t("reportDetails.reportUnarchiveError"), "error");
        } finally {
            setLoading(false);
        }
    }, [reportId, user, showAlert, t]);

    const handleBackup = useCallback(async () => {
        if (!report) {
            showAlert(t("reportDetails.backupUnavailable"), "error");
            return;
        }

        try {
            setLoading(true);
            await backupReportToGoogleSheets(report);
            showAlert(t("reportDetails.backupSuccess"), "success");
        } catch (error) {
            console.error(error);
            showAlert(t("reportDetails.backupError"), "error");
        } finally {
            setLoading(false);
        }
    }, [report, showAlert, t]);

    const handleVoiceButtonClick = useCallback(() => {
        if (!geminiApiKey.trim()) {
            setPendingVoiceAfterKey(true);
            setShowGeminiKeyModal(true);
            return;
        }
        setShowVoiceRecorder(true);
    }, [geminiApiKey]);

    const handleCommitGeminiBatch = useCallback(
        async (approved: ApprovedGeminiExpense[]) => {
            if (!reportId || !user?.email) {
                setGeminiResult(null);
                return;
            }
            if (approved.length === 0) {
                setGeminiResult(null);
                return;
            }

            try {
                setLoading(true);
                await createExpensesBatch(
                    approved.map((item) => ({
                        reportId,
                        expenseTitle: item.title,
                        expenseAmount: item.signedAmount,
                        authorEmail: user.email!,
                        authorDisplayName: user.displayName || user.email!,
                        date: item.dateIso,
                    }))
                );

                const updated = await getReport(reportId);
                if (updated) setReport(updated);

                setGeminiResult(null);
                showAlert(
                    t("gemini.expensesAddedSuccess", { count: approved.length }),
                    "success"
                );
            } catch {
                showAlert(t("gemini.expensesAddError"), "error");
            } finally {
                setLoading(false);
            }
        },
        [reportId, showAlert, t, user]
    );

    useEffect(() => {
        const handler = window.setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
        }, 250);

        return () => window.clearTimeout(handler);
    }, [searchTerm]);

    const filteredExpenses = useMemo(() => {
        if (!report) return [];
        if (!debouncedSearchTerm) return report.expenses;

        return report.expenses.filter((expense) =>
            [
                expense.title.toLowerCase(),
                expense.authorDisplayName.toLowerCase(),
                expense.authorEmail.toLowerCase(),
                expense.amount.toString(),
            ].some((value) => value.includes(debouncedSearchTerm))
        );
    }, [report, debouncedSearchTerm]);

    const filteredTotals = useMemo(() => {
        return filteredExpenses.reduce(
            (acc, expense) => {
                if (expense.amount < 0) {
                    acc.spent += Math.abs(expense.amount);
                } else {
                    acc.topup += expense.amount;
                }
                return acc;
            },
            { spent: 0, topup: 0 }
        );
    }, [filteredExpenses]);

    if (!report) return <Loader visible={true} />;

    const topupAmount = calculateTopupAmount(report);
    const effectiveBudget = calculateEffectiveBudget(report);
    const spentAmount = calculateAmountSpent(report);
    const remainingBudget = effectiveBudget - spentAmount;
    const rawPercent =
        effectiveBudget > 0
            ? (spentAmount / effectiveBudget) * 100
            : spentAmount > 0
            ? 100
            : 0;
    const progressWidth = Math.min(Math.max(rawPercent, 0), 100);
    const displayPercent = Math.round(rawPercent);

    const formattedCreatedDate = new Date(report.createdAt).toLocaleDateString(
        locale === "hi" ? "hi-IN" : "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    );

    const selectedExpense =
        selectedExpenseId &&
        report.expenses.find((e) => e.id === selectedExpenseId);
    const canActOnExpense = Boolean(
        isOwner(report, user?.email) && !report.deleted
    );
    const canRestoreReport = Boolean(
        isOwner(report, user?.email) && report.deleted
    );
    const canArchiveReport = Boolean(!report.deleted);
    const reportArchived = isArchived(report.id, archivedReports);

    return (
        <div className="report-details-container">
            <Alert alert={alert} />
            <Loader visible={loading} />

            <main className="report-details-main">
                {report.deletedAt && (
                    <div className="deleted-message-banner">
                        <FiAlertCircle size={18} className="deleted-banner-icon" />
                        <span>
                            {t("reportDetails.deletedMessage", {
                                days: getRemainingDays(report.deletedAt),
                            })}
                        </span>
                    </div>
                )}

                {/* Report Overview Hero Card */}
                <section className="report-hero-card">
                    <div className="report-hero-top">
                        <div className="report-hero-title-group">
                            <h1 className="report-hero-title">{report.title}</h1>
                            <span className="report-hero-date">
                                <FiCalendar size={12} />
                                {formattedCreatedDate}
                            </span>
                        </div>

                        <div className="report-hero-nav-right">
                            {reportArchived && (
                                <span className="report-hero-badge archived">
                                    <FiArchive size={11} /> {t("reports.archivedBadge")}
                                </span>
                            )}
                            {isShared(report, user?.email) && (
                                <span className="report-hero-badge shared">
                                    <FiShare2 size={12} /> {t("reports.sharedBadge")}
                                </span>
                            )}
                            {report.deleted && (
                                <span className="report-hero-badge deleted">
                                    {t("reports.deletedBadge")}
                                </span>
                            )}
                            <ReportHamburgerMenu
                                canManage={canActOnExpense}
                                canArchive={canArchiveReport}
                                canRestore={canRestoreReport}
                                isArchived={reportArchived}
                                sharedWith={report.sharedWith}
                                onAddEmail={handleAddEmail}
                                onRemoveEmail={handleRemoveEmail}
                                onDeleteReport={handleDeleteReport}
                                onRestoreReport={handleRestoreReport}
                                onArchiveReport={handleArchiveReport}
                                onUnarchiveReport={handleUnarchiveReport}
                                onTopup={handleTopup}
                                onBackup={handleBackup}
                                onOpenGeminiKey={() => {
                                    setPendingVoiceAfterKey(false);
                                    setShowGeminiKeyModal(true);
                                }}
                            />
                        </div>
                    </div>

                    <div className="report-hero-balance-block">
                        <div className="report-hero-balance-row">
                            <span className="report-hero-balance-label">
                                {t("reports.remainingLabel")}
                            </span>
                            <span className="report-hero-percent-pill">
                                {t("reports.usedPercent", {
                                    percent: displayPercent,
                                })}
                            </span>
                        </div>
                        <div
                            className={`report-hero-balance-amount ${
                                remainingBudget < 0 ? "is-negative" : ""
                            }`}
                        >
                            {remainingBudget < 0 ? "-" : ""}₹
                            {Math.abs(remainingBudget).toLocaleString("en-IN")}
                        </div>
                    </div>

                    <div className="report-hero-progress-track">
                        <div
                            className="report-hero-progress-fill"
                            style={{ width: `${progressWidth}%` }}
                        />
                    </div>

                    <div className="report-hero-metrics">
                        <div className="report-hero-metric">
                            <div className="report-hero-metric-header">
                                <span className="report-hero-metric-icon budget">
                                    <FiLayers size={12} />
                                </span>
                                <span className="report-hero-metric-label">
                                    {t("reports.budgetLabel")}
                                </span>
                            </div>
                            <span className="report-hero-metric-value">
                                ₹{effectiveBudget.toLocaleString("en-IN")}
                            </span>
                            {topupAmount > 0 && (
                                <span className="report-hero-metric-sub">
                                    ₹{report.budget.toLocaleString("en-IN")} + ₹
                                    {topupAmount.toLocaleString("en-IN")}
                                </span>
                            )}
                        </div>

                        <div className="report-hero-metric-divider" />

                        <div className="report-hero-metric">
                            <div className="report-hero-metric-header">
                                <span className="report-hero-metric-icon spent">
                                    <FiTrendingDown size={12} />
                                </span>
                                <span className="report-hero-metric-label">
                                    {t("reports.spentLabel")}
                                </span>
                            </div>
                            <span className="report-hero-metric-value">
                                ₹{spentAmount.toLocaleString("en-IN")}
                            </span>
                        </div>

                        <div className="report-hero-metric-divider" />

                        <div className="report-hero-metric">
                            <div className="report-hero-metric-header">
                                <span className="report-hero-metric-icon topup">
                                    <FiTrendingUp size={12} />
                                </span>
                                <span className="report-hero-metric-label">
                                    {t("reportHamburger.topup")}
                                </span>
                            </div>
                            <span className="report-hero-metric-value">
                                +₹{topupAmount.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Search & Filter Bar */}
                {report.expenses.length > 0 && (
                    <div className="report-search-section">
                        <div className="search-input-wrapper">
                            <FiSearch size={17} className="search-leading-icon" />
                            <input
                                className="search-input"
                                type="search"
                                value={searchTerm}
                                placeholder={t("reportDetails.searchPlaceholder")}
                                aria-label={t("reportDetails.searchPlaceholder")}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    type="button"
                                    className="search-clear-btn"
                                    aria-label="Clear search"
                                    onClick={() => setSearchTerm("")}
                                >
                                    <FiX size={15} />
                                </button>
                            )}
                        </div>

                        {searchTerm.trim() !== "" && (
                            <div className="filtered-summary-bar">
                                <span className="filtered-pill spent">
                                    {t("reportDetails.filteredSpentChip", {
                                        amount: filteredTotals.spent.toLocaleString(
                                            "en-IN"
                                        ),
                                    })}
                                </span>
                                <span className="filtered-pill topup">
                                    {t("reportDetails.filteredTopupChip", {
                                        amount: filteredTotals.topup.toLocaleString(
                                            "en-IN"
                                        ),
                                    })}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Expenses List Section */}
                <section className="expenses-section">
                    <div className="expenses-section-header">
                        <div className="expenses-header-left">
                            <h2 className="expenses-title">
                                {t("reportDetails.expensesTitle")}
                            </h2>
                            <span className="expenses-count-pill">
                                {filteredExpenses.length}
                            </span>
                        </div>
                        {canActOnExpense && report.expenses.length > 0 && (
                            <span className="expense-note">
                                {t("reportDetails.expensesNote")}
                            </span>
                        )}
                    </div>

                    <div className="expenses-list">
                        {filteredExpenses.map((expense) => (
                            <ExpenseRow
                                key={expense.id}
                                expense={expense}
                                onAction={() => {
                                    if (canActOnExpense && !expense.deleted) {
                                        setSelectedExpenseId(expense.id);
                                    }
                                }}
                            />
                        ))}

                        {report.expenses.length === 0 && (
                            <div className="no-reports-container">
                                <div className="no-reports-icon-circle">
                                    <FiFileText size={28} />
                                </div>
                                <p className="no-reports-text">
                                    {t("reportDetails.noExpenses")}
                                </p>
                                <p className="no-reports-subtext">
                                    {t("reportDetails.noExpensesSubtext")}
                                </p>
                                {!report.deleted && (
                                    <div className="no-expenses-cta-row">
                                        <button
                                            type="button"
                                            className="no-reports-cta"
                                            onClick={() => setOpenExpenseModal(true)}
                                        >
                                            <FiPlus size={16} />
                                            {t("reportDetails.addExpenseHeader")}
                                        </button>
                                        <button
                                            type="button"
                                            className="no-reports-cta gemini-ai-cta"
                                            onClick={handleVoiceButtonClick}
                                        >
                                            <FiMic size={16} />
                                            {t("gemini.aiBatchButton")}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {report.expenses.length > 0 &&
                            filteredExpenses.length === 0 && (
                                <div className="no-reports-container">
                                    <div className="no-reports-icon-circle">
                                        <FiSearch size={26} />
                                    </div>
                                    <p className="no-reports-text">
                                        {t("reportDetails.noMatchingExpenses")}
                                    </p>
                                    <p className="no-reports-subtext">
                                        {t("reportDetails.searchEmptySubtext")}
                                    </p>
                                </div>
                            )}
                    </div>
                </section>
            </main>

            {!report.deleted && (
                <div className="report-floating-actions">
                    <button
                        type="button"
                        className="gemini-voice-btn"
                        onClick={handleVoiceButtonClick}
                        aria-label={t("gemini.voiceButtonAria")}
                        title={t("gemini.voiceButtonAria")}
                    >
                        <FiMic size={21} />
                        <span className="gemini-voice-btn-badge">AI</span>
                    </button>
                    <button
                        type="button"
                        className="add-expense-btn"
                        onClick={() => setOpenExpenseModal(true)}
                        aria-label={t("reportDetails.addExpenseHeader")}
                    >
                        <FiPlus size={24} />
                    </button>
                </div>
            )}

            {openExpenseModal && (
                <AmountModalInput
                    header={t("reportDetails.addExpenseHeader")}
                    titlePlaceholder={t("reportDetails.expenseNamePlaceholder")}
                    amountPlaceholder={t(
                        "reportDetails.expenseAmountPlaceholder"
                    )}
                    showCategories={false}
                    showDate={true}
                    onReject={() => setOpenExpenseModal(false)}
                    onAccept={handleAddExpense}
                />
            )}

            {selectedExpense && (
                <EditExpense
                    expenseTitle={selectedExpense.title}
                    expenseAmount={selectedExpense.amount.toString()}
                    expenseDate={selectedExpense.date}
                    onCancel={() => setSelectedExpenseId(null)}
                    onDelete={handleDeleteExpense}
                    onEdit={handleEditExpense}
                />
            )}

            {showGeminiKeyModal && (
                <GeminiKeyModal
                    initialApiKey={geminiApiKey}
                    onClose={() => {
                        setShowGeminiKeyModal(false);
                        setPendingVoiceAfterKey(false);
                    }}
                    onSaved={(newKey) => {
                        setGeminiApiKey(newKey);
                        if (newKey && pendingVoiceAfterKey) {
                            setShowGeminiKeyModal(false);
                            setPendingVoiceAfterKey(false);
                            setShowVoiceRecorder(true);
                        }
                    }}
                />
            )}

            {showVoiceRecorder && (
                <GeminiVoiceRecorderModal
                    apiKey={geminiApiKey}
                    onClose={() => setShowVoiceRecorder(false)}
                    onOpenKeySettings={() => {
                        setShowVoiceRecorder(false);
                        setPendingVoiceAfterKey(true);
                        setShowGeminiKeyModal(true);
                    }}
                    onExtracted={(result) => {
                        setShowVoiceRecorder(false);
                        setGeminiResult(result);
                    }}
                />
            )}

            {geminiResult && geminiResult.expenses.length > 0 && (
                <GeminiExpenseCarousel
                    expenses={geminiResult.expenses}
                    transcript={geminiResult.transcript}
                    reportTitle={report.title}
                    onCommitBatch={handleCommitGeminiBatch}
                    onCancel={() => setGeminiResult(null)}
                />
            )}
        </div>
    );
};

export default ReportDetailsPage;

