import React, { useEffect, useRef, useState } from "react";
import { FiMoreVertical, FiTrash2, FiUsers, FiPlusCircle } from "react-icons/fi";
import ConfirmDialog from "./ConfirmDialog";
import ManageAccessPopup from "./ManageAccessPopup";
import "./ReportHamburgerMenu.css";
import AmountModalInput from "./AmountModalInput";

interface ReportHamburgerMenuProps {
  onAddEmail?: (email: string) => void;
  onRemoveEmail?: (email: string) => void;
  onDeleteReport?: () => void;
  labelManageAccess?: string;
  labelTopup?: string;
  labelDeleteReport?: string;
}

const ReportHamburgerMenu: React.FC<ReportHamburgerMenuProps> = ({
  onAddEmail,
  onRemoveEmail,
  onDeleteReport,
  labelManageAccess = "पहुँच नियंत्रण",
  labelTopup = "टॉप उप",
  labelDeleteReport = "रिपोर्ट हटाएँ",
}) => {
  const [open, setOpen] = useState(false);
  const [showDeleteReportDialog, setShowDeleteReportDialog] = useState<boolean>(false);
  const [showAccessPopup, setShowAccessPopup] = useState<boolean>(false);
  const [showTopupInput, setShowTopupInput] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const handleManageAccess = () => {
    setOpen(false);
    setShowAccessPopup(true);
  };

  const handleDelete = () => {
    setOpen(false);
    setShowDeleteReportDialog(true);
  };

  const handleTopup = (_: string, amount: number) => {
    console.log("top up " + amount);
    setShowTopupInput(false);
  };

  return (
    <div className="hamburger-root" ref={rootRef}>
      <button
        className="hamburger-toggle"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open menu"
        onClick={() => setOpen((s) => !s)}
      >
        <FiMoreVertical size={20} />
      </button>

      {open && (
        <div className="hamburger-menu" role="menu" aria-label="Options">
          <button
            className="hamburger-item"
            role="menuitem"
            onClick={handleManageAccess}
          >
            <FiUsers size={16} className="hamburger-icon" />
            <span className="hamburger-text">{labelManageAccess}</span>
          </button>

          <button
            className="hamburger-item"
            role="menuitem"
            onClick={() => setShowTopupInput(true)}
          >
            <FiPlusCircle size={16} className="hamburger-icon" />
            <span className="hamburger-text">{labelTopup}</span>
          </button>

          <button
            className="hamburger-item destructive"
            role="menuitem"
            onClick={handleDelete}
          >
            <FiTrash2 size={16} className="hamburger-icon" />
            <span className="hamburger-text">{labelDeleteReport}</span>
          </button>
        </div>
      )}

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
        sharedWith={["user1@gmail.com"]}
        onAddEmail={(email) => {
          console.log("Adding " + email);
          setShowAccessPopup(false);
          onAddEmail?.(email);
        }}
        onRemoveEmail={(email) => {
          console.log("Removing " + email);
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
