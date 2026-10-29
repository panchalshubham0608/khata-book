import React, { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiGlobe, FiChevronRight, FiX } from "react-icons/fi";
import { useTranslation } from "../i18n/locale";
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
    dividerBefore?: boolean;
    onClick: () => void | Promise<void>;
}

interface HamburgerMenuProps {
    toggleIcon: ReactNode;
    items: HamburgerItem[];
    className?: string;
    showLanguageSwitcher?: boolean;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
    toggleIcon,
    items,
    className = "",
    showLanguageSwitcher = false,
}) => {
    const [open, setOpen] = React.useState(false);
    const { locale, setLocale, t } = useTranslation();

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
                        !item.destructive && (
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
                            aria-label={t("reports.settingsHeader")}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="hamburger-drawer-header">
                                <span className="hamburger-drawer-title">
                                    {t("reports.settingsHeader")}
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
                                        <div className="hamburger-divider" />
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
