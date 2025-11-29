import VoiceInput from "./VoiceInput";
import "./AmountModalInput.css";

interface AmountModalInputProps {
    header: string;
    title: string;
    setTitle: (title: string) => void;
    titlePlaceholder: string;
    amount: string;
    setAmount: (amount: string) => void;
    amountPlaceholder: string;
    onAccept: () => void;
    onReject: () => void;
}

const AmountModalInput = (props: AmountModalInputProps) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>{props.header}</h2>
                <div>
                    <VoiceInput
                        placeholder={props.titlePlaceholder}
                        value={props.title}
                        onChange={props.setTitle} />
                    <input
                        type="number"
                        placeholder={props.amountPlaceholder}
                        value={props.amount}
                        className="input-field"
                        onChange={(e) => props.setAmount(e.target.value)}
                    />
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={props.onReject}>रद्द करें</button>
                    <button className="btn-add" onClick={props.onAccept}>जोड़ें</button>
                </div>
            </div>
        </div>
    );
}

export default AmountModalInput;
