import React, { useEffect, useState } from "react";
import {
    FiKey,
    FiEye,
    FiEyeOff,
    FiCheck,
    FiTrash2,
    FiX,
    FiShield,
} from "react-icons/fi";
import {
    getUserProfile,
    saveGeminiApiKeyForUser,
} from "../firebase/userProfileService";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { useTranslation } from "../i18n/locale";
import "./GeminiKeyModal.css";

interface GeminiKeyModalProps {
    initialApiKey?: string;
    onClose: () => void;
    onSaved?: (apiKey: string) => void;
}

function maskApiKey(key: string): string {
    const trimmed = key.trim();
    if (!trimmed) return "";
    if (trimmed.length <= 8) {
        return "••••••••";
    }
    return `••••••••••••${trimmed.slice(-4)}`;
}

const GeminiKeyModal: React.FC<GeminiKeyModalProps> = ({
    initialApiKey,
    onClose,
    onSaved,
}) => {
    const { t } = useTranslation();
    const { alert, showAlert } = useAlert();
    const [apiKeyInput, setApiKeyInput] = useState<string>(initialApiKey || "");
    const [savedKey, setSavedKey] = useState<string>(initialApiKey || "");
    const [showPlaintext, setShowPlaintext] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(initialApiKey === undefined);

    useEffect(() => {
        if (initialApiKey !== undefined) {
            return;
        }
        let mounted = true;
        (async () => {
            try {
                const profile = await getUserProfile();
                if (mounted) {
                    const existing = profile.geminiApiKey || "";
                    setApiKeyInput(existing);
                    setSavedKey(existing);
                }
            } catch {
                if (mounted) {
                    showAlert(t("gemini.keyLoadError"), "error");
                }
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [initialApiKey, showAlert, t]);

    useEffect(() => {
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", onEsc);
        return () => document.removeEventListener("keydown", onEsc);
    }, [onClose]);

    const handleSave = async () => {
        const trimmed = apiKeyInput.trim();
        if (!trimmed || trimmed.length < 16) {
            showAlert(t("gemini.invalidKey"), "error");
            return;
        }

        try {
            setLoading(true);
            await saveGeminiApiKeyForUser(trimmed);
            setSavedKey(trimmed);
            showAlert(t("gemini.keySavedSuccess"), "success");
            onSaved?.(trimmed);
        } catch {
            showAlert(t("gemini.keySaveError"), "error");
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        try {
            setLoading(true);
            await saveGeminiApiKeyForUser("");
            setApiKeyInput("");
            setSavedKey("");
            showAlert(t("gemini.keyRemovedSuccess"), "info");
            onSaved?.("");
        } catch {
            showAlert(t("gemini.keySaveError"), "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gemini-key-overlay" onClick={onClose}>
            <Alert alert={alert} />
            <Loader visible={loading} />
            <div
                className="gemini-key-box"
                role="dialog"
                aria-modal="true"
                aria-label={t("gemini.keyModalTitle")}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="gemini-key-header">
                    <div className="gemini-key-header-left">
                        <div className="gemini-key-header-icon">
                            <FiKey size={18} />
                        </div>
                        <div>
                            <h3 className="gemini-key-title">
                                {t("gemini.keyModalTitle")}
                            </h3>
                            <p className="gemini-key-subtitle">
                                {t("gemini.keyModalSubtitle")}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="gemini-key-close-icon"
                        aria-label={t("gemini.closeButton")}
                        onClick={onClose}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {savedKey && (
                    <div className="gemini-key-status-banner">
                        <div className="gemini-key-status-left">
                            <FiShield size={15} className="gemini-key-status-icon" />
                            <span>{t("gemini.activeKeyLabel")}</span>
                        </div>
                        <code className="gemini-key-masked">
                            {maskApiKey(savedKey)}
                        </code>
                    </div>
                )}

                <div className="gemini-key-field">
                    <label
                        htmlFor="gemini-api-key-input"
                        className="gemini-key-label"
                    >
                        {t("gemini.keyInputLabel")}
                    </label>
                    <div className="gemini-key-input-wrap">
                        <input
                            id="gemini-api-key-input"
                            type={showPlaintext ? "text" : "password"}
                            className="gemini-key-input"
                            placeholder={t("gemini.keyInputPlaceholder")}
                            value={apiKeyInput}
                            autoComplete="off"
                            spellCheck={false}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSave();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="gemini-key-eye-btn"
                            aria-label={
                                showPlaintext
                                    ? t("gemini.hideKey")
                                    : t("gemini.showKey")
                            }
                            onClick={() => setShowPlaintext((prev) => !prev)}
                        >
                            {showPlaintext ? (
                                <FiEyeOff size={16} />
                            ) : (
                                <FiEye size={16} />
                            )}
                        </button>
                    </div>
                    <p className="gemini-key-hint">{t("gemini.keyHint")}</p>
                </div>

                <div className="gemini-key-actions">
                    {savedKey && (
                        <button
                            type="button"
                            className="gemini-key-remove-btn"
                            onClick={handleClear}
                            disabled={loading}
                        >
                            <FiTrash2 size={15} />
                            <span>{t("gemini.removeKeyButton")}</span>
                        </button>
                    )}
                    <button
                        type="button"
                        className="gemini-key-save-btn"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        <FiCheck size={16} />
                        <span>{t("gemini.saveKeyButton")}</span>
                    </button>
                </div>

                <button
                    type="button"
                    className="gemini-key-done-btn"
                    onClick={onClose}
                >
                    {t("gemini.closeButton")}
                </button>
            </div>
        </div>
    );
};

export default GeminiKeyModal;
