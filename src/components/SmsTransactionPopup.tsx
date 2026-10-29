import React, { useMemo, useState } from "react";
import {
    FiArrowDownLeft,
    FiArrowUpRight,
    FiCheck,
    FiMessageSquare,
    FiRotateCcw,
    FiX,
} from "react-icons/fi";
import type { Report } from "../firebase/types";
import type {
    PendingSmsTransaction,
    StagedApprovedSmsTransaction,
} from "../services/smsTrackingService";
import { useTranslation } from "../i18n/locale";
import Loader from "./Loader";
import "./SmsTransactionPopup.css";

interface SmsTransactionPopupProps {
    queue: PendingSmsTransaction[];
    activeReports: Report[];
    onCommitBatch: (
        approved: StagedApprovedSmsTransaction[],
        dismissedSmsIds: string[]
    ) => Promise<void> | void;
    onSkipForNow: () => void;
}

const SmsTransactionPopup: React.FC<SmsTransactionPopupProps> = ({
    queue,
    activeReports,
    onCommitBatch,
    onSkipForNow,
}) => {
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [approvedItems, setApprovedItems] = useState<StagedApprovedSmsTransaction[]>([]);
    const [dismissedSmsIds, setDismissedSmsIds] = useState<string[]>([]);

    const remainingQueue = useMemo(
        () => queue.slice(currentIndex),
        [queue, currentIndex]
    );
    const isReviewStep = currentIndex >= queue.length;
    const item = queue[currentIndex];

    const summary = useMemo(() => {
        let debitCount = 0;
        let debitTotal = 0;
        let creditCount = 0;
        let creditTotal = 0;

        for (const entry of remainingQueue) {
            if (entry.transaction.type === "debit") {
                debitCount += 1;
                debitTotal += entry.transaction.amount;
            } else {
                creditCount += 1;
                creditTotal += entry.transaction.amount;
            }
        }

        return { debitCount, debitTotal, creditCount, creditTotal };
    }, [remainingQueue]);

    const reportTitleById = useMemo(() => {
        const map: Record<string, string> = {};
        for (const report of activeReports) {
            map[report.id] = report.title;
        }
        return map;
    }, [activeReports]);

    const isDebit = item?.transaction.type === "debit";
    const defaultTitle =
        item?.transaction.title ||
        (isDebit ? t("smsPopup.defaultDebitTitle") : t("smsPopup.defaultCreditTitle"));

    const [prevSmsId, setPrevSmsId] = useState<string | undefined>(item?.sms.id);
    const [title, setTitle] = useState<string>(defaultTitle);
    const [selectedReportId, setSelectedReportId] = useState<string>(
        activeReports[0]?.id || ""
    );
    const [submitting, setSubmitting] = useState<boolean>(false);

    if (item && item.sms.id !== prevSmsId) {
        setPrevSmsId(item.sms.id);
        setTitle(defaultTitle);
    }

    if (queue.length === 0 || activeReports.length === 0) {
        return null;
    }

    const totalCount = queue.length;
    const currentStep = Math.min(currentIndex + 1, totalCount);

    const singleReport = activeReports.length === 1 ? activeReports[0] : null;
    const effectiveSelectedReportId =
        selectedReportId && activeReports.some((r) => r.id === selectedReportId)
            ? selectedReportId
            : activeReports[0]?.id || "";
    const targetReportId = singleReport ? singleReport.id : effectiveSelectedReportId;

    const handleAcceptItem = () => {
        if (!item || !targetReportId || submitting) return;
        const finalTitle = title.trim() || defaultTitle;
        const signedAmount = isDebit
            ? -Math.abs(item.transaction.amount)
            : Math.abs(item.transaction.amount);

        const nextApproved: StagedApprovedSmsTransaction = {
            smsId: item.sms.id,
            reportId: targetReportId,
            expenseTitle: finalTitle,
            signedAmount,
        };

        setApprovedItems((prev) => [...prev, nextApproved]);
        setCurrentIndex((prev) => prev + 1);
    };

    const handleIgnoreItem = () => {
        if (!item || submitting) return;
        setDismissedSmsIds((prev) => [...prev, item.sms.id]);
        setCurrentIndex((prev) => prev + 1);
    };

    const handleReviewAgain = () => {
        if (submitting) return;
        setApprovedItems([]);
        setDismissedSmsIds([]);
        setCurrentIndex(0);
    };

    const handleConfirmProceed = async () => {
        if (submitting) return;
        try {
            setSubmitting(true);
            await onCommitBatch(approvedItems, dismissedSmsIds);
        } finally {
            setSubmitting(false);
        }
    };

    if (isReviewStep) {
        return (
            <div className="sms-popup-overlay">
                <Loader visible={submitting} />
                <div className="sms-popup-container">
                    {/* Top Header + Skip For Now */}
                    <div className="sms-popup-topbar">
                        <div className="sms-popup-title-wrap">
                            <div className="sms-popup-icon-circle">
                                <FiCheck size={18} />
                            </div>
                            <div>
                                <h2 className="sms-popup-title">
                                    {t("smsPopup.summaryTitle")}
                                </h2>
                                <p className="sms-popup-subtitle">
                                    {t("smsPopup.summarySubtitle", { count: totalCount })}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="sms-popup-skip-top"
                            onClick={onSkipForNow}
                            disabled={submitting}
                        >
                            {t("smsPopup.skipForNow")}
                        </button>
                    </div>

                    {/* Accepted vs Ignored Summary Pills */}
                    <div className="sms-popup-summary">
                        <div className="sms-summary-pill credit">
                            <span className="sms-summary-pill-icon">
                                <FiCheck size={15} />
                            </span>
                            <div className="sms-summary-pill-text">
                                <span className="sms-summary-pill-amount">
                                    {t("smsPopup.acceptedCountLabel", {
                                        count: approvedItems.length,
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="sms-summary-pill debit">
                            <span className="sms-summary-pill-icon">
                                <FiX size={15} />
                            </span>
                            <div className="sms-summary-pill-text">
                                <span className="sms-summary-pill-amount">
                                    {t("smsPopup.dismissedCountLabel", {
                                        count: dismissedSmsIds.length,
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Accepted Transactions Breakdown */}
                    {approvedItems.length > 0 ? (
                        <div className="sms-review-section">
                            <span className="sms-review-header">
                                {t("smsPopup.acceptedListHeader")}
                            </span>
                            <div className="sms-review-list">
                                {approvedItems.map((entry) => {
                                    const entryIsDebit = entry.signedAmount < 0;
                                    return (
                                        <div key={entry.smsId} className="sms-review-item">
                                            <div className="sms-review-item-info">
                                                <span className="sms-review-item-title">
                                                    {entry.expenseTitle}
                                                </span>
                                                <span className="sms-review-item-report">
                                                    {t("smsPopup.singleReportNote", {
                                                        report:
                                                            reportTitleById[entry.reportId] ||
                                                            "",
                                                    })}
                                                </span>
                                            </div>
                                            <span
                                                className={`sms-review-item-amount ${
                                                    entryIsDebit ? "debit" : "credit"
                                                }`}
                                            >
                                                ₹{Math.abs(entry.signedAmount).toLocaleString()}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="sms-review-empty">
                            {t("smsPopup.allDismissedNote", { count: totalCount })}
                        </div>
                    )}

                    {/* Confirm Actions */}
                    <div className="sms-popup-actions">
                        <button
                            type="button"
                            className="sms-popup-btn sms-popup-btn-dismiss"
                            onClick={handleReviewAgain}
                            disabled={submitting}
                        >
                            <FiRotateCcw size={15} />
                            {t("smsPopup.reviewBackButton")}
                        </button>
                        <button
                            type="button"
                            className="sms-popup-btn sms-popup-btn-add"
                            onClick={handleConfirmProceed}
                            disabled={submitting}
                        >
                            <FiCheck size={16} />
                            {t("smsPopup.confirmProceedButton")}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!item) {
        return null;
    }

    const formattedTime = item.sms.timestamp
        ? new Date(item.sms.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
          })
        : "";

    return (
        <div className="sms-popup-overlay">
            <div className="sms-popup-container">
                {/* Top Header + Skip For Now */}
                <div className="sms-popup-topbar">
                    <div className="sms-popup-title-wrap">
                        <div className="sms-popup-icon-circle">
                            <FiMessageSquare size={18} />
                        </div>
                        <div>
                            <h2 className="sms-popup-title">{t("smsPopup.title")}</h2>
                            <p className="sms-popup-subtitle">
                                {t("smsPopup.detectedSummary", { count: remainingQueue.length })}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="sms-popup-skip-top"
                        onClick={onSkipForNow}
                        disabled={submitting}
                    >
                        {t("smsPopup.skipForNow")}
                    </button>
                </div>

                {/* Auto-Detected Credit / Debit Summary Bar */}
                <div className="sms-popup-summary">
                    <div className="sms-summary-pill debit">
                        <span className="sms-summary-pill-icon">
                            <FiArrowUpRight size={15} />
                        </span>
                        <div className="sms-summary-pill-text">
                            <span className="sms-summary-pill-count">
                                {t("smsPopup.debitCountLabel", { count: summary.debitCount })}
                            </span>
                            <span className="sms-summary-pill-amount">
                                ₹{summary.debitTotal.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="sms-summary-pill credit">
                        <span className="sms-summary-pill-icon">
                            <FiArrowDownLeft size={15} />
                        </span>
                        <div className="sms-summary-pill-text">
                            <span className="sms-summary-pill-count">
                                {t("smsPopup.creditCountLabel", { count: summary.creditCount })}
                            </span>
                            <span className="sms-summary-pill-amount">
                                ₹{summary.creditTotal.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Step Progress Indicator */}
                {totalCount > 1 && (
                    <div className="sms-popup-progress-row">
                        <div className="sms-popup-dots">
                            {Array.from({ length: totalCount }).map((_, idx) => {
                                const stepNum = idx + 1;
                                const stateClass =
                                    stepNum === currentStep
                                        ? "active"
                                        : stepNum < currentStep
                                        ? "done"
                                        : "";
                                return (
                                    <span
                                        key={idx}
                                        className={`sms-popup-dot ${stateClass}`}
                                    />
                                );
                            })}
                        </div>
                        <span className="sms-popup-step-text">
                            {currentStep} / {totalCount}
                        </span>
                    </div>
                )}

                {/* Current Transaction Card */}
                <div className={`sms-popup-card ${isDebit ? "debit" : "credit"}`}>
                    <div className="sms-popup-card-top">
                        <span className={`sms-popup-badge ${isDebit ? "debit" : "credit"}`}>
                            {isDebit ? (
                                <FiArrowUpRight size={13} />
                            ) : (
                                <FiArrowDownLeft size={13} />
                            )}
                            {isDebit ? t("smsPopup.debitBadge") : t("smsPopup.creditBadge")}
                        </span>
                        <span className={`sms-popup-amount ${isDebit ? "debit" : "credit"}`}>
                            ₹{item.transaction.amount.toLocaleString()}
                        </span>
                    </div>

                    <div className="sms-popup-message-box">
                        <div className="sms-popup-sender-row">
                            {item.sms.sender && (
                                <span className="sms-popup-sender">{item.sms.sender}</span>
                            )}
                            {formattedTime && (
                                <span className="sms-popup-time">{formattedTime}</span>
                            )}
                        </div>
                        <div>{item.sms.body}</div>
                    </div>
                </div>

                {/* Editable Description */}
                <div className="sms-popup-field">
                    <label className="sms-popup-label">{t("smsPopup.titleLabel")}</label>
                    <input
                        type="text"
                        className="sms-popup-input"
                        value={title}
                        placeholder={t("smsPopup.titlePlaceholder")}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Target Report Selection */}
                {singleReport ? (
                    <div className="sms-popup-single-report">
                        <span>{t("smsPopup.selectReportLabel")}</span>
                        <strong>{singleReport.title}</strong>
                    </div>
                ) : (
                    <div className="sms-popup-field">
                        <label className="sms-popup-label">
                            {t("smsPopup.selectReportLabel")}
                        </label>
                        <select
                            className="sms-popup-select"
                            value={effectiveSelectedReportId}
                            onChange={(e) => setSelectedReportId(e.target.value)}
                        >
                            {activeReports.map((report) => (
                                <option key={report.id} value={report.id}>
                                    {report.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="sms-popup-actions">
                    <button
                        type="button"
                        className="sms-popup-btn sms-popup-btn-dismiss"
                        onClick={handleIgnoreItem}
                        disabled={submitting}
                    >
                        <FiX size={16} />
                        {t("smsPopup.dismissButton")}
                    </button>
                    <button
                        type="button"
                        className="sms-popup-btn sms-popup-btn-add"
                        onClick={handleAcceptItem}
                        disabled={submitting || !targetReportId}
                    >
                        <FiCheck size={16} />
                        {t("smsPopup.addButton")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SmsTransactionPopup;


