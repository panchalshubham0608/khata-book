import React, { useEffect } from "react";
import "./Homepage.css";
import logo from "../assets/logo192.png";
import { auth, googleProvider } from "../firebase/firebase";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate("/reports");
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Google लॉगिन नहीं हो पाया, कृपया फिर कोशिश करें");
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

        <h1 className="home-title">खाता बुक</h1>

        <p className="home-description">
          साफ़-सुथरे और आसान इंटरफ़ेस के साथ अपने दैनिक खर्चों को आसानी से ट्रैक करें।
          अपने खाता-बही को पहले से कहीं बेहतर तरीके से मैनेज करें।
        </p>

        <button className="home-button" onClick={handleGoogleLogin}>
          शुरू करे
        </button>
      </div>
    </div>
  );
};

export default HomePage;
