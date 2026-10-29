import { FiArrowDownLeft, FiArrowUpRight } from "react-icons/fi";
import type { Expense, Category } from "../firebase/types";
import { useLongPress } from "../hooks/useLongPress";
import { useTranslation } from "../i18n/locale";

interface ExpenseRowProps {
    expense: Expense;
    onAction: () => void;
    categoryMap: Record<string, Category>;
}

const colorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    const bg = `hsl(${hue} 70% 94%)`;
    const border = `hsl(${hue} 70% 86%)`;
    const text = `hsl(${hue} 28% 18%)`;
    return { bg, border, text };
};

const ExpenseRow = (props: ExpenseRowProps) => {
    const { expense, onAction, categoryMap } = props;
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
                {expense.categories && expense.categories.length > 0 && (
                    <div className="expense-categories">
                        {expense.categories.map((cid) => {
                            const cat = categoryMap[cid];
                            const name = cat ? cat.name : cid;
                            const c = colorFromName(name);
                            return (
                                <span
                                    key={cid}
                                    className="expense-category-chip"
                                    style={{
                                        backgroundColor: c.bg,
                                        borderColor: c.border,
                                        color: c.text,
                                    }}
                                >
                                    {name}
                                </span>
                            );
                        })}
                    </div>
                )}
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

