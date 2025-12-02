import React, { useEffect, useRef, type ReactNode } from "react";
import "./HamburgerMenu.css";

export interface HamburgerItem {
    key: string;
    label: string | ReactNode;
    icon?: ReactNode;
    destructive?: boolean;
    ticked?: boolean; // for toggle items
    onClick: () => void | Promise<void>;
}

interface HamburgerMenuProps {
    toggleIcon: ReactNode;
    items: HamburgerItem[];
    className?: string;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
    toggleIcon,
    items,
    className = "",
}) => {
    const [open, setOpen] = React.useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDocClick = (e: MouseEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("click", onDocClick);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("click", onDocClick);
            document.removeEventListener("keydown", onEsc);
        };
    }, []);

    return (
        <div className={`hamburger-root ${className}`} ref={rootRef}>
            <button
                className="hamburger-toggle"
                aria-haspopup="true"
                aria-expanded={open}
                onClick={() => setOpen((s) => !s)}
            >
                {toggleIcon}
            </button>

            {open && (
                <div className="hamburger-menu" role="menu">
                    {items.map((item) => (
                        <button
                            key={item.key}
                            className={`hamburger-item ${item.destructive ? "destructive" : ""}`}
                            role="menuitem"
                            onClick={() => {
                                setOpen(false);
                                item.onClick();
                            }}
                        >
                            {item.icon && <span className="hamburger-icon">{item.icon}</span>}
                            {item.ticked && <span className="hamburger-tick">✔</span>}
                            <span className="hamburger-text">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HamburgerMenu;
