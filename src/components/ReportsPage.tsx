import { useState, useEffect, useCallback, useMemo } from "react";
import {
    FiShare2,
    FiPlus,
    FiUsers,
    FiFileText,
    FiChevronRight,
    FiTrendingUp,
    FiTrendingDown,
    FiFolder,
    FiArchive,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AmountModalInput from "./AmountModalInput";
import { signOut, type User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./ReportsPage.css";
import type { Report } from "../firebase/types";
import { createExpensesBatch, createReport, getReports } from "../firebase/reportService";
import { getUserProfile } from "../firebase/userProfileService";
import Categories from "./Categories";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { isShared, isArchived, calculateAmountSpent, calculateEffectiveBudget } from "../utils/reportUtils";
import ReportsHamburger from "./ReportsHamburger";
import Contacts from "./Contacts";
import SmsTransactionPopup from "./SmsTransactionPopup";
import {
    isSmsTrackingEnabled,
    markSmsProcessedBatch,
    scanUnprocessedSmsTransactions,
    setSmsTrackingEnabled,
    type PendingSmsTransaction,
    type StagedApprovedSmsTransaction,
} from "../services/smsTrackingService";
import { useTranslation } from "../i18n/locale";

const ReportsPage = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>([]);
    const [archivedReports, setArchivedReports] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showArchived, setShowArchived] = useState<boolean>(() => {
        const stored = localStorage.getItem("showArchived");
        return stored === "true";
    });
    const [smsTrackingEnabled, setSmsTrackingEnabledState] = useState<boolean>(false);
    const [pendingSmsQueue, setPendingSmsQueue] = useState<PendingSmsTransaction[]>([]);
    const [showContacts, setShowContacts] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const { alert, showAlert } = useAlert();
    const { t, locale } = useTranslation();

    const activeReports = useMemo(
        () =>
            reports.filter(
                (r) => !r.deleted && !isArchived(r.id, archivedReports)
            ),
        [reports, archivedReports]
    );

    const portfolioStats = useMemo(() => {
        let totalBudget = 0;
        let totalSpent = 0;

        for (const r of activeReports) {
            totalBudget += calculateEffectiveBudget(r);
            totalSpent += calculateAmountSpent(r);
        }

        const totalRemaining = totalBudget - totalSpent;
        const usedPercent =
            totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

        return {
            totalBudget,
            totalSpent,
            totalRemaining,
            usedPercent,
        };
    }, [activeReports]);

    const fetchReports = useCallback(async (email: string) => {
        try {
            setLoading(true);
            const profile = await getUserProfile(email).catch(() => ({
                id: email,
                owner: email,
                archivedReports: [] as string[],
                updatedAt: "",
            }));
            setArchivedReports(profile.archivedReports);
            const userReports = await getReports(email, {
                showArchived,
                archivedReports: profile.archivedReports,
            });
            setReports(userReports);
        } catch (err) {
            console.error(err);
            showAlert(t("reports.reportLoadError"), "error");
        } finally {
            setLoading(false);
        }
    }, [showAlert, showArchived, t]);

    const runSmsScan = useCallback(async (email: string) => {
        if (!window.Android || !isSmsTrackingEnabled(email)) return;
        const detected = await scanUnprocessedSmsTransactions(email);
        if (detected.length > 0) {
            setPendingSmsQueue(detected);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser?.email) {
                setUser(currentUser);
                const enabled = isSmsTrackingEnabled(currentUser.email);
                setSmsTrackingEnabledState(enabled);
                fetchReports(currentUser.email);
                runSmsScan(currentUser.email);
            } else {
                setReports([]);
                setArchivedReports([]);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [fetchReports, runSmsScan]);

    useEffect(() => {
        if (!user?.email) return;
        const email = user.email;

        const handlePermissionResult = (event: Event) => {
            const customEvent = event as CustomEvent<{ granted: boolean }>;
            if (customEvent.detail?.granted) {
                setSmsTrackingEnabled(email, true);
                setSmsTrackingEnabledState(true);
                showAlert(t("smsPopup.permissionGranted"), "success");
                runSmsScan(email);
            } else {
                setSmsTrackingEnabled(email, false);
                setSmsTrackingEnabledState(false);
                showAlert(t("smsPopup.permissionDenied"), "error");
            }
        };

        const handleAppResumed = () => {
            if (isSmsTrackingEnabled(email)) {
                runSmsScan(email);
            }
        };

        const handleSettingChanged = () => {
            const enabled = isSmsTrackingEnabled(email);
            setSmsTrackingEnabledState(enabled);
            if (enabled) {
                runSmsScan(email);
            } else {
                setPendingSmsQueue([]);
            }
        };

        window.addEventListener("nativeSmsPermissionResult", handlePermissionResult);
        window.addEventListener("nativeAppResumed", handleAppResumed);
        window.addEventListener("smsTrackingSettingChanged", handleSettingChanged);

        return () => {
            window.removeEventListener("nativeSmsPermissionResult", handlePermissionResult);
            window.removeEventListener("nativeAppResumed", handleAppResumed);
            window.removeEventListener("smsTrackingSettingChanged", handleSettingChanged);
        };
    }, [user, runSmsScan, showAlert, t]);

    const toggleShowArchived = () => {
        setShowArchived((prev) => {
            const next = !prev;
            localStorage.setItem("showArchived", next.toString());
            return next;
        });
    };

    const toggleSmsTracking = () => {
        if (!user?.email) return;
        const next = !smsTrackingEnabled;

        if (next) {
            if (window.Android && !window.Android.hasSmsPermission()) {
                window.Android.requestSmsPermission();
                return;
            }
            setSmsTrackingEnabled(user.email, true);
            setSmsTrackingEnabledState(true);
            showAlert(t("smsPopup.trackingEnabled"), "success");
            runSmsScan(user.email);
        } else {
            setSmsTrackingEnabled(user.email, false);
            setSmsTrackingEnabledState(false);
            setPendingSmsQueue([]);
            showAlert(t("smsPopup.trackingDisabled"), "info");
        }
    };

    const handleCommitSmsBatch = async (
        approved: StagedApprovedSmsTransaction[],
        dismissedSmsIds: string[]
    ) => {
        if (!user?.email) {
            setPendingSmsQueue([]);
            return;
        }

        const allProcessedIds = [
            ...approved.map((item) => item.smsId),
            ...dismissedSmsIds,
        ];

        try {
            setLoading(true);
            if (approved.length > 0) {
                await createExpensesBatch(
                    approved.map((item) => ({
                        reportId: item.reportId,
                        expenseTitle: item.expenseTitle,
                        expenseAmount: item.signedAmount,
                        authorEmail: user.email!,
                        authorDisplayName: user.displayName || user.email!,
                    }))
                );
            }

            if (allProcessedIds.length > 0) {
                markSmsProcessedBatch(user.email, allProcessedIds);
            }

            setPendingSmsQueue([]);

            if (approved.length > 0) {
                await fetchReports(user.email);
                showAlert(t("smsPopup.transactionAdded"), "success");
            }
        } catch (err) {
            console.error(err);
            showAlert(t("smsPopup.transactionAddError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSkipSmsForNow = () => {
        setPendingSmsQueue([]);
    };

    const handleAddReport = async (title: string, amount: number) => {
        try {
            setLoading(true);
            await createReport({ title, budget: amount });
            setIsModalOpen(false);

            if (auth.currentUser?.email) {
                await fetchReports(auth.currentUser.email);
            }
        } catch (err) {
            console.error(err);
            showAlert(t("reports.reportCreateError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            await signOut(auth);
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reports-container">
            <Alert alert={alert} />
            <Loader visible={loading} />

            {/* Top Navigation Bar */}
            <header className="reports-topbar">
                <div className="reports-user-chip">
                    {user?.photoURL ? (
                        <img
                            src={user.photoURL}
                            alt={user.displayName || "User"}
                            className="reports-profile-icon"
                        />
                    ) : (
                        <div className="reports-profile-fallback">
                            <FiUsers size={18} />
                        </div>
                    )}
                    {user?.displayName && (
                        <span className="reports-user-name">{user.displayName}</span>
                    )}
                </div>

                <ReportsHamburger
                    showArchived={showArchived}
                    toggleShowArchived={toggleShowArchived}
                    smsTrackingEnabled={smsTrackingEnabled}
                    toggleSmsTracking={toggleSmsTracking}
                    showContacts={() => setShowContacts(true)}
                    openTrash={() => navigate("/trash")}
                    showCategories={() => setShowCategories(true)}
                    handleLogout={handleLogout}
                />
            </header>

            <main className="reports-main">
                {/* Portfolio Overview Hero Card */}
                {activeReports.length > 0 && (
                    <section className="reports-overview-card">
                        <div className="overview-top-row">
                            <span className="overview-label">
                                {t("reports.totalBalanceLabel")}
                            </span>
                            <span className="overview-count-pill">
                                {t("reports.activeReportsCount", {
                                    count: activeReports.length,
                                })}
                            </span>
                        </div>

                        <div className="overview-balance-amount">
                            ₹{portfolioStats.totalRemaining.toLocaleString()}
                        </div>

                        <div className="overview-metrics-row">
                            <div className="overview-metric">
                                <span className="overview-metric-icon budget">
                                    <FiTrendingUp size={14} />
                                </span>
                                <div>
                                    <span className="overview-metric-label">
                                        {t("reports.totalBudgetLabel")}
                                    </span>
                                    <span className="overview-metric-value">
                                        ₹{portfolioStats.totalBudget.toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="overview-metric-divider" />

                            <div className="overview-metric">
                                <span className="overview-metric-icon spent">
                                    <FiTrendingDown size={14} />
                                </span>
                                <div>
                                    <span className="overview-metric-label">
                                        {t("reports.totalSpentLabel")}
                                    </span>
                                    <span className="overview-metric-value">
                                        ₹{portfolioStats.totalSpent.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="overview-progress-wrap">
                            <div className="overview-progress-track">
                                <div
                                    className="overview-progress-fill"
                                    style={{ width: `${portfolioStats.usedPercent}%` }}
                                />
                            </div>
                            <span className="overview-progress-text">
                                {t("reports.usedPercent", {
                                    percent: Math.round(portfolioStats.usedPercent),
                                })}
                            </span>
                        </div>
                    </section>
                )}

                {/* Section Header */}
                <div className="reports-section-header">
                    <h2 className="reports-title">{t("reports.title")}</h2>
                </div>

                {/* Reports List */}
                <div className="reports-list-container">
                    <div className="reports-list">
                        {reports.map((report) => {
                            const spent = calculateAmountSpent(report);
                            const effectiveBudget = calculateEffectiveBudget(report);
                            const remaining = effectiveBudget - spent;
                            const percentage =
                                effectiveBudget > 0
                                    ? Math.min((spent / effectiveBudget) * 100, 100)
                                    : 0;

                            let statusClass = "healthy";
                            if (percentage > 75) {
                                statusClass = "danger";
                            } else if (percentage > 50) {
                                statusClass = "warning";
                            }

                            const formattedDate = report.createdAt
                                ? new Date(report.createdAt).toLocaleDateString(
                                    locale === "hi" ? "hi-IN" : "en-US",
                                    {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                    }
                                )
                                : "";

                            const reportArchived = isArchived(
                                report.id,
                                archivedReports
                            );

                            return (
                                <div
                                    className={`report-card ${
                                        report.deleted ? "report-deleted" : ""
                                    } ${reportArchived ? "report-archived" : ""}`}
                                    key={report.id}
                                    onClick={() => navigate(`/reports/${report.id}`)}
                                >
                                    <div className="report-header">
                                        <div className="report-title-group">
                                            <div className={`report-icon-box ${statusClass}`}>
                                                <FiFolder size={18} />
                                            </div>
                                            <div className="report-title-meta">
                                                <h3 className="report-title">{report.title}</h3>
                                                {formattedDate && (
                                                    <span className="report-date">
                                                        {formattedDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="report-header-right">
                                            {report.deleted && (
                                                <span className="deleted-badge">
                                                    {t("reports.deletedBadge")}
                                                </span>
                                            )}
                                            {reportArchived && (
                                                <span className="archived-badge">
                                                    <FiArchive size={11} />{" "}
                                                    {t("reports.archivedBadge")}
                                                </span>
                                            )}
                                            {isShared(report, user?.email) && (
                                                <span className="shared-badge">
                                                    <FiShare2 size={12} />{" "}
                                                    {t("reports.sharedBadge")}
                                                </span>
                                            )}
                                            <FiChevronRight
                                                size={18}
                                                className="report-chevron"
                                            />
                                        </div>
                                    </div>

                                    <div className="report-metrics-grid">
                                        <div className="report-metric-box">
                                            <span className="report-metric-label">
                                                {t("reports.budgetLabel")}
                                            </span>
                                            <span className="report-metric-value">
                                                ₹{effectiveBudget.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="report-metric-box">
                                            <span className="report-metric-label">
                                                {t("reports.spentLabel")}
                                            </span>
                                            <span className="report-metric-value spent">
                                                ₹{spent.toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="report-metric-box">
                                            <span className="report-metric-label">
                                                {t("reports.remainingLabel")}
                                            </span>
                                            <span
                                                className={`report-metric-value ${remaining < 0 ? "over" : "remaining"
                                                    }`}
                                            >
                                                ₹{remaining.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="report-progress-footer">
                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${statusClass}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <span className={`report-percent-badge ${statusClass}`}>
                                            {t("reports.usedPercent", {
                                                percent: Math.round(percentage),
                                            })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {reports.length === 0 && (
                            <div className="no-reports-container">
                                <div className="no-reports-icon-circle">
                                    <FiFileText size={32} />
                                </div>
                                <p className="no-reports-text">{t("reports.noReports")}</p>
                                <p className="no-reports-subtext">
                                    {t("reports.noReportsSubtext")}
                                </p>
                                <button
                                    type="button"
                                    className="no-reports-cta"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    <FiPlus size={18} />
                                    {t("reports.createFirstButton")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Floating Add Button */}
            <button
                className="add-report-btn"
                aria-label={t("reports.addReportHeader")}
                onClick={() => setIsModalOpen(true)}
            >
                <FiPlus size={24} />
            </button>

            {/* Modal */}
            {isModalOpen && (
                <AmountModalInput
                    header={t("reports.addReportHeader")}
                    titlePlaceholder={t("reports.titlePlaceholder")}
                    amountPlaceholder={t("reports.amountPlaceholder")}
                    onReject={() => setIsModalOpen(false)}
                    onAccept={handleAddReport}
                />
            )}

            {pendingSmsQueue.length > 0 && activeReports.length > 0 && (
                <SmsTransactionPopup
                    queue={pendingSmsQueue}
                    activeReports={activeReports}
                    onCommitBatch={handleCommitSmsBatch}
                    onSkipForNow={handleSkipSmsForNow}
                />
            )}

            {showContacts && <Contacts onClose={() => setShowContacts(false)} />}
            {showCategories && <Categories onClose={() => setShowCategories(false)} />}
        </div>
    );
};

export default ReportsPage;

