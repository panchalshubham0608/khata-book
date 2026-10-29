import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import type { Expense } from "../firebase/types";
import { useLongPress } from "../hooks/useLongPress";
import { useTranslation } from "../i18n/locale";

interface ExpenseRowProps {
    expense: Expense;
    onAction: () => void;
}

const ExpenseRow = (props: ExpenseRowProps) => {
    const { expense, onAction } = props;
    const { locale } = useTranslation();
    const longPress = useLongPress(onAction, { threshold: 650 });

    const isDebit = expense.amount < 0;
    const formattedDate = new Date(expense.date).toLocaleDateString(
        locale === "hi" ? "hi-IN" : "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    );

    return (
        <div
            className={`expense-item ${expense.deleted ? "deleted" : ""}`}
            key={expense.id}
            {...longPress}
        >
            <div className={`expense-type-icon ${isDebit ? "debit" : "credit"}`}>
                {isDebit ? (
                    <FiArrowUpRight size={18} />
                ) : (
                    <FiArrowDownLeft size={18} />
                )}
            </div>

            <div className="expense-info">
                <p className="expense-title">{expense.title}</p>
                <div className="expense-meta-row">
                    <span className="expense-date">{formattedDate}</span>
                    {expense.authorDisplayName && (
                        <>
                            <span className="expense-meta-dot" aria-hidden="true">
                                •
                            </span>
                            <span className="expense-author">
                                {expense.authorDisplayName}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="expense-amount-wrap">
                <p className={`expense-amount ${isDebit ? "debit" : "credit"}`}>
                    {isDebit ? "-" : "+"}₹
                    {Math.abs(expense.amount).toLocaleString("en-IN")}
                </p>
            </div>
        </div>
    );
};

export default ExpenseRow;

