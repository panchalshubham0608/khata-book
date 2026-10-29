import React, { useCallback, useEffect, useState } from "react";
import { FiUsers, FiMail, FiUserPlus, FiTrash2, FiX } from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import "./Contacts.css";
import { addContact, getContacts, deleteContact } from "../firebase/contactService";
import type { Contact } from "../firebase/types";
import { isValidEmail } from "../utils/validationUtils";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { useTranslation } from "../i18n/locale";

interface ContactsProps {
    onClose: () => void;
}

const Contacts: React.FC<ContactsProps> = ({ onClose }) => {
    const [contacts, setContacts] = useState<Array<Contact>>([]);
    const [email, setEmail] = useState<string>("");
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [showRemoveContact, setShowRemoveContact] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();

    const fetchContacts = useCallback(async () => {
        try {
            const fetchedContacts = await getContacts();
            setContacts(fetchedContacts);
        } catch (err) {
            console.error(err);
            showAlert(t("contacts.loadError"), "error");
        } finally {
            setLoading(false);
        }
    }, [showAlert, t]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const fetchedContacts = await getContacts();
                if (mounted) setContacts(fetchedContacts);
            } catch (err) {
                console.error(err);
                if (mounted) showAlert(t("contacts.loadError"), "error");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [showAlert, t]);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !showRemoveContact) {
                onClose();
            }
        };
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [onClose, showRemoveContact]);

    const handleAdd = async () => {
        const trimmed = email.trim();
        if (!isValidEmail(trimmed)) {
            showAlert(t("contacts.invalidEmail"), "error");
            return;
        }
        try {
            setLoading(true);
            await addContact(trimmed);
            showAlert(t("contacts.addSuccess"), "success");
            setEmail("");
            await fetchContacts();
        } catch (err) {
            console.error(err);
            showAlert(t("contacts.addError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const removeContact = async (contactId: string) => {
        try {
            setLoading(true);
            await deleteContact(contactId);
            showAlert(t("contacts.deleteSuccess"), "success");
            await fetchContacts();
        } catch (err) {
            console.error(err);
            showAlert(t("contacts.deleteError"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contacts-overlay" onClick={onClose}>
            <Alert alert={alert} />
            <Loader visible={loading} />
            <div
                className="contacts-box"
                role="dialog"
                aria-modal="true"
                aria-label={t("contacts.title")}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="contacts-header">
                    <div className="contacts-header-left">
                        <div className="contacts-header-icon">
                            <FiUsers size={18} />
                        </div>
                        <div>
                            <h3 className="contacts-title">{t("contacts.title")}</h3>
                            <p className="contacts-subtitle">
                                {t("contacts.subtitle")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="contacts-icon-close"
                        aria-label={t("contacts.closeButton")}
                        onClick={onClose}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                <div className="contacts-input-row">
                    <div className="contacts-input-wrapper">
                        <FiMail size={16} className="contacts-input-icon" />
                        <input
                            type="email"
                            placeholder={t("contacts.placeholder")}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAdd();
                                }
                            }}
                            className="contacts-input"
                        />
                    </div>
                    <button
                        type="button"
                        className="contacts-add-btn"
                        onClick={handleAdd}
                    >
                        <FiUserPlus size={15} />
                        <span>{t("contacts.addButton")}</span>
                    </button>
                </div>

                <div className="contacts-list-section">
                    <div className="contacts-list-header">
                        <span className="contacts-list-title">
                            {t("contacts.listTitle")}
                        </span>
                        <span className="contacts-count-pill">
                            {contacts.length}
                        </span>
                    </div>

                    {contacts.length === 0 ? (
                        <div className="contacts-empty-state">
                            <div className="contacts-empty-icon">
                                <FiMail size={22} />
                            </div>
                            <p className="contacts-empty-title">
                                {t("contacts.empty")}
                            </p>
                            <p className="contacts-empty-subtext">
                                {t("contacts.emptySubtext")}
                            </p>
                        </div>
                    ) : (
                        <ul className="contacts-list">
                            {contacts.map((c) => {
                                const initial =
                                    c.email.trim().charAt(0).toUpperCase() || "@";
                                return (
                                    <li key={c.id} className="contacts-item">
                                        <div className="contacts-item-left">
                                            <span className="contacts-avatar">
                                                {initial}
                                            </span>
                                            <span className="contacts-email">
                                                {c.email}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="contacts-remove-btn"
                                            aria-label={t(
                                                "contacts.removeConfirmConfirmText"
                                            )}
                                            title={t(
                                                "contacts.removeConfirmConfirmText"
                                            )}
                                            onClick={() => {
                                                setSelectedContact(c);
                                                setShowRemoveContact(true);
                                            }}
                                        >
                                            <FiTrash2 size={15} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <button
                    type="button"
                    className="contacts-close-btn"
                    onClick={onClose}
                >
                    {t("contacts.closeButton")}
                </button>
            </div>

            <ConfirmDialog
                open={showRemoveContact}
                title={t("contacts.removeConfirmTitle")}
                message={t("contacts.removeConfirmMessage")}
                confirmText={t("contacts.removeConfirmConfirmText")}
                cancelText={t("contacts.removeConfirmCancelText")}
                onConfirm={() => {
                    if (selectedContact) removeContact(selectedContact.id);
                    setSelectedContact(null);
                    setShowRemoveContact(false);
                }}
                onCancel={() => {
                    setSelectedContact(null);
                    setShowRemoveContact(false);
                }}
            />
        </div>
    );
};

export default Contacts;
