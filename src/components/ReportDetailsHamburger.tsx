import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  FiMenu,
  FiTrash2,
  FiUsers,
  FiPlusCircle,
  FiUploadCloud,
  FiArchive,
} from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import ManageAccessPopup from "./ManageAccessPopup";
import AmountModalInput from "./AmountModalInput";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";
import { useTranslation } from "../i18n/locale";

interface ReportHamburgerMenuProps {
  sharedWith: string[];
  canManage?: boolean;
  canArchive?: boolean;
  isArchived?: boolean;
  onAddEmail?: (email: string) => void;
  onRemoveEmail?: (email: string) => void;
  onDeleteReport?: () => void;
  onArchiveReport?: () => void;
  onUnarchiveReport?: () => void;
  onTopup?: (amount: number) => void;
  onBackup?: () => void;
}

const ReportHamburgerMenu: React.FC<ReportHamburgerMenuProps> = ({
  sharedWith,
  canManage = true,
  canArchive = false,
  isArchived = false,
  onAddEmail,
  onRemoveEmail,
  onDeleteReport,
  onArchiveReport,
  onUnarchiveReport,
  onTopup,
  onBackup,
}) => {
  const { t } = useTranslation();
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState<boolean>(false);
  const [showArchiveReportDialog, setShowArchiveReportDialog] = useState<boolean>(false);
  const [showUnarchiveReportDialog, setShowUnarchiveReportDialog] = useState<boolean>(false);
  const [showBackupDialog, setShowBackupDialog] = useState<boolean>(false);
  const [showAccessPopup, setShowAccessPopup] = useState<boolean>(false);
  const [showTopupInput, setShowTopupInput] = useState<boolean>(false);

  const reportMenuItems: HamburgerItem[] = [
    ...(canManage
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
        ]
      : []),
    ...(canArchive
      ? [
          {
            key: isArchived ? "unarchiveReport" : "archiveReport",
            label: isArchived
              ? t("reportHamburger.unarchiveReport")
              : t("reportHamburger.archiveReport"),
            icon: <FiArchive size={16} />,
            hideChevron: true,
            onClick: () => {
              if (isArchived) {
                setShowUnarchiveReportDialog(true);
              } else {
                setShowArchiveReportDialog(true);
              }
            },
          },
        ]
      : []),
    ...(canManage
      ? [
          {
            key: "deleteReport",
            label: t("reportHamburger.deleteReport"),
            icon: <FiTrash2 size={16} />,
            destructive: true,
            dividerBefore: true,
            onClick: () => setShowDeleteReportDialog(true),
          },
        ]
      : []),
  ];

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
            open={showArchiveReportDialog}
            variant="primary"
            title={t("reportHamburger.archiveConfirmTitle")}
            message={t("reportHamburger.archiveConfirmMessage")}
            confirmText={t("reportHamburger.archiveConfirmConfirmText")}
            cancelText={t("reportHamburger.archiveConfirmCancelText")}
            onConfirm={() => {
              setShowArchiveReportDialog(false);
              onArchiveReport?.();
            }}
            onCancel={() => setShowArchiveReportDialog(false)}
          />

          <ConfirmDialog
            open={showUnarchiveReportDialog}
            variant="primary"
            title={t("reportHamburger.unarchiveConfirmTitle")}
            message={t("reportHamburger.unarchiveConfirmMessage")}
            confirmText={t("reportHamburger.unarchiveConfirmConfirmText")}
            cancelText={t("reportHamburger.unarchiveConfirmCancelText")}
            onConfirm={() => {
              setShowUnarchiveReportDialog(false);
              onUnarchiveReport?.();
            }}
            onCancel={() => setShowUnarchiveReportDialog(false)}
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
