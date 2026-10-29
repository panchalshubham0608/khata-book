import React from "react";
import {
    FiMenu,
    FiLogOut,
    FiEye,
    FiMessageSquare,
    FiUsers,
} from "react-icons/fi";
import "./ReportsHamburger.css";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";
import { useTranslation } from "../i18n/locale";

interface ReportsHamburgerProps {
    showDeleted: boolean;
    toggleShowDeleted: () => void;
    smsTrackingEnabled: boolean;
    toggleSmsTracking: () => void;
    showContacts: () => void;
    showCategories?: () => void;
    handleLogout: () => void;
}

const ReportsHamburger: React.FC<ReportsHamburgerProps> = ({
    showDeleted,
    toggleShowDeleted,
    smsTrackingEnabled,
    toggleSmsTracking,
    showContacts,
    handleLogout,
}) => {
    const { t } = useTranslation();
    const isMobileApp =
        typeof window !== "undefined" && Boolean(window.Android);

    const reportsMenuItems: HamburgerItem[] = [
        {
            key: "showDeleted",
            label: t("reports.showDeletedReports"),
            icon: <FiEye size={16} />,
            ticked: showDeleted,
            onClick: toggleShowDeleted,
        },
        {
            key: "smsTracking",
            label: t("reports.trackSmsTransactions"),
            sublabel: !isMobileApp
                ? t("reports.smsMobileOnlyNote")
                : undefined,
            icon: <FiMessageSquare size={16} />,
            ticked: isMobileApp ? smsTrackingEnabled : false,
            disabled: !isMobileApp,
            onClick: () => {
                if (isMobileApp) {
                    toggleSmsTracking();
                }
            },
        },
        {
            key: "contacts",
            label: t("reports.contacts"),
            icon: <FiUsers size={16} />,
            dividerBefore: true,
            onClick: showContacts,
        },
        {
            key: "logout",
            label: t("reports.logout"),
            icon: <FiLogOut size={16} />,
            destructive: true,
            dividerBefore: true,
            onClick: handleLogout,
        },
    ];

    return (
        <HamburgerMenu
            toggleIcon={<FiMenu size={20} />}
            items={reportsMenuItems}
            showLanguageSwitcher={true}
        />
    );
};

export default ReportsHamburger;
