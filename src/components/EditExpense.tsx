
import { useState } from 'react';
import './EditExpense.css';
import VoiceInput from './VoiceInput';
import { FiX } from 'react-icons/fi';
import ConfirmDialog from './ConfirmDialog';
import { useAlert } from '../hooks/useAlert';
import Alert from './Alert';

interface EditExpenseProps {
    expenseTitle: string;
    expenseAmount: string;
    onCancel: () => void;
    onDelete: () => void;
    onEdit: (title: string, amount: number) => void;
}

const EditExpense = (props: EditExpenseProps) => {
    const { alert, showAlert } = useAlert();
    const [title, setTitle] = useState<string>(props.expenseTitle);
    const [amount, setAmount] = useState<string>(Math.abs(Number(props.expenseAmount)).toString());
    const [showDeleteExpenseDialog, setShowDeleteExpenseDialog] = useState<boolean>(false);

    const handleEdit = () => {
        if (!title.trim()) {
            showAlert("ख़र्च का नाम वैध नहीं है", "error");
            return;
        }

        const number = Number(amount);
        if (!Number.isFinite(number) || number <= 0) {
            showAlert("खर्च की राशि वैध नहीं है", "error");
            return;
        }

        let updatedAmount = Math.abs(number);
        // If original expense was negative, new value should be negative
        if (Number(props.expenseAmount) < 0) {
            updatedAmount = -1 * Math.abs(number);
        }

        props.onEdit(title.trim(), updatedAmount);
    }

    return (
        <div className="edit-expense-overlay">
            <Alert alert={alert} />
            <div className="edit-expense-container">
                <div className="edit-expense-header">
                    <h2>खर्चे में बदलाव करे</h2>
                    <button onClick={props.onCancel}>
                        <FiX fontSize={30}></FiX>
                    </button>
                </div>
                <div className='edit-expense-section'>
                    <VoiceInput
                        value={title}
                        onChange={setTitle}
                        placeholder="ख़र्च का नाम"
                    />
                    <input
                        type="number"
                        placeholder="खर्च की राशि"
                        value={amount}
                        className="input-field"
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div className="edit-expense-footer">
                    <div className="d-flex align-items-center justify-content-between">
                        <button className="btn-cancel" onClick={() => setShowDeleteExpenseDialog(true)}>हटाए </button>
                        <button className="btn-add" onClick={handleEdit}>बदले</button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={showDeleteExpenseDialog}
                title="खर्च हटाना चाहते हैं?"
                message="यह खर्च स्थायी रूप से हट जाएगा।"
                confirmText="हटाएँ"
                cancelText="रद्द करें"
                onConfirm={props.onDelete}
                onCancel={() => setShowDeleteExpenseDialog(false)}
            />

        </div>
    );
}

export default EditExpense;
