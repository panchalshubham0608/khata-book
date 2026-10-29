import React, { useState } from "react";
import { createPortal } from "react-dom";
import { FiMenu, FiTrash2, FiUsers, FiPlusCircle, FiUploadCloud } from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import ManageAccessPopup from "./ManageAccessPopup";
import AmountModalInput from "./AmountModalInput";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";
import { useTranslation } from "../i18n/locale";

interface ReportHamburgerMenuProps {
  sharedWith: string[];
  canManage?: boolean;
  onAddEmail?: (email: string) => void;
  onRemoveEmail?: (email: string) => void;
  onDeleteReport?: () => void;
  onTopup?: (amount: number) => void;
  onBackup?: () => void;
}

const ReportHamburgerMenu: React.FC<ReportHamburgerMenuProps> = ({
  sharedWith,
  canManage = true,
  onAddEmail,
  onRemoveEmail,
  onDeleteReport,
  onTopup,
  onBackup,
}) => {
  const { t } = useTranslation();
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState<boolean>(false);
  const [showBackupDialog, setShowBackupDialog] = useState<boolean>(false);
  const [showAccessPopup, setShowAccessPopup] = useState<boolean>(false);
  const [showTopupInput, setShowTopupInput] = useState<boolean>(false);

  const reportMenuItems: HamburgerItem[] = canManage
    ? [
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
          key: "backup",
          label: t("reportHamburger.backup"),
          icon: <FiUploadCloud size={16} />,
          hideChevron: true,
          onClick: () => setShowBackupDialog(true),
        },
        {
          key: "deleteReport",
          label: t("reportHamburger.deleteReport"),
          icon: <FiTrash2 size={16} />,
          destructive: true,
          dividerBefore: true,
          onClick: () => setShowDeleteReportDialog(true),
        },
      ]
    : [];

  const handleTopup = async (_: string, amount: number) => {
    setShowTopupInput(false);
    if (onTopup) await onTopup(amount);
  };

  return (
    <div className="report-hamburger-wrap">
      <HamburgerMenu
        toggleIcon={<FiMenu size={20} />}
        title={t("reportHamburger.drawerTitle")}
        items={reportMenuItems}
        showLanguageSwitcher={true}
      />

      {createPortal(
        <>
          <ConfirmDialog
            open={showBackupDialog}
            variant="primary"
            title={t("reportHamburger.backupConfirmTitle")}
            message={t("reportHamburger.backupConfirmMessage")}
            confirmText={t("reportHamburger.backupConfirmConfirmText")}
            cancelText={t("reportHamburger.backupConfirmCancelText")}
            onConfirm={() => {
              setShowBackupDialog(false);
              onBackup?.();
            }}
            onCancel={() => setShowBackupDialog(false)}
          />

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

          {showAccessPopup && (
            <ManageAccessPopup
              sharedWith={sharedWith}
              onAddEmail={(email) => onAddEmail?.(email)}
              onRemoveEmail={(email) => onRemoveEmail?.(email)}
              onClose={() => setShowAccessPopup(false)}
            />
          )}

          {showTopupInput && (
            <AmountModalInput
              header={t("reportHamburger.topupHeader")}
              amountPlaceholder={t("reportHamburger.topupAmountPlaceholder")}
              onAccept={handleTopup}
              onReject={() => setShowTopupInput(false)}
            />
          )}
        </>,
        document.body
      )}
    </div>
  );
};

export default ReportHamburgerMenu;
