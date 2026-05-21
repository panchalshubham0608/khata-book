import React, { useState } from "react";
import { FiMoreVertical, FiTrash2, FiUsers, FiPlusCircle } from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import ManageAccessPopup from "./ManageAccessPopup";
import AmountModalInput from "./AmountModalInput";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";
import { useTranslation } from "../i18n/locale";

interface ReportHamburgerMenuProps {
  sharedWith: string[];
  onAddEmail?: (email: string) => void;
  onRemoveEmail?: (email: string) => void;
  onDeleteReport?: () => void;
  onTopup?: (amount: number) => void;
}

const ReportHamburgerMenu: React.FC<ReportHamburgerMenuProps> = ({
  sharedWith,
  onAddEmail,
  onRemoveEmail,
  onDeleteReport,
  onTopup,
}) => {
  const { t } = useTranslation();
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState<boolean>(false);
  const [showAccessPopup, setShowAccessPopup] = useState<boolean>(false);
  const [showTopupInput, setShowTopupInput] = useState<boolean>(false);

  const reportMenuItems: HamburgerItem[] = [
    {
      key: "manageAccess",
      label: t("reportHamburger.manageAccess"),
      icon: <FiUsers size={16} />,
      onClick: () => setShowAccessPopup(true),
    },
    {
      key: "topup",
      label: t("reportHamburger.topup"),
      icon: <FiPlusCircle size={16} />,
      onClick: () => setShowTopupInput(true),
    },
    {
      key: "deleteReport",
      label: t("reportHamburger.deleteReport"),
      icon: <FiTrash2 size={16} />,
      destructive: true,
      onClick: () => setShowDeleteReportDialog(true),
    },
  ];

  const handleTopup = async (_: string, amount: number) => {
    setShowTopupInput(false);
    if (onTopup) await onTopup(amount);
  };

  return (
    <div>
      <HamburgerMenu toggleIcon={<FiMoreVertical size={20} />} items={reportMenuItems} />

      <ConfirmDialog
        open={showDeleteReportDialog}
        title={t("reportHamburger.deleteConfirmTitle")}
        message={t("reportHamburger.deleteConfirmMessage")}
        confirmText={t("reportHamburger.deleteConfirmConfirmText")}
        cancelText={t("reportHamburger.deleteConfirmCancelText")}
        onConfirm={() => {
          setShowDeleteReportDialog(false);
          onDeleteReport?.();
        }}
        onCancel={() => setShowDeleteReportDialog(false)}
      />

      {showAccessPopup && <ManageAccessPopup
        sharedWith={sharedWith}
        onAddEmail={(email) => onAddEmail?.(email)}
        onRemoveEmail={(email) => onRemoveEmail?.(email)}
        onClose={() => setShowAccessPopup(false)}
      />}

      {showTopupInput &&
        <AmountModalInput
          header={t("reportHamburger.topupHeader")}
          amountPlaceholder={t("reportHamburger.topupAmountPlaceholder")}
          onAccept={handleTopup}
          onReject={() => setShowTopupInput(false)} />
      }

    </div>
  );
};

export default ReportHamburgerMenu;
