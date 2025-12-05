import type { Expense } from "../firebase/types";
import { useLongPress } from "../hooks/useLongPress";

interface ExpenseRowProps {
    expense: Expense
    onAction: () => void;
}

const ExpenseRow = (props: ExpenseRowProps) => {
    const { expense, onAction } = props;
    const longPress = useLongPress(onAction, { threshold: 650 });

    return (
        <div className={`expense-item ${expense.deleted && "deleted"}`} key={expense.id}
            {...longPress}
        >
            <div className="expense-info">
                <p className="expense-title">{expense.title}</p>
                <p className="expense-date">{new Date(expense.date).toLocaleDateString("hi-IN")}</p>
                {expense.authorDisplayName && <p className="expense-author">{expense.authorDisplayName}</p>}
            </div>
            <p className={`expense-amount ${expense.amount < 0 ? 'debit' : 'credit'}`}>₹ {Math.abs(expense.amount).toLocaleString()}</p>
        </div>

    );
};

export default ExpenseRow;
