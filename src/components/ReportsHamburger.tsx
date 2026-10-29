import React from "react";
import {
    FiMenu,
    FiLogOut,
    FiArchive,
    FiMessageSquare,
    FiUsers,
    FiTrash2,
} from "react-icons/fi";
import "./ReportsHamburger.css";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";
import { useTranslation } from "../i18n/locale";

interface ReportsHamburgerProps {
    showArchived: boolean;
    toggleShowArchived: () => void;
    smsTrackingEnabled: boolean;
    toggleSmsTracking: () => void;
    showContacts: () => void;
    openTrash: () => void;
    showCategories?: () => void;
    handleLogout: () => void;
}

const ReportsHamburger: React.FC<ReportsHamburgerProps> = ({
    showArchived,
    toggleShowArchived,
    smsTrackingEnabled,
    toggleSmsTracking,
    showContacts,
    openTrash,
    handleLogout,
}) => {
    const { t } = useTranslation();
    const isMobileApp =
        typeof window !== "undefined" && Boolean(window.Android);

    const reportsMenuItems: HamburgerItem[] = [
        {
            key: "showArchived",
            label: t("reports.showArchivedReports"),
            icon: <FiArchive size={16} />,
            ticked: showArchived,
            onClick: toggleShowArchived,
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
            key: "trash",
            label: t("reports.trash"),
            icon: <FiTrash2 size={16} />,
            hideChevron: true,
            onClick: openTrash,
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
