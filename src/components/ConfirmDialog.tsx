import React from "react";
import "./ConfirmDialog.css";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}) => {
  if (!open) return null;

  return (
    <div className="cd-overlay">
      <div className="cd-container">

        <h2 className="cd-title">{title}</h2>
        <p className="cd-message">{message}</p>

        <div className="cd-buttons">
          <button className="cd-btn cd-cancel" onClick={onCancel}>
            {cancelText}
          </button>

          <button className="cd-btn cd-delete" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmDialog;
