import React from "react";
import { FiMenu, FiLogOut } from "react-icons/fi";
import "./ReportsHamburger.css";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";

interface ReportsHamburgerProps {
    showDeleted: boolean;
    toggleShowDeleted: () => void;
    handleLogout: () => void;
}

const ReportsHamburger: React.FC<ReportsHamburgerProps> = ({
    showDeleted,
    toggleShowDeleted,
    handleLogout,
}) => {
    const reportsMenuItems: HamburgerItem[] = [
        {
            key: "showDeleted",
            label: "हटाए गए रिपोर्ट दिखाएँ",
            ticked: showDeleted,
            onClick: toggleShowDeleted,
        },
        {
            key: "logout",
            label: "लॉगआउट",
            icon: <FiLogOut />,
            destructive: true,
            onClick: handleLogout,
        },
    ];

    return <HamburgerMenu toggleIcon={<FiMenu size={24} />} items={reportsMenuItems} />
};

export default ReportsHamburger;
