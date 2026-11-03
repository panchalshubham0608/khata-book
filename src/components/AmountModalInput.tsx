import VoiceInput from "./VoiceInput";
import "./AmountModalInput.css";
import { useState, useCallback, useEffect } from "react";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import { parseHindiExpense } from "../utils/voiceInputUtils";
import { useTranslation } from "../i18n/locale";
import { getCategories } from "../firebase/categoryService";
import type { Category } from "../firebase/types";
import { localDateInputToIso, toLocalDateInputValue } from "../utils/reportUtils";

interface AmountModalInputProps {
    header: string;
    titlePlaceholder?: string;
    amountPlaceholder: string;
    showCategories?: boolean;
    showDate?: boolean;
    onAccept: (title: string, amount: number, categories?: string[], date?: string) => void;
    onReject: () => void;
}

const AmountModalInput = (props: AmountModalInputProps) => {
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();
    const [title, setTitle] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [date, setDate] = useState<string>(() => toLocalDateInputValue());
    const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const clearInputs = () => {
        setTitle("");
        setAmount("");
        setDate(toLocalDateInputValue());
    }

    const handleVoiceInput = (value: string) => {
        const parsed = parseHindiExpense(value);
        if (parsed) {
            setTitle(parsed.title);
            setAmount(parsed.amount.toString());
        } else {
            setTitle(value);
        }
    }

    useEffect(() => {
        if (!props.showCategories) return;
        let mounted = true;
        (async () => {
            try {
                const cats = await getCategories();
                if (mounted) setAvailableCategories(cats);
            } catch (err) {
                // ignore silently
            }
        })();
        return () => { mounted = false };
    }, [props.showCategories]);

    const toggleCategory = (id: string) => {
        setSelectedCategories((prev) => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const handleAccept = useCallback(() => {
        if (props.titlePlaceholder && !title.trim()) {
            showAlert(t("amountModal.invalidTitle", { field: props.titlePlaceholder }), "error");
            return;
        }
        const number = Number(amount);
        if (!Number.isFinite(number) || number <= 0) {
            showAlert(t("amountModal.invalidAmount", { field: props.amountPlaceholder }), "error");
            return;
        }
        if (props.showDate && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
            showAlert(t("amountModal.invalidDate"), "error");
            return;
        }
        props.onAccept(
            title,
            number,
            selectedCategories.length ? selectedCategories : undefined,
            props.showDate ? localDateInputToIso(date) : undefined
        );
        clearInputs();
    }, [title, amount, date, selectedCategories, props.amountPlaceholder, props.titlePlaceholder, props.showDate, props.onAccept, props.onReject, showAlert, t]);

    const handleReject = useCallback(() => {
        clearInputs();
        props.onReject();
    }, [props]);


    return (
        <div className="modal-overlay">
            <Alert alert={alert} />
            <div className="modal-content">
                <h2>{props.header}</h2>
                <div>
                    {props.titlePlaceholder && <VoiceInput
                        placeholder={props.titlePlaceholder}
                        value={title}
                        onChange={handleVoiceInput} />}
                    <input
                        type="number"
                        placeholder={props.amountPlaceholder}
                        value={amount}
                        className="input-field"
                        onChange={(e) => setAmount(e.target.value)}
                    />
                    {props.showDate && (
                        <input
                            type="date"
                            value={date}
                            aria-label={t("amountModal.dateLabel")}
                            className="input-field"
                            onChange={(e) => setDate(e.target.value)}
                        />
                    )}
                    {props.showCategories && availableCategories.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div style={{ marginBottom: 8, fontSize: 'calc(14px * var(--font-scale, 1))', color: '#333' }}>{t("amountModal.selectCategories")}</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {availableCategories.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => toggleCategory(c.id)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: 999,
                                            border: selectedCategories.includes(c.id) ? '1px solid #2f80ed' : '1px solid #e0e0e0',
                                            background: selectedCategories.includes(c.id) ? '#eaf2ff' : '#fafafa',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={handleReject}>{t("amountModal.cancel")}</button>
                    <button className="btn-add" onClick={handleAccept}>{t("amountModal.add")}</button>
                </div>
            </div>
        </div>
    );
}

export default AmountModalInput;
