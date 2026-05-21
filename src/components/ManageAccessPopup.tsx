import React, { useEffect, useState } from "react";
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
    onClose
}) => {
    const [email, setEmail] = useState<string>("");
    const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
    const [showRemoveEmail, setShowRemoveEmail] = useState<boolean>(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const { t } = useTranslation();

    const handleAdd = (email: string) => {
        onAddEmail(email.trim());
        setEmail("");
    };

    useEffect(() => {
        let isMounted = true;

        const fetchContacts = async () => {
            const data = await getContacts();
            if (isMounted) {
                setContacts(data.filter(contact => !sharedWith.includes(contact.email)));
            }
        };

        fetchContacts();

        return () => {
            isMounted = false;
        };
    }, [getContacts, sharedWith]);

    return (
        <div className="access-overlay">
            <div className="access-box">
                <div className="access-title">{t("manageAccess.title")}</div>
                <div className="access-input-row">
                    <input
                        type="email"
                        placeholder={t("manageAccess.placeholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="access-input"
                    />
                    <button className="access-add-btn" onClick={() => handleAdd(email)}>
                        {t("manageAccess.addButton")}
                    </button>
                </div>
                {contacts.length > 0 &&
                    <div>
                        <div className="access-list-title">{t("manageAccess.contactsTitle")}</div>
                        {contacts.map(c => (
                            <div className="contact-chip"
                                onClick={() => handleAdd(c.email)}>
                                <span>{c.email}</span>
                                <span className="contact-chip-icon">+</span>
                            </div>
                        ))}
                    </div>}

                <div className="access-list-title">{t("manageAccess.sharedWithTitle")}</div>

                {sharedWith.length === 0 ? (
                    <div className="access-empty">{t("manageAccess.none")}</div>
                ) : (
                    <ul className="access-list">
                        {sharedWith.map((e) => (
                            <li key={e} className="access-item">
                                <span>{e}</span>
                                <button
                                    className="access-remove-btn"
                                    onClick={() => {
                                        setSelectedEmail(e);
                                        setShowRemoveEmail(true);
                                    }}
                                >
                                    {t("manageAccess.removeConfirmConfirmText")}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <button className="access-close-btn" onClick={onClose}>
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
