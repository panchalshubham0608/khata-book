import React, { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "./Categories.css";
import { addCategory, getCategories, deleteCategory } from "../firebase/categoryService";
import type { Category } from "../firebase/types";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { useTranslation } from "../i18n/locale";

interface CategoriesProps {
    onClose: () => void;
}

const Categories: React.FC<CategoriesProps> = ({ onClose }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [name, setName] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [showRemoveCategory, setShowRemoveCategory] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedCategories = await getCategories();
            setCategories(fetchedCategories);
        } catch (err) {
            console.error(err);
            showAlert(t("categories.loadError"), "error");
        } finally {
            setLoading(false);
        }
    }, [showAlert, t]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleAdd = async () => {
        const trimmed = name.trim();
        if (!trimmed) {
            showAlert(t("categories.invalidName"), "error");
            return;
        }

        try {
            setLoading(true);
            await addCategory(trimmed);
            showAlert(t("categories.addSuccess"), "success");
            setName("");
            await fetchCategories();
        } catch (err) {
            console.error(err);
            showAlert(t("categories.addError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (categoryId: string) => {
        try {
            setLoading(true);
            await deleteCategory(categoryId);
            showAlert(t("categories.deleteSuccess"), "success");
            await fetchCategories();
        } catch (err) {
            console.error(err);
            showAlert(t("categories.deleteError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const colorFromName = (name: string) => {
        // simple deterministic hash to hue
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
            hash = hash & hash; // keep in 32bit
        }
        const hue = Math.abs(hash) % 360;
        const bg = `hsl(${hue} 70% 94%)`;
        const border = `hsl(${hue} 70% 86%)`;
        const text = `hsl(${hue} 28% 12%)`;
        return { bg, border, text };
    };

    return (
        <div className="categories-overlay">
            <Alert alert={alert} />
            <Loader visible={loading} />
            <div className="categories-box">
                <div className="categories-title">{t("categories.title")}</div>
                <div className="categories-input-row">
                    <input
                        type="text"
                        placeholder={t("categories.placeholder")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="categories-input"
                    />
                    <button className="categories-add-btn" onClick={handleAdd}>
                        {t("categories.addButton")}
                    </button>
                </div>

                <div className="categories-list-title">{t("categories.listTitle")}</div>

                {categories.length === 0 ? (
                    <div className="categories-empty">{t("categories.empty")}</div>
                ) : (
                    <div className="categories-chips">
                        {categories.map((category) => {
                            const c = colorFromName(category.name);
                            return (
                                <div
                                    key={category.id}
                                    className="category-chip"
                                    role="listitem"
                                    style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
                                >
                                    <span className="category-chip-label">{category.name}</span>
                                    <button
                                        className="category-chip-remove"
                                        aria-label={t("categories.removeConfirmConfirmText")}
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            setShowRemoveCategory(true);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button className="categories-close-btn" onClick={onClose}>
                    {t("categories.closeButton")}
                </button>
            </div>

            <ConfirmDialog
                open={showRemoveCategory}
                title={t("categories.removeConfirmTitle")}
                message={t("categories.removeConfirmMessage")}
                confirmText={t("categories.removeConfirmConfirmText")}
                cancelText={t("categories.removeConfirmCancelText")}
                onConfirm={() => {
                    if (selectedCategory) handleDelete(selectedCategory.id);
                    setSelectedCategory(null);
                    setShowRemoveCategory(false);
                }}
                onCancel={() => {
                    setSelectedCategory(null);
                    setShowRemoveCategory(false);
                }}
            />
        </div>
    );
};

export default Categories;
