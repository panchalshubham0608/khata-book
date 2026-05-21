import React, { useCallback, useEffect, useState } from "react";
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

const Contacts: React.FC<ContactsProps> = ({
    onClose
}) => {
    const [contacts, setContacts] = useState<Array<Contact>>([]);
    const [email, setEmail] = useState<string>("");
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [showRemoveContact, setShowRemoveContact] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const { alert, showAlert } = useAlert();
    const { t } = useTranslation();

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedContacts = await getContacts();
            setContacts(fetchedContacts);
        } catch (err) {
            console.log(err);
            showAlert(t("contacts.loadError"), "error");
        } finally {
            setLoading(false);
        }
    }, [getContacts, showAlert, t]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const handleAdd = async () => {
        if (!isValidEmail(email)) {
            showAlert(t("contacts.invalidEmail"), "error");
            return;
        }
        try {
            setLoading(true);
            await addContact(email);
            showAlert(t("contacts.addSuccess"), "success");
            setEmail("");
            await fetchContacts();
        } catch (err) {
            console.log(err);
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
            console.log(err);
            showAlert(t("contacts.deleteError"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contacts-overlay">
            <Alert alert={alert} />
            <Loader visible={loading} />
            <div className="contacts-box">
                <div className="contacts-title">{t("contacts.title")}</div>
                <div className="contacts-input-row">
                    <input
                        type="email"
                        placeholder={t("contacts.placeholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="contacts-input"
                    />
                    <button className="contacts-add-btn" onClick={handleAdd}>
                        {t("contacts.addButton")}
                    </button>
                </div>

                <div className="contacts-list-title">{t("contacts.listTitle")}</div>

                {contacts.length === 0 ? (
                    <div className="contacts-empty">{t("contacts.empty")}</div>
                ) : (
                    <ul className="contacts-list">
                        {contacts.map((c) => (
                            <li key={c.id} className="contacts-item">
                                <span>{c.email}</span>
                                <button
                                    className="contacts-remove-btn"
                                    onClick={() => {
                                        setSelectedContact(c);
                                        setShowRemoveContact(true);
                                    }}
                                >
                                    {t("contacts.removeConfirmConfirmText")}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <button className="contacts-close-btn" onClick={onClose}>
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
