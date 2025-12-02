import React, { useState } from "react";
import { FiMoreVertical, FiTrash2, FiUsers, FiPlusCircle } from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import ManageAccessPopup from "./ManageAccessPopup";
import AmountModalInput from "./AmountModalInput";
import HamburgerMenu, { type HamburgerItem } from "./HamburgerMenu";

interface ReportHamburgerMenuProps {
  sharedWith: string[],
  onAddEmail?: (email: string) => void;
  onRemoveEmail?: (email: string) => void;
  onDeleteReport?: () => void;
  onTopup?: (amount: number) => void;
  labelManageAccess?: string;
  labelTopup?: string;
  labelDeleteReport?: string;
}

const ReportHamburgerMenu: React.FC<ReportHamburgerMenuProps> = ({
  sharedWith,
  onAddEmail,
  onRemoveEmail,
  onDeleteReport,
  onTopup,
  labelManageAccess = "पहुँच नियंत्रण",
  labelTopup = "टॉप उप",
  labelDeleteReport = "रिपोर्ट हटाएँ",
}) => {
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState<boolean>(false);
  const [showAccessPopup, setShowAccessPopup] = useState<boolean>(false);
  const [showTopupInput, setShowTopupInput] = useState<boolean>(false);

  const reportMenuItems: HamburgerItem[] = [
    {
      key: "manageAccess",
      label: labelManageAccess,
      icon: <FiUsers size={16} />,
      onClick: () => setShowAccessPopup(true),
    },
    {
      key: "topup",
      label: labelTopup,
      icon: <FiPlusCircle size={16} />,
      onClick: () => setShowTopupInput(true),
    },
    {
      key: "deleteReport",
      label: labelDeleteReport,
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

      {<ConfirmDialog
        open={showDeleteReportDialog}
        title="रिपोर्ट हटाना चाहते हैं?"
        message="यह क्रिया स्थायी है और वापस नहीं की जा सकती।"
        confirmText="हटाएँ"
        cancelText="रद्द करें"
        onConfirm={() => {
          setShowDeleteReportDialog(false);
          onDeleteReport?.();
        }}
        onCancel={() => setShowDeleteReportDialog(false)}
      />}

      {showAccessPopup && <ManageAccessPopup
        sharedWith={sharedWith}
        onAddEmail={(email) => {
          setShowAccessPopup(false);
          onAddEmail?.(email);
        }}
        onRemoveEmail={(email) => {
          setShowAccessPopup(false);
          onRemoveEmail?.(email);
        }}
        onClose={() => setShowAccessPopup(false)}
      />}

      {showTopupInput &&
        <AmountModalInput
          header="बजट में टॉप उप करे"
          amountPlaceholder="टॉप उप राशि"
          onAccept={handleTopup}
          onReject={() => setShowTopupInput(false)} />
      }

    </div>
  );
};

export default ReportHamburgerMenu;
