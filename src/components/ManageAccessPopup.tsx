import React, { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "./ManageAccessPopup.css";

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

    const handleAdd = () => {
        if (!email.trim()) return;
        onAddEmail(email.trim());
        setEmail("");
    };

    return (
        <div className="access-overlay">
            <div className="access-box">
                <div className="access-title">आपकी रिपोर्ट कौन देख सकता है?</div>
                <div className="access-input-row">
                    <input
                        type="email"
                        placeholder="ईमेल दर्ज करें"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="access-input"
                    />
                    <button className="access-add-btn" onClick={handleAdd}>
                        जोड़ें
                    </button>
                </div>

                <div className="access-list-title">पहले से साझा किया गया:</div>

                {sharedWith.length === 0 ? (
                    <div className="access-empty">कोई नहीं</div>
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
                                    हटाएँ
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Close button */}
                <button className="access-close-btn" onClick={onClose}>
                    बंद करें
                </button>
            </div>

            <ConfirmDialog
                open={showRemoveEmail}
                title="साजा ना करे?"
                message="चुने गए व्यक्ति आपकी रिपोर्ट नहीं देख सकेंगे|"
                confirmText="हटाएँ"
                cancelText="रद्द करें"
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
