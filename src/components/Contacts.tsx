import React, { useCallback, useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "./Contacts.css";
import { addContact, getContacts, deleteContact } from "../firebase/contactService";
import type { Contact } from "../firebase/types";
import { isValidEmail } from "../utils/validationUtils";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";

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

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const fetchedContacts = await getContacts();
            setContacts(fetchedContacts);
        } catch (err) {
            console.log(err);
            showAlert("आपके कॉन्टेक्ट्स लाने में समस्या हुई।", "error");
        } finally {
            setLoading(false);
        }
    }, [getContacts]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    const handleAdd = async () => {
        if (!isValidEmail(email)) {
            showAlert("यह कांटेक्ट ईमेल मान्य नहीं है।", "error");
            return;
        }
        try {
            setLoading(true);
            await addContact(email);
            showAlert("आपका कांटेक्ट सफलतापूर्वक जोड़ा गया।", "success");
            setEmail("");
            await fetchContacts();
        } catch (err) {
            console.log(err);
            showAlert("आपका कांटेक्ट जोड़ने में समस्या हुई।", "error");
        } finally {
            setLoading(false);
        }
    };

    const removeContact = async (contactId: string) => {
        try {
            setLoading(true);
            await deleteContact(contactId);
            showAlert("कांटेक्ट सफलतापूर्वक हटाया गया।", "success");
            await fetchContacts(); // refresh list
        } catch (err) {
            console.log(err);
            showAlert("कांटेक्ट हटाने में समस्या हुई।", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contacts-overlay">
            <Alert alert={alert} />
            <Loader visible={loading} />
            <div className="contacts-box">
                <div className="contacts-title">कॉन्टेक्ट्स</div>
                <div className="contacts-input-row">
                    <input
                        type="email"
                        placeholder="ईमेल दर्ज करें"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="contacts-input"
                    />
                    <button className="contacts-add-btn" onClick={handleAdd}>
                        जोड़ें
                    </button>
                </div>

                <div className="contacts-list-title">आपके कॉन्टेक्ट्स:</div>

                {contacts.length === 0 ? (
                    <div className="contacts-empty">कोई नहीं</div>
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
                                    हटाएँ
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Close button */}
                <button className="contacts-close-btn" onClick={onClose}>
                    बंद करें
                </button>
            </div>

            <ConfirmDialog
                open={showRemoveContact}
                title="कांटेक्ट को हटाए?"
                message="यह कांटेक्ट आपकी लिस्ट से हटा दिया जायेग।"
                confirmText="हटाएँ"
                cancelText="रद्द करें"
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
