import { useState, useEffect, useCallback, useMemo } from "react";
import { FiShare2, FiPlus, FiUsers, FiFileText } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AmountModalInput from "./AmountModalInput";
import { signOut, type User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./ReportsPage.css";
import type { Report } from "../firebase/types";
import { createExpensesBatch, createReport, getReports } from "../firebase/reportService";
import Categories from "./Categories";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { isShared, calculateAmountSpent, calculateTopupAmount } from "../utils/reportUtils";
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showDeleted, setShowDeleted] = useState<boolean>(() => {
        const stored = localStorage.getItem("showDeleted");
        return stored === "true"; // converts string "true" to boolean true, everything else is false
    });
    const [smsTrackingEnabled, setSmsTrackingEnabledState] = useState<boolean>(false);
    const [pendingSmsQueue, setPendingSmsQueue] = useState<PendingSmsTransaction[]>([]);
    const [showContacts, setShowContacts] = useState(false);
    const [showCategories, setShowCategories] = useState(false);
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();

    const activeReports = useMemo(
        () => reports.filter((r) => !r.deleted),
        [reports]
    );

    const fetchReports = useCallback(async (email: string) => {
        try {
            setLoading(true);
            const userReports = await getReports(email, { showDeleted });
            setReports(userReports);
        } catch (err) {
            console.error(err);
            showAlert(t("reports.reportLoadError"), "error");
        } finally {
            setLoading(false);
        }
    }, [showAlert, showDeleted, t]);

    const runSmsScan = useCallback(async (email: string) => {
        if (!isSmsTrackingEnabled(email)) return;
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

    const toggleShowDeleted = () => {
        setShowDeleted((prev) => {
            const next = !prev;
            localStorage.setItem("showDeleted", next.toString());
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
        // Clears the popup queue for the current session without marking messages as processed,
        // so future re-opens of the app will surface them again.
        setPendingSmsQueue([]);
    };

    const handleAddReport = async (title: string, amount: number) => {
        try {
            setLoading(true);
            await createReport({ title, budget: amount });
            setIsModalOpen(false);

            // Refetch reports after adding
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
            <ReportsHamburger
                showDeleted={showDeleted}
                toggleShowDeleted={toggleShowDeleted}
                smsTrackingEnabled={smsTrackingEnabled}
                toggleSmsTracking={toggleSmsTracking}
                showContacts={() => setShowContacts(true)}
                showCategories={() => setShowCategories(true)}
                handleLogout={handleLogout}
            />
            <div className="reports-topbar">
                {user?.photoURL && user?.displayName ?
                    <span className="reports-profile">
                        <img src={user.photoURL} className="reports-profile-icon" />
                    </span>
                    :
                    <FiUsers className="reports-profile-icon" />}
            </div>

            <h2 className="reports-title">{t("reports.title")}</h2>

            <div className="reports-list-container">
                <div className="reports-list">
                    {reports.map((report) => {
                        const percentage = Math.min((calculateAmountSpent(report) / (report.budget + calculateTopupAmount(report))) * 100, 100);
                        let progressColor = "#28a745";
                        if (percentage > 75) {
                            progressColor = "#dc3545";
                        } else if (percentage > 50) {
                            progressColor = "#ffc107";
                        }

                        return (
                            <div className={`report-card ${report.deleted && "report-deleted"}`} key={report.id} onClick={() => navigate(`/reports/${report.id}`)}>
                                <div className="report-header">
                                    <h3 className="report-title">{report.title}</h3>

                                    {isShared(report, user?.email) && (
                                        <span className="shared-badge">
                                            <FiShare2 size={14} /> {t("reports.sharedBadge")}
                                        </span>
                                    )}
                                </div>

                                <div className="report-info">
                                    <p className="report-budget">
                                        {t("reports.budgetLabel")} : ₹{report.budget.toLocaleString()}
                                    </p>
                                    <p className="report-spent">
                                        {t("reports.spentLabel")} : ₹{calculateAmountSpent(report).toLocaleString()}
                                    </p>
                                </div>

                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${percentage}%`, backgroundColor: progressColor }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                    {reports.length === 0 &&
                        <div className="no-reports-container">
                            <FiFileText size={48} className="no-reports-icon" />
                            <p className="no-reports-text">{t("reports.noReports")}</p>
                            <p className="no-reports-subtext">{t("reports.noReportsSubtext")}</p>
                        </div>}
                </div>
            </div>

            {/* Floating Add Button */}
            <button className="add-report-btn" onClick={() => setIsModalOpen(true)}>
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
