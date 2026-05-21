import React, { useEffect } from "react";
import "./Homepage.css";
import logo from "../assets/logo192.png";
import { auth, googleProvider } from "../firebase/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "../i18n/locale";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/reports");
    } catch (error) {
      console.error("Google Login Error:", error);
      alert(t("homepage.loginError"));
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
