import { useState, useCallback } from "react";

export type AlertType = "success" | "error" | "info";

export const useAlert = () => {
  const [alert, setAlert] = useState<{
    message: string;
    type: AlertType;
    visible: boolean;
  }>({
    message: "",
    type: "info",
    visible: false,
  });

  const showAlert = useCallback((message: string, type: AlertType = "info") => {
    setAlert({ message, type, visible: true });

    // hide automatically after 3 seconds
    setTimeout(() => {
      setAlert((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  return { alert, showAlert };
};
