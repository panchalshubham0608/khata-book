import VoiceInput from "./VoiceInput";
import "./AmountModalInput.css";
import { useState, useCallback } from "react";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import { parseHindiExpense } from "../utils/voiceInputUtils";
import { useTranslation } from "../i18n/locale";

interface AmountModalInputProps {
    header: string;
    titlePlaceholder?: string;
    amountPlaceholder: string;
    onAccept: (title: string, amount: number) => void;
    onReject: () => void;
}

const AmountModalInput = (props: AmountModalInputProps) => {
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();
    const [title, setTitle] = useState<string>("");
    const [amount, setAmount] = useState<string>("");

    const clearInputs = () => {
        setTitle("");
        setAmount("");
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
        props.onAccept(title, number);
        clearInputs();
    }, [title, amount, props.amountPlaceholder, props.titlePlaceholder, props.onAccept, props.onReject, showAlert, t]);

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
