import React, { useMemo, useState } from "react";
import {
    FiArrowDownLeft,
    FiArrowUpRight,
    FiCheck,
    FiChevronLeft,
    FiChevronRight,
    FiMic,
    FiRotateCcw,
    FiX,
} from "react-icons/fi";
import type { ExtractedGeminiExpense } from "../services/geminiAudioService";
import { localDateInputToIso } from "../utils/reportUtils";
import { useTranslation } from "../i18n/locale";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import "./GeminiExpenseCarousel.css";

export interface ApprovedGeminiExpense {
    title: string;
    signedAmount: number;
    dateIso: string;
}

interface GeminiExpenseCarouselProps {
    expenses: ExtractedGeminiExpense[];
    transcript: string;
    reportTitle: string;
    onCommitBatch: (approved: ApprovedGeminiExpense[]) => Promise<void> | void;
    onCancel: () => void;
}

interface CarouselItemState {
    id: string;
    title: string;
    amount: string;
    type: "debit" | "credit";
    date: string;
    decision: "pending" | "approved" | "rejected";
}

const GeminiExpenseCarousel: React.FC<GeminiExpenseCarouselProps> = ({
    expenses,
    transcript,
    reportTitle,
    onCommitBatch,
    onCancel,
}) => {
    const { t } = useTranslation();
    const { alert, showAlert } = useAlert();
    const [items, setItems] = useState<CarouselItemState[]>(() =>
        expenses.map((exp) => ({
            id: exp.id,
            title: exp.title,
            amount: String(exp.amount),
            type: exp.type,
            date: exp.date,
            decision: "pending",
        }))
    );
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [submitting, setSubmitting] = useState<boolean>(false);

    const totalCount = items.length;
    const isReviewStep = currentIndex >= totalCount;
    const currentItem = !isReviewStep ? items[currentIndex] : undefined;

    const approvedItems = useMemo(
        () => items.filter((item) => item.decision === "approved"),
        [items]
    );
    const rejectedCount = useMemo(
        () => items.filter((item) => item.decision === "rejected").length,
        [items]
    );

    const summary = useMemo(() => {
        let debitCount = 0;
        let debitTotal = 0;
        let creditCount = 0;
        let creditTotal = 0;

        for (const entry of items) {
            if (entry.decision === "rejected") continue;
            const num = Number(entry.amount) || 0;
            if (entry.type === "debit") {
                debitCount += 1;
                debitTotal += num;
            } else {
                creditCount += 1;
                creditTotal += num;
            }
        }

        return { debitCount, debitTotal, creditCount, creditTotal };
    }, [items]);

    if (totalCount === 0) {
        return null;
    }

    const updateCurrentItem = (patch: Partial<CarouselItemState>) => {
        setItems((prev) =>
            prev.map((entry, idx) =>
                idx === currentIndex ? { ...entry, ...patch } : entry
            )
        );
    };

    const handleApproveCurrent = () => {
        if (!currentItem || submitting) return;
        const trimmedTitle = currentItem.title.trim();
        if (!trimmedTitle) {
            showAlert(
                t("amountModal.invalidTitle", {
                    field: t("reportDetails.expenseNamePlaceholder"),
                }),
                "error"
            );
            return;
        }
        const parsedAmount = Number(currentItem.amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            showAlert(
                t("amountModal.invalidAmount", {
                    field: t("reportDetails.expenseAmountPlaceholder"),
                }),
                "error"
            );
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(currentItem.date.trim())) {
            showAlert(t("amountModal.invalidDate"), "error");
            return;
        }

        updateCurrentItem({
            title: trimmedTitle,
            amount: String(parsedAmount),
            decision: "approved",
        });
        setCurrentIndex((prev) => prev + 1);
    };

    const handleRejectCurrent = () => {
        if (!currentItem || submitting) return;
        updateCurrentItem({ decision: "rejected" });
        setCurrentIndex((prev) => prev + 1);
    };

    const handleReviewAgain = () => {
        if (submitting) return;
        setCurrentIndex(0);
    };

    const handleConfirmProceed = async () => {
        if (submitting) return;
        const payload: ApprovedGeminiExpense[] = approvedItems.map((entry) => {
            const num = Math.abs(Number(entry.amount));
            const signedAmount = entry.type === "debit" ? -num : num;
            return {
                title: entry.title.trim(),
                signedAmount,
                dateIso: localDateInputToIso(entry.date),
            };
        });

        try {
            setSubmitting(true);
            await onCommitBatch(payload);
        } finally {
            setSubmitting(false);
        }
    };

    if (isReviewStep) {
        return (
            <div className="gemini-carousel-overlay">
                <Alert alert={alert} />
                <Loader visible={submitting} />
                <div className="gemini-carousel-container">
                    <div className="gemini-carousel-topbar">
                        <div className="gemini-carousel-title-wrap">
                            <div className="gemini-carousel-icon-circle">
                                <FiCheck size={18} />
                            </div>
                            <div>
                                <h2 className="gemini-carousel-title">
                                    {t("smsPopup.summaryTitle")}
                                </h2>
                                <p className="gemini-carousel-subtitle">
                                    {t("gemini.reviewSummarySubtitle", {
                                        count: totalCount,
                                    })}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="gemini-carousel-skip-top"
                            onClick={onCancel}
                            disabled={submitting}
                        >
                            <FiX size={13} />
                            <span>{t("amountModal.cancel")}</span>
                        </button>
                    </div>

                    <div className="gemini-carousel-summary">
                        <div className="gemini-summary-pill credit">
                            <span className="gemini-summary-pill-icon">
                                <FiCheck size={15} />
                            </span>
                            <div className="gemini-summary-pill-text">
                                <span className="gemini-summary-pill-count">
                                    {t("smsPopup.acceptedCountLabel", {
                                        count: approvedItems.length,
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="gemini-summary-pill debit">
                            <span className="gemini-summary-pill-icon">
                                <FiX size={15} />
                            </span>
                            <div className="gemini-summary-pill-text">
                                <span className="gemini-summary-pill-count">
                                    {t("gemini.rejectedCountLabel", {
                                        count: rejectedCount,
                                    })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {approvedItems.length > 0 ? (
                        <div className="gemini-review-section">
                            <span className="gemini-review-header">
                                {t("gemini.approvedListHeader", {
                                    report: reportTitle,
                                })}
                            </span>
                            <div className="gemini-review-list">
                                {approvedItems.map((entry) => {
                                    const entryIsDebit = entry.type === "debit";
                                    const num = Math.abs(Number(entry.amount) || 0);
                                    const itemIdx = items.findIndex(
                                        (i) => i.id === entry.id
                                    );
                                    return (
                                        <div
                                            key={entry.id}
                                            className="gemini-review-item"
                                            onClick={() => {
                                                if (itemIdx >= 0 && !submitting) {
                                                    setCurrentIndex(itemIdx);
                                                }
                                            }}
                                        >
                                            <div className="gemini-review-item-info">
                                                <span className="gemini-review-item-title">
                                                    {entry.title}
                                                </span>
                                                <span className="gemini-review-item-meta">
                                                    {entry.date}
                                                </span>
                                            </div>
                                            <span
                                                className={`gemini-review-item-amount ${
                                                    entryIsDebit ? "debit" : "credit"
                                                }`}
                                            >
                                                {entryIsDebit ? "-" : "+"}₹
                                                {num.toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="gemini-review-empty">
                            {t("gemini.allRejectedNote")}
                        </div>
                    )}

                    <div className="gemini-carousel-actions">
                        <button
                            type="button"
                            className="gemini-carousel-btn dismiss"
                            onClick={handleReviewAgain}
                            disabled={submitting}
                        >
                            <FiRotateCcw size={15} />
                            {t("smsPopup.reviewBackButton")}
                        </button>
                        <button
                            type="button"
                            className="gemini-carousel-btn approve"
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

    if (!currentItem) return null;

    const isDebit = currentItem.type === "debit";
    const currentStep = currentIndex + 1;
    const numericPreview = Math.abs(Number(currentItem.amount) || 0);

    return (
        <div className="gemini-carousel-overlay">
            <Alert alert={alert} />
            <div className="gemini-carousel-container">
                {/* Top Header */}
                <div className="gemini-carousel-topbar">
                    <div className="gemini-carousel-title-wrap">
                        <div className="gemini-carousel-icon-circle">
                            <FiMic size={18} />
                        </div>
                        <div>
                            <h2 className="gemini-carousel-title">
                                {t("gemini.carouselTitle")}
                            </h2>
                            <p className="gemini-carousel-subtitle">
                                {t("gemini.carouselSubtitle", {
                                    count: totalCount,
                                })}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="gemini-carousel-skip-top"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        <FiX size={13} />
                        <span>{t("amountModal.cancel")}</span>
                    </button>
                </div>

                {/* Transcript Box */}
                {transcript && (
                    <div className="gemini-transcript-box">
                        <span className="gemini-transcript-label">
                            {t("gemini.heardLabel")}:
                        </span>{" "}
                        <span className="gemini-transcript-text">
                            “{transcript}”
                        </span>
                    </div>
                )}

                {/* Summary Bar */}
                <div className="gemini-carousel-summary">
                    <div className="gemini-summary-pill debit">
                        <span className="gemini-summary-pill-icon">
                            <FiArrowUpRight size={15} />
                        </span>
                        <div className="gemini-summary-pill-text">
                            <span className="gemini-summary-pill-count">
                                {t("smsPopup.debitCountLabel", {
                                    count: summary.debitCount,
                                })}
                            </span>
                            <span className="gemini-summary-pill-amount">
                                ₹{summary.debitTotal.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>

                    <div className="gemini-summary-pill credit">
                        <span className="gemini-summary-pill-icon">
                            <FiArrowDownLeft size={15} />
                        </span>
                        <div className="gemini-summary-pill-text">
                            <span className="gemini-summary-pill-count">
                                {t("smsPopup.creditCountLabel", {
                                    count: summary.creditCount,
                                })}
                            </span>
                            <span className="gemini-summary-pill-amount">
                                ₹{summary.creditTotal.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Carousel Step & Navigation Bar */}
                <div className="gemini-carousel-nav-row">
                    <button
                        type="button"
                        className="gemini-carousel-arrow"
                        disabled={currentIndex === 0}
                        aria-label="Previous expense"
                        onClick={() =>
                            setCurrentIndex((prev) => Math.max(0, prev - 1))
                        }
                    >
                        <FiChevronLeft size={16} />
                    </button>

                    <div className="gemini-carousel-dots">
                        {items.map((entry, idx) => {
                            const isCurrent = idx === currentIndex;
                            const statusClass =
                                entry.decision === "approved"
                                    ? "approved"
                                    : entry.decision === "rejected"
                                    ? "rejected"
                                    : "";
                            return (
                                <button
                                    key={entry.id}
                                    type="button"
                                    aria-label={`Expense ${idx + 1}`}
                                    className={`gemini-carousel-dot ${
                                        isCurrent ? "active" : ""
                                    } ${statusClass}`}
                                    onClick={() => setCurrentIndex(idx)}
                                />
                            );
                        })}
                    </div>

                    <div className="gemini-carousel-step-right">
                        <span className="gemini-carousel-step-text">
                            {currentStep} / {totalCount}
                        </span>
                        <button
                            type="button"
                            className="gemini-carousel-arrow"
                            aria-label="Next expense"
                            onClick={() =>
                                setCurrentIndex((prev) =>
                                    Math.min(totalCount, prev + 1)
                                )
                            }
                        >
                            <FiChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Current Expense Slide Card */}
                <div
                    className={`gemini-carousel-card ${
                        isDebit ? "debit" : "credit"
                    }`}
                >
                    <div className="gemini-carousel-card-top">
                        <div className="gemini-type-toggle">
                            <button
                                type="button"
                                className={`gemini-type-pill debit ${
                                    isDebit ? "active" : ""
                                }`}
                                onClick={() =>
                                    updateCurrentItem({ type: "debit" })
                                }
                            >
                                <FiArrowUpRight size={12} />
                                {t("smsPopup.debitBadge")}
                            </button>
                            <button
                                type="button"
                                className={`gemini-type-pill credit ${
                                    !isDebit ? "active" : ""
                                }`}
                                onClick={() =>
                                    updateCurrentItem({ type: "credit" })
                                }
                            >
                                <FiArrowDownLeft size={12} />
                                {t("smsPopup.creditBadge")}
                            </button>
                        </div>

                        <span
                            className={`gemini-carousel-amount ${
                                isDebit ? "debit" : "credit"
                            }`}
                        >
                            ₹{numericPreview.toLocaleString("en-IN")}
                        </span>
                    </div>

                    {currentItem.decision !== "pending" && (
                        <div
                            className={`gemini-decision-chip ${currentItem.decision}`}
                        >
                            {currentItem.decision === "approved"
                                ? t("gemini.statusApproved")
                                : t("gemini.statusRejected")}
                        </div>
                    )}

                    <div className="gemini-carousel-fields">
                        <div className="gemini-carousel-field">
                            <label className="gemini-carousel-label">
                                {t("smsPopup.titleLabel")}
                            </label>
                            <input
                                type="text"
                                className="gemini-carousel-input"
                                value={currentItem.title}
                                placeholder={t("smsPopup.titlePlaceholder")}
                                onChange={(e) =>
                                    updateCurrentItem({ title: e.target.value })
                                }
                            />
                        </div>

                        <div className="gemini-carousel-row-2col">
                            <div className="gemini-carousel-field">
                                <label className="gemini-carousel-label">
                                    {t("reportDetails.expenseAmountPlaceholder")}
                                </label>
                                <input
                                    type="number"
                                    className="gemini-carousel-input"
                                    value={currentItem.amount}
                                    placeholder="0"
                                    onChange={(e) =>
                                        updateCurrentItem({
                                            amount: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="gemini-carousel-field">
                                <label className="gemini-carousel-label">
                                    {t("amountModal.dateLabel")}
                                </label>
                                <input
                                    type="date"
                                    className="gemini-carousel-input"
                                    value={currentItem.date}
                                    onChange={(e) =>
                                        updateCurrentItem({
                                            date: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Approve / Reject Buttons */}
                <div className="gemini-carousel-actions">
                    <button
                        type="button"
                        className="gemini-carousel-btn dismiss"
                        onClick={handleRejectCurrent}
                        disabled={submitting}
                    >
                        <FiX size={16} />
                        {t("gemini.rejectButton")}
                    </button>
                    <button
                        type="button"
                        className="gemini-carousel-btn approve"
                        onClick={handleApproveCurrent}
                        disabled={submitting}
                    >
                        <FiCheck size={16} />
                        {t("gemini.approveButton")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GeminiExpenseCarousel;
