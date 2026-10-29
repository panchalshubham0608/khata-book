import React, { useState, useRef, useEffect } from "react";
import { FiSettings, FiX } from "react-icons/fi";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase";
import {
    isSmsTrackingEnabled,
    setSmsTrackingEnabled,
} from "../services/smsTrackingService";
import { useTranslation } from "../i18n/locale";
import LanguageSwitcher from "./LanguageSwitcher";
import "./SettingsButton.css";

const SettingsButton: React.FC = () => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(
        auth.currentUser?.email || null
    );
    const [smsEnabled, setSmsEnabled] = useState<boolean>(() =>
        isSmsTrackingEnabled(auth.currentUser?.email)
    );
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            const email = user?.email || null;
            setUserEmail(email);
            setSmsEnabled(isSmsTrackingEnabled(email));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const handleSettingSync = () => {
            setSmsEnabled(isSmsTrackingEnabled(userEmail));
        };
        window.addEventListener("smsTrackingSettingChanged", handleSettingSync);
        return () =>
            window.removeEventListener(
                "smsTrackingSettingChanged",
                handleSettingSync
            );
    }, [userEmail]);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!ref.current) return;
            if (ref.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

    const handleToggleSms = () => {
        if (!userEmail) return;
        const next = !smsEnabled;

        if (next && window.Android && !window.Android.hasSmsPermission()) {
            window.Android.requestSmsPermission();
            return;
        }

        setSmsTrackingEnabled(userEmail, next);
        setSmsEnabled(next);
    };

    return (
        <div className="settings-root" ref={ref}>
            <button
                className="settings-toggle"
                aria-label="Settings"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((s) => !s);
                }}
            >
                {open ? <FiX size={18} /> : <FiSettings size={18} />}
            </button>

            {open && (
                <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="settings-panel-content">
                        <LanguageSwitcher />
                        {userEmail && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    marginTop: 10,
                                    paddingTop: 10,
                                    borderTop: "1px solid #eee",
                                }}
                            >
                                <label
                                    htmlFor="sms-tracking-checkbox"
                                    style={{ fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                                >
                                    {t("reports.trackSmsTransactions")}
                                </label>
                                <input
                                    id="sms-tracking-checkbox"
                                    type="checkbox"
                                    checked={smsEnabled}
                                    onChange={handleToggleSms}
                                    style={{ width: 16, height: 16, cursor: "pointer" }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsButton;
