import React from "react";
import { createPortal } from "react-dom";
import "./Loader.css";

interface LoaderProps {
  visible: boolean;
}

const Loader: React.FC<LoaderProps> = ({ visible }) => {
  if (!visible) return null;

  return createPortal(
    <div className="loader-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="loader-card">
        <div className="loader-visual">
          <span className="loader-ring-outer" />
          <span className="loader-ring-inner" />
          <div className="loader-core">
            <span className="loader-currency">₹</span>
          </div>
        </div>
        <div className="loader-dots" aria-hidden="true">
          <span className="loader-dot" />
          <span className="loader-dot" />
          <span className="loader-dot" />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Loader;

