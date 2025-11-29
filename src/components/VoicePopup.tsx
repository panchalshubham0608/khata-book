import React, { useEffect } from "react";
import "./VoicePopup.css";

interface VoicePopupProps {
    onResult: (text: string) => void;
    onClose: () => void;
}

const VoicePopup: React.FC<VoicePopupProps> = ({ onResult, onClose }) => {
    useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            onClose();
            return;
        }

        const recognition = new SpeechRecognition();

        recognition.lang = "hi-IN"; // Hindi
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.start();

        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript;
            onResult(text);
        };

        recognition.onerror = () => {
            onClose();
        };

        recognition.onend = () => {
            onClose();
        };
    }, []);

    return (
        <div className="voice-popup-overlay">
            <div className="voice-popup-box">
                <div className="voice-popup-text">🎤 बोलिए, मैं सुन रहा हूँ…</div>
            </div>
        </div>
    );
};

export default VoicePopup;
