import React, { useEffect, useState } from "react";
import { FiMail, FiPlus, FiTrash2, FiUsers, FiX } from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import "./ManageAccessPopup.css";
import { getContacts } from "../firebase/contactService";
import type { Contact } from "../firebase/types";
import { useTranslation } from "../i18n/locale";

interface ManageAccessPopupProps {
    sharedWith: string[];
    onAddEmail: (email: string) => void;
    onRemoveEmail: (email: string) => void;
    onClose: () => void;
}

const ManageAccessPopup: React.FC<ManageAccessPopupProps> = ({
    sharedWith,
    onAddEmail,
    onRemoveEmail,
    onClose,
}) => {
    const [email, setEmail] = useState<string>("");
    const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
    const [showRemoveEmail, setShowRemoveEmail] = useState<boolean>(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const { t } = useTranslation();

    const handleAdd = (targetEmail: string) => {
        const trimmed = targetEmail.trim();
        if (!trimmed) return;
        onAddEmail(trimmed);
        setEmail("");
    };

    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                const data = await getContacts();
                if (isMounted) {
                    setContacts(
                        data.filter(
                            (contact) => !sharedWith.includes(contact.email)
                        )
                    );
                }
            } catch (err) {
                console.error(err);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [sharedWith]);

    const getInitial = (emailStr: string) =>
        emailStr.trim().charAt(0).toUpperCase() || "?";

    return (
        <div className="access-overlay" onClick={onClose}>
            <div
                className="access-box"
                role="dialog"
                aria-modal="true"
                aria-label={t("manageAccess.title")}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="access-header">
                    <div className="access-header-left">
                        <div className="access-header-icon">
                            <FiUsers size={20} />
                        </div>
                        <h3 className="access-title">
                            {t("manageAccess.title")}
                        </h3>
                    </div>
                    <button
                        type="button"
                        className="access-icon-close"
                        aria-label={t("manageAccess.closeButton")}
                        onClick={onClose}
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Add Email Input Row */}
                <div className="access-input-row">
                    <div className="access-input-wrapper">
                        <FiMail size={16} className="access-input-icon" />
                        <input
                            type="email"
                            placeholder={t("manageAccess.placeholder")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAdd(email);
                                }
                            }}
                            className="access-input"
                        />
                    </div>
                    <button
                        type="button"
                        className="access-add-btn"
                        disabled={!email.trim()}
                        onClick={() => handleAdd(email)}
                    >
                        <FiPlus size={16} />
                        <span>{t("manageAccess.addButton")}</span>
                    </button>
                </div>

                {/* Quick Contacts */}
                {contacts.length > 0 && (
                    <div className="access-contacts-section">
                        <div className="access-list-title">
                            {t("manageAccess.contactsTitle")}
                        </div>
                        <div className="access-chips-wrap">
                            {contacts.map((c) => (
                                <button
                                    key={c.id || c.email}
                                    type="button"
                                    className="contact-chip"
                                    onClick={() => handleAdd(c.email)}
                                >
                                    <span>{c.email}</span>
                                    <span className="contact-chip-icon">
                                        <FiPlus size={12} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shared With List */}
                <div className="access-list-header">
                    <span className="access-list-title">
                        {t("manageAccess.sharedWithTitle")}
                    </span>
                    {sharedWith.length > 0 && (
                        <span className="access-count-pill">
                            {sharedWith.length}
                        </span>
                    )}
                </div>

                <div className="access-list-body">
                    {sharedWith.length === 0 ? (
                        <div className="access-empty">
                            {t("manageAccess.none")}
                        </div>
                    ) : (
                        <ul className="access-list">
                            {sharedWith.map((e) => (
                                <li key={e} className="access-item">
                                    <div className="access-item-info">
                                        <span className="access-avatar">
                                            {getInitial(e)}
                                        </span>
                                        <span className="access-email">{e}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="access-remove-btn"
                                        aria-label={t(
                                            "manageAccess.removeConfirmConfirmText"
                                        )}
                                        onClick={() => {
                                            setSelectedEmail(e);
                                            setShowRemoveEmail(true);
                                        }}
                                    >
                                        <FiTrash2 size={15} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <button
                    type="button"
                    className="access-close-btn"
                    onClick={onClose}
                >
                    {t("manageAccess.closeButton")}
                </button>
            </div>

            <ConfirmDialog
                open={showRemoveEmail}
                title={t("manageAccess.removeConfirmTitle")}
                message={t("manageAccess.removeConfirmMessage")}
                confirmText={t("manageAccess.removeConfirmConfirmText")}
                cancelText={t("manageAccess.removeConfirmCancelText")}
                onConfirm={() => {
                    if (selectedEmail) onRemoveEmail(selectedEmail);
                    setSelectedEmail(null);
                    setShowRemoveEmail(false);
                }}
                onCancel={() => {
                    setSelectedEmail(null);
                    setShowRemoveEmail(false);
                }}
            />
        </div>
    );
};

export default ManageAccessPopup;

