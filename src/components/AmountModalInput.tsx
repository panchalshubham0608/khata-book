import VoiceInput from "./VoiceInput";
import "./AmountModalInput.css";
import { useState, useCallback } from "react";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import { parseHindiExpense } from "../utils/voiceInputUtils";

interface AmountModalInputProps {
    header: string;
    titlePlaceholder?: string;
    amountPlaceholder: string;
    onAccept: (title: string, amount: number) => void;
    onReject: () => void;
}

const AmountModalInput = (props: AmountModalInputProps) => {
    const { alert, showAlert } = useAlert();
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
            showAlert(props.titlePlaceholder + " वैध नहीं है", "error");
            return;
        }
        const number = Number(amount);
        if (!Number.isFinite(number) || number <= 0) {
            showAlert(props.amountPlaceholder + " वैध नहीं है", "error");
            return;
        }
        props.onAccept(title, number);
        clearInputs();
    }, [title, amount]);

    const handleReject = useCallback(() => {
        clearInputs();
        props.onReject();
    }, []);


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
                    <button className="btn-cancel" onClick={handleReject}>रद्द करें</button>
                    <button className="btn-add" onClick={handleAccept}>जोड़ें</button>
                </div>
            </div>
        </div>
    );
}

export default AmountModalInput;
