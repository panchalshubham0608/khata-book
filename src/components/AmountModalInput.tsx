import VoiceInput from "./VoiceInput";
import "./AmountModalInput.css";
import { useState, useCallback } from "react";

interface AmountModalInputProps {
    header: string;
    titlePlaceholder: string;
    amountPlaceholder: string;
    onAccept: (title: string, amount: string) => void;
    onReject: () => void;
}

const AmountModalInput = (props: AmountModalInputProps) => {
    const [title, setTitle] = useState<string>("");
    const [amount, setAmount] = useState<string>("");

    const clearInputs = () => {
        setTitle("");
        setAmount("");
    }

    const handleAccept = useCallback(() => {
        props.onAccept(title, amount);
        clearInputs();
    }, [title, amount]);

    const handleReject = useCallback(() => {
        clearInputs();
        props.onReject();
    }, []);


    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{props.header}</h2>
                <div>
                    <VoiceInput
                        placeholder={props.titlePlaceholder}
                        value={title}
                        onChange={setTitle} />
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
