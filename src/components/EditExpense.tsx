
import { useState } from 'react';
import './EditExpense.css';
import VoiceInput from './VoiceInput';
import { FiX } from 'react-icons/fi';
import ConfirmDialog from './ConfirmDialog';
import { useAlert } from '../hooks/useAlert';
import Alert from './Alert';
import { useTranslation } from '../i18n/locale';

interface EditExpenseProps {
    expenseTitle: string;
    expenseAmount: string;
    onCancel: () => void;
    onDelete: () => void;
    onEdit: (title: string, amount: number) => void;
}

const EditExpense = (props: EditExpenseProps) => {
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();
    const [title, setTitle] = useState<string>(props.expenseTitle);
    const [amount, setAmount] = useState<string>(Math.abs(Number(props.expenseAmount)).toString());
    const [showDeleteExpenseDialog, setShowDeleteExpenseDialog] = useState<boolean>(false);

    const handleEdit = () => {
        if (!title.trim()) {
            showAlert(t("editExpense.invalidName"), "error");
            return;
        }

        const number = Number(amount);
        if (!Number.isFinite(number) || number <= 0) {
            showAlert(t("editExpense.invalidAmount"), "error");
            return;
        }

        let updatedAmount = Math.abs(number);
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
                    <h2>{t("editExpense.header")}</h2>
                    <button onClick={props.onCancel}>
                        <FiX fontSize={30}></FiX>
                    </button>
                </div>
                <div className='edit-expense-section'>
                    <VoiceInput
                        value={title}
                        onChange={setTitle}
                        placeholder={t("editExpense.namePlaceholder")}
                    />
                    <input
                        type="number"
                        placeholder={t("editExpense.amountPlaceholder")}
                        value={amount}
                        className="input-field"
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>
                <div className="edit-expense-footer">
                    <div className="d-flex align-items-center justify-content-between">
                        <button className="btn-cancel" onClick={() => setShowDeleteExpenseDialog(true)}>{t("editExpense.deleteButton")}</button>
                        <button className="btn-add" onClick={handleEdit}>{t("editExpense.saveButton")}</button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={showDeleteExpenseDialog}
                title={t("editExpense.deleteConfirmTitle")}
                message={t("editExpense.deleteConfirmMessage")}
                confirmText={t("editExpense.deleteConfirmConfirmText")}
                cancelText={t("editExpense.deleteConfirmCancelText")}
                onConfirm={props.onDelete}
                onCancel={() => setShowDeleteExpenseDialog(false)}
            />

        </div>
    );
}

export default EditExpense;
