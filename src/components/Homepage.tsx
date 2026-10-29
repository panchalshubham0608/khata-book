import React, { useEffect } from "react";
import "./Homepage.css";
import logo from "../assets/logo192.png";
import { auth, googleProvider } from "../firebase/firebase";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/locale";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { alert, showAlert } = useAlert();

  useEffect(() => {
    const handleNativeGoogleSignIn = (event: Event) => {
      const customEvent = event as CustomEvent<{ idToken: string }>;
      const idToken = customEvent.detail.idToken;
      const credential = GoogleAuthProvider.credential(idToken);

      signInWithCredential(auth, credential).catch(() => {
        console.error("Native Google sign-in failed");
        showAlert(t("homepage.loginError"), "error");
      });
    };

    const handleNativeGoogleSignInError = () => {
      console.error("Native Google sign-in error");
      showAlert(t("homepage.loginError"), "error");
    };

    window.addEventListener("nativeGoogleSignIn", handleNativeGoogleSignIn);
    window.addEventListener(
      "nativeGoogleSignInError",
      handleNativeGoogleSignInError
    );

    return () => {
      window.removeEventListener(
        "nativeGoogleSignIn",
        handleNativeGoogleSignIn
      );
      window.removeEventListener(
        "nativeGoogleSignInError",
        handleNativeGoogleSignInError
      );
    };
  }, [showAlert, t]);

  const handleGoogleLogin = async () => {
    if (window.Android) {
      console.log("[ANDROID] Using window.Android.signInWithGoogle()");
      window.Android.signInWithGoogle();
      return;
    }

    try {
      console.log("[WEB] Using signInWithPopup()");
      await signInWithPopup(auth, googleProvider);
      navigate("/reports");
    } catch {
      console.error("Google Login Error");
      showAlert(t("homepage.loginError"), "error");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/reports", { replace: true });
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (auth.currentUser) navigate("/reports");

  return (
    <div className="home-container">
      <Alert alert={alert} />
      <div className="home-content">
        <img src={logo} className="home-logo" alt="Khata Book Logo" />

        <h1 className="home-title">{t("homepage.title")}</h1>

        <p className="home-description">
          {t("homepage.description")}
        </p>

        <button className="home-button" onClick={handleGoogleLogin}>
          {t("homepage.startButton")}
        </button>
      </div>
    </div>
  );
};

export default HomePage;
