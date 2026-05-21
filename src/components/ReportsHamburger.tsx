import React from "react";
import { FiMenu, FiLogOut } from "react-icons/fi";
import "./ReportsHamburger.css";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";
import { useTranslation } from "../i18n/locale";

interface ReportsHamburgerProps {
    showDeleted: boolean;
    toggleShowDeleted: () => void;
    showContacts: () => void;
    handleLogout: () => void;
}

const ReportsHamburger: React.FC<ReportsHamburgerProps> = ({
    showDeleted,
    toggleShowDeleted,
    showContacts,
    handleLogout,
}) => {
    const { t } = useTranslation();

    const reportsMenuItems: HamburgerItem[] = [
        {
            key: "showDeleted",
            label: t("reports.showDeletedReports"),
            ticked: showDeleted,
            onClick: toggleShowDeleted,
        },
        {
            key: "contacts",
            label: t("reports.contacts"),
            onClick: showContacts,
        },
        {
            key: "logout",
            label: t("reports.logout"),
            icon: <FiLogOut />,
            destructive: true,
            onClick: handleLogout,
        },
    ];

    return <HamburgerMenu toggleIcon={<FiMenu size={24} />} items={reportsMenuItems} />
};

export default ReportsHamburger;
