import React, { useEffect, useState } from "react";
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
import {
  FiTrendingUp,
  FiUsers,
  FiUploadCloud,
  FiArrowRight,
  FiGlobe,
} from "react-icons/fi";
import { useTranslation } from "../i18n/locale";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t, locale, setLocale } = useTranslation();
  const { alert, showAlert } = useAlert();
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const handleNativeGoogleSignIn = (event: Event) => {
      const customEvent = event as CustomEvent<{ idToken: string }>;
      const idToken = customEvent.detail.idToken;
      const credential = GoogleAuthProvider.credential(idToken);

      setLoading(true);
      signInWithCredential(auth, credential)
        .catch(() => {
          console.error("Native Google sign-in failed");
          showAlert(t("homepage.loginError"), "error");
        })
        .finally(() => {
          setLoading(false);
        });
    };

    const handleNativeGoogleSignInError = () => {
      console.error("Native Google sign-in error");
      setLoading(false);
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
      setLoading(true);
      window.Android.signInWithGoogle();
      return;
    }

    try {
      setLoading(true);
      console.log("[WEB] Using signInWithPopup()");
      await signInWithPopup(auth, googleProvider);
      navigate("/reports");
    } catch {
      console.error("Google Login Error");
      showAlert(t("homepage.loginError"), "error");
    } finally {
      setLoading(false);
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
      <Loader visible={loading} />

      <div className="home-bg-orb orb-primary" aria-hidden="true" />
      <div className="home-bg-orb orb-secondary" aria-hidden="true" />

      <header className="home-topbar">
        <div
          className="home-lang-pill"
          role="group"
          aria-label={t("language.label")}
        >
          <FiGlobe size={14} className="home-lang-icon" />
          <button
            type="button"
            className={`home-lang-btn ${locale === "en" ? "is-active" : ""}`}
            onClick={() => setLocale("en")}
          >
            EN
          </button>
          <button
            type="button"
            className={`home-lang-btn ${locale === "hi" ? "is-active" : ""}`}
            onClick={() => setLocale("hi")}
          >
            हिं
          </button>
        </div>
      </header>

      <main className="home-card">
        <div className="home-hero-banner">
          <div className="home-logo-ring">
            <img src={logo} className="home-logo" alt="Khata Book Logo" />
          </div>
          <span className="home-badge">{t("homepage.badge")}</span>
          <h1 className="home-title">{t("homepage.title")}</h1>
          <p className="home-description">{t("homepage.description")}</p>
        </div>

        <div className="home-features">
          <div className="home-feature-item">
            <span className="home-feature-icon track">
              <FiTrendingUp size={16} />
            </span>
            <span className="home-feature-text">
              {t("homepage.featureTrack")}
            </span>
          </div>

          <div className="home-feature-item">
            <span className="home-feature-icon share">
              <FiUsers size={16} />
            </span>
            <span className="home-feature-text">
              {t("homepage.featureShare")}
            </span>
          </div>

          <div className="home-feature-item">
            <span className="home-feature-icon backup">
              <FiUploadCloud size={16} />
            </span>
            <span className="home-feature-text">
              {t("homepage.featureBackup")}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="home-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="home-google-badge" aria-hidden="true">
            G
          </span>
          <span>{t("homepage.startButton")}</span>
          <FiArrowRight size={17} className="home-button-arrow" />
        </button>
      </main>
    </div>
  );
};

export default HomePage;

