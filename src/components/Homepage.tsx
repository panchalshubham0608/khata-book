import React from "react";
import "./Homepage.css";
import logo from "../assets/logo192.png";
import { Link } from "react-router-dom";


const HomePage: React.FC = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <img src={logo} className="home-logo" alt="Khata Book Logo" />

        <h1 className="home-title">Khata-Book</h1>

        <p className="home-description">
          साफ़-सुथरे और आसान इंटरफ़ेस के साथ अपने दैनिक खर्चों को आसानी से ट्रैक करें।
          अपने खाता-बही को पहले से कहीं बेहतर तरीके से मैनेज करें।
        </p>

        <Link to="/reports">
          <button className="home-button">
            शुरू करे
          </button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
