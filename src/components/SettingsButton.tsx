import React, { useState, useRef, useEffect } from "react";
import { FiSettings, FiX } from "react-icons/fi";
import LanguageSwitcher from "./LanguageSwitcher";
import "./SettingsButton.css";

const SettingsButton: React.FC = () => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!ref.current) return;
            if (ref.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, []);

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
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsButton;
