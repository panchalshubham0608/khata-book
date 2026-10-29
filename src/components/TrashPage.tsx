import { useState, useEffect, useCallback } from "react";
import {
    FiTrash2,
    FiRotateCcw,
    FiShare2,
    FiChevronRight,
    FiClock,
    FiFolder,
    FiAlertCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { type User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import type { Report } from "../firebase/types";
import {
    emptyTrash,
    getDeletedReports,
    restoreReport,
} from "../firebase/reportService";
import {
    isShared,
    isOwner,
    getRemainingDays,
    calculateAmountSpent,
    calculateEffectiveBudget,
} from "../utils/reportUtils";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import ConfirmDialog from "./ConfirmDialog";
import { useTranslation } from "../i18n/locale";
import "./TrashPage.css";

const TrashPage = () => {
    const navigate = useNavigate();
    const { alert, showAlert } = useAlert();
    const { t, locale } = useTranslation();

    const [user, setUser] = useState<User | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [restoreTarget, setRestoreTarget] = useState<Report | null>(null);
    const [confirmEmptyOpen, setConfirmEmptyOpen] = useState<boolean>(false);

    const fetchDeletedReports = useCallback(
        async (email: string) => {
            try {
                setLoading(true);
                const deleted = await getDeletedReports(email);
                setReports(deleted);
            } catch (err) {
                console.error(err);
                showAlert(t("reports.reportLoadError"), "error");
            } finally {
                setLoading(false);
            }
        },
        [showAlert, t]
    );

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            if (currentUser?.email) {
                setUser(currentUser);
                fetchDeletedReports(currentUser.email);
            } else {
                setReports([]);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [fetchDeletedReports]);

    const handleConfirmRestore = async () => {
        if (!restoreTarget || !user?.email) return;
        const targetId = restoreTarget.id;
        setRestoreTarget(null);

        try {
            setLoading(true);
            await restoreReport(targetId);
            setReports((prev) => prev.filter((r) => r.id !== targetId));
            showAlert(t("trash.restoreSuccess"), "success");
        } catch (err) {
            console.error(err);
            showAlert(t("trash.restoreError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmEmptyTrash = async () => {
        if (!user?.email || reports.length === 0) return;
        setConfirmEmptyOpen(false);

        try {
            setLoading(true);
            await emptyTrash(user.email, reports);
            setReports([]);
            showAlert(t("trash.emptySuccess"), "success");
        } catch (err) {
            console.error(err);
            showAlert(t("trash.emptyError"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="trash-container">
            <Alert alert={alert} />
            <Loader visible={loading} />

            <main className="trash-main">
                {/* Hero Header Card */}
                <section className="trash-hero-card">
                    <div className="trash-hero-top">
                        <div className="trash-hero-title-wrap">
                            <span className="trash-hero-icon">
                                <FiTrash2 size={20} />
                            </span>
                            <div>
                                <h1 className="trash-hero-title">
                                    {t("trash.title")}
                                </h1>
                                <p className="trash-hero-subtitle">
                                    {t("trash.subtitle")}
                                </p>
                            </div>
                        </div>

                        <span className="trash-count-pill">
                            {t("trash.deletedCount", {
                                count: reports.length,
                            })}
                        </span>
                    </div>

                    <div className="trash-retention-banner">
                        <div className="trash-retention-info">
                            <FiAlertCircle
                                size={15}
                                className="trash-retention-icon"
                            />
                            <span>{t("trash.retentionNote")}</span>
                        </div>
                        {reports.length > 0 && (
                            <button
                                type="button"
                                className="trash-empty-btn"
                                onClick={() => setConfirmEmptyOpen(true)}
                            >
                                <FiTrash2 size={13} />
                                <span>{t("trash.emptyTrashButton")}</span>
                            </button>
                        )}
                    </div>
                </section>

                {/* Deleted Reports List */}
                <section className="trash-list-section">
                    <div className="trash-list">
                        {reports.map((report) => {
                            const spent = calculateAmountSpent(report);
                            const effectiveBudget = calculateEffectiveBudget(report);
                            const remaining = effectiveBudget - spent;
                            const canRestore = Boolean(
                                isOwner(report, user?.email)
                            );
                            const remainingDays = report.deletedAt
                                ? getRemainingDays(report.deletedAt)
                                : 60;

                            const formattedDate = report.createdAt
                                ? new Date(report.createdAt).toLocaleDateString(
                                      locale === "hi" ? "hi-IN" : "en-IN",
                                      {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                      }
                                  )
                                : "";

                            return (
                                <div
                                    key={report.id}
                                    className="trash-report-card"
                                    onClick={() =>
                                        navigate(`/reports/${report.id}`)
                                    }
                                >
                                    <div className="trash-card-header">
                                        <div className="trash-card-title-group">
                                            <div className="trash-card-icon-box">
                                                <FiFolder size={18} />
                                            </div>
                                            <div className="trash-card-title-meta">
                                                <h3 className="trash-card-title">
                                                    {report.title}
                                                </h3>
                                                {formattedDate && (
                                                    <span className="trash-card-date">
                                                        {formattedDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="trash-card-header-right">
                                            <span className="trash-days-badge">
                                                <FiClock size={11} />
                                                {t("trash.daysLeftBadge", {
                                                    days: remainingDays,
                                                })}
                                            </span>
                                            {isShared(report, user?.email) && (
                                                <span className="trash-shared-badge">
                                                    <FiShare2 size={11} />
                                                    {t("reports.sharedBadge")}
                                                </span>
                                            )}
                                            <FiChevronRight
                                                size={18}
                                                className="trash-card-chevron"
                                            />
                                        </div>
                                    </div>

                                    <div className="trash-metrics-grid">
                                        <div className="trash-metric-box">
                                            <span className="trash-metric-label">
                                                {t("reports.budgetLabel")}
                                            </span>
                                            <span className="trash-metric-value">
                                                ₹{effectiveBudget.toLocaleString("en-IN")}
                                            </span>
                                        </div>

                                        <div className="trash-metric-box">
                                            <span className="trash-metric-label">
                                                {t("reports.spentLabel")}
                                            </span>
                                            <span className="trash-metric-value spent">
                                                ₹{spent.toLocaleString("en-IN")}
                                            </span>
                                        </div>

                                        <div className="trash-metric-box">
                                            <span className="trash-metric-label">
                                                {t("reports.remainingLabel")}
                                            </span>
                                            <span
                                                className={`trash-metric-value ${
                                                    remaining < 0
                                                        ? "over"
                                                        : "remaining"
                                                }`}
                                            >
                                                ₹{remaining.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    </div>

                                    {canRestore && (
                                        <div className="trash-card-footer">
                                            <button
                                                type="button"
                                                className="trash-restore-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRestoreTarget(report);
                                                }}
                                            >
                                                <FiRotateCcw size={14} />
                                                <span>
                                                    {t("trash.restoreButton")}
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {reports.length === 0 && !loading && (
                            <div className="no-reports-container">
                                <div className="no-reports-icon-circle">
                                    <FiTrash2 size={28} />
                                </div>
                                <p className="no-reports-text">
                                    {t("trash.emptyTitle")}
                                </p>
                                <p className="no-reports-subtext">
                                    {t("trash.emptySubtext")}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <ConfirmDialog
                open={Boolean(restoreTarget)}
                variant="primary"
                title={t("trash.restoreConfirmTitle")}
                message={t("trash.restoreConfirmMessage")}
                confirmText={t("trash.restoreConfirmConfirmText")}
                cancelText={t("trash.restoreConfirmCancelText")}
                onConfirm={handleConfirmRestore}
                onCancel={() => setRestoreTarget(null)}
            />

            <ConfirmDialog
                open={confirmEmptyOpen}
                variant="danger"
                title={t("trash.emptyConfirmTitle")}
                message={t("trash.emptyConfirmMessage")}
                confirmText={t("trash.emptyConfirmConfirmText")}
                cancelText={t("trash.emptyConfirmCancelText")}
                onConfirm={handleConfirmEmptyTrash}
                onCancel={() => setConfirmEmptyOpen(false)}
            />
        </div>
    );
};

export default TrashPage;
