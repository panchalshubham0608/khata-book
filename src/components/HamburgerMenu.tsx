import React, { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiGlobe, FiChevronRight, FiX, FiType } from "react-icons/fi";
import {
    FONT_SCALE_PRESETS,
    FONT_SCALE_STEP,
    MAX_FONT_SCALE,
    MIN_FONT_SCALE,
    useTranslation,
} from "../i18n/locale";
import "./HamburgerMenu.css";

export interface HamburgerItem {
    key: string;
    label: string | ReactNode;
    sublabel?: string;
    icon?: ReactNode;
    destructive?: boolean;
    ticked?: boolean; // renders a modern toggle switch when boolean
    disabled?: boolean;
    keepOpen?: boolean;
    hideChevron?: boolean;
    dividerBefore?: boolean;
    onClick: () => void | Promise<void>;
}

interface HamburgerMenuProps {
    toggleIcon: ReactNode;
    items: HamburgerItem[];
    title?: string;
    className?: string;
    showLanguageSwitcher?: boolean;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
    toggleIcon,
    items,
    title,
    className = "",
    showLanguageSwitcher = false,
}) => {
    const [open, setOpen] = React.useState(false);
    const { locale, setLocale, fontScale, setFontScale, t } = useTranslation();
    const drawerTitle = title || t("reports.settingsHeader");

    useEffect(() => {
        if (!open) return;

        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onEsc);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onEsc);
        };
    }, [open]);

    const regularItems = items.filter((item) => !item.destructive);
    const destructiveItems = items.filter((item) => item.destructive);

    const renderMenuItem = (item: HamburgerItem) => {
        const isToggle = typeof item.ticked === "boolean";
        return (
            <React.Fragment key={item.key}>
                {item.dividerBefore && !item.destructive && (
                    <div className="hamburger-divider" />
                )}
                <button
                    type="button"
                    disabled={item.disabled}
                    className={`hamburger-item ${
                        item.destructive ? "destructive" : ""
                    } ${item.disabled ? "is-disabled" : ""}`}
                    role={isToggle ? "menuitemcheckbox" : "menuitem"}
                    aria-checked={isToggle ? item.ticked : undefined}
                    aria-disabled={item.disabled}
                    onClick={() => {
                        if (item.disabled) return;
                        if (!item.keepOpen && !isToggle) {
                            setOpen(false);
                        }
                        item.onClick();
                    }}
                >
                    {item.icon && (
                        <span
                            className={`hamburger-icon ${
                                isToggle && item.ticked && !item.disabled
                                    ? "active"
                                    : ""
                            }`}
                        >
                            {item.icon}
                        </span>
                    )}
                    <span className="hamburger-text-wrap">
                        <span className="hamburger-text">{item.label}</span>
                        {item.sublabel && (
                            <span className="hamburger-subtext">
                                {item.sublabel}
                            </span>
                        )}
                    </span>
                    {isToggle ? (
                        <span
                            className={`hamburger-switch ${
                                item.ticked && !item.disabled ? "checked" : ""
                            }`}
                            aria-hidden="true"
                        >
                            <span className="hamburger-switch-thumb" />
                        </span>
                    ) : (
                        !item.destructive &&
                        !item.hideChevron && (
                            <FiChevronRight
                                size={16}
                                className="hamburger-item-chevron"
                            />
                        )
                    )}
                </button>
            </React.Fragment>
        );
    };

    return (
        <div className={`hamburger-root ${className}`}>
            <button
                type="button"
                className={`hamburger-toggle ${open ? "is-open" : ""}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                {toggleIcon}
            </button>

            {open &&
                createPortal(
                    <div
                        className="hamburger-backdrop"
                        onClick={() => setOpen(false)}
                    >
                        <aside
                            className="hamburger-drawer"
                            role="dialog"
                            aria-modal="true"
                            aria-label={drawerTitle}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="hamburger-drawer-header">
                                <span className="hamburger-drawer-title">
                                    {drawerTitle}
                                </span>
                                <button
                                    type="button"
                                    className="hamburger-drawer-close"
                                    aria-label="Close menu"
                                    onClick={() => setOpen(false)}
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <div className="hamburger-drawer-body" role="menu">
                                {showLanguageSwitcher && (
                                    <>
                                        <div className="hamburger-lang-row">
                                            <div className="hamburger-lang-label-group">
                                                <span className="hamburger-icon">
                                                    <FiGlobe size={17} />
                                                </span>
                                                <span className="hamburger-text">
                                                    {t("language.label")}
                                                </span>
                                            </div>
                                            <div
                                                className="hamburger-lang-segmented"
                                                role="group"
                                                aria-label={t("language.label")}
                                            >
                                                <button
                                                    type="button"
                                                    className={`hamburger-lang-pill ${
                                                        locale === "en" ? "active" : ""
                                                    }`}
                                                    onClick={() => setLocale("en")}
                                                >
                                                    EN
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`hamburger-lang-pill ${
                                                        locale === "hi" ? "active" : ""
                                                    }`}
                                                    onClick={() => setLocale("hi")}
                                                >
                                                    हिं
                                                </button>
                                            </div>
                                        </div>

                                        <div className="hamburger-font-section">
                                            <div className="hamburger-font-header">
                                                <div className="hamburger-lang-label-group">
                                                    <span className="hamburger-icon">
                                                        <FiType size={17} />
                                                    </span>
                                                    <div className="hamburger-text-wrap">
                                                        <span className="hamburger-text">
                                                            {t("fontScale.label")}
                                                        </span>
                                                        <span className="hamburger-subtext">
                                                            {t("fontScale.sublabel")}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="hamburger-font-badge">
                                                    {Math.round(fontScale * 100)}%
                                                </span>
                                            </div>

                                            <div
                                                className="hamburger-font-segmented"
                                                role="group"
                                                aria-label={t("fontScale.label")}
                                            >
                                                {FONT_SCALE_PRESETS.map((preset) => {
                                                    const isActive =
                                                        Math.abs(fontScale - preset.value) < 0.03;
                                                    return (
                                                        <button
                                                            key={preset.value}
                                                            type="button"
                                                            className={`hamburger-font-pill ${
                                                                isActive ? "active" : ""
                                                            }`}
                                                            onClick={() =>
                                                                setFontScale(preset.value)
                                                            }
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="hamburger-font-slider-row">
                                                <span
                                                    className="hamburger-font-slider-mark small"
                                                    aria-hidden="true"
                                                >
                                                    A
                                                </span>
                                                <input
                                                    type="range"
                                                    className="hamburger-font-slider"
                                                    min={MIN_FONT_SCALE}
                                                    max={MAX_FONT_SCALE}
                                                    step={FONT_SCALE_STEP}
                                                    value={fontScale}
                                                    aria-label={t("fontScale.label")}
                                                    onChange={(e) =>
                                                        setFontScale(Number(e.target.value))
                                                    }
                                                />
                                                <span
                                                    className="hamburger-font-slider-mark large"
                                                    aria-hidden="true"
                                                >
                                                    A
                                                </span>
                                            </div>
                                        </div>

                                        {regularItems.length > 0 && (
                                            <div className="hamburger-divider" />
                                        )}
                                    </>
                                )}

                                {regularItems.map(renderMenuItem)}
                            </div>

                            {destructiveItems.length > 0 && (
                                <div className="hamburger-drawer-footer">
                                    {destructiveItems.map(renderMenuItem)}
                                </div>
                            )}
                        </aside>
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default HamburgerMenu;
