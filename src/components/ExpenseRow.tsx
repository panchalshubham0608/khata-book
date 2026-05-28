import type { Expense, Category } from "../firebase/types";
import { useLongPress } from "../hooks/useLongPress";

interface ExpenseRowProps {
    expense: Expense
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
    const text = `hsl(${hue} 28% 12%)`;
    return { bg, border, text };
};

const ExpenseRow = (props: ExpenseRowProps) => {
    const { expense, onAction, categoryMap } = props;
    const longPress = useLongPress(onAction, { threshold: 900 });

    return (
        <div className={`expense-item ${expense.deleted ? "deleted" : ""}`} key={expense.id}
            {...longPress}
        >
            <div className="expense-info">
                <p className="expense-title">{expense.title}</p>
                <p className="expense-date">{new Date(expense.date).toLocaleDateString("hi-IN")}</p>
                {expense.authorDisplayName && <p className="expense-author">{expense.authorDisplayName}</p>}
            </div>
            {expense.categories && expense.categories.length > 0 && (
                <div className="expense-categories">
                    {
                        expense.categories.map((cid) => {
                            const cat = categoryMap[cid];
                            const name = cat ? cat.name : cid;
                            const c = colorFromName(name);
                            return (
                                <span key={cid} className="expense-category-chip" style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}>
                                    {name}
                                </span>
                            )
                        })
                    }
                </div>
            )}
            <p className={`expense-amount ${expense.amount < 0 ? 'debit' : 'credit'}`}>₹ {Math.abs(expense.amount).toLocaleString()}</p>
        </div>

    );
};

export default ExpenseRow;
