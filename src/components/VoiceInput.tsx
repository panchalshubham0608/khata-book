import React, { useState } from "react";
import { FiMic } from "react-icons/fi";
import VoicePopup from "./VoicePopup";
import "./VoiceInput.css";

interface VoiceInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ value, onChange, placeholder }) => {
    const [showVoicePopup, setShowVoicePopup] = useState(false);

    return (
        <div className="voice-input-group">
            <input
                type="text"
                className="voice-input-field"
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
            />

            <button
                className="voice-input-button"
                onClick={() => setShowVoicePopup(true)}
            >
                <FiMic size={20} />
            </button>

            {showVoicePopup && (
                <VoicePopup
                    onResult={(text) => {
                        onChange(text);
                        setShowVoicePopup(false);
                    }}
                    onClose={() =>
                        setShowVoicePopup(false)}
                />
            )}
        </div>
    );
};

export default VoiceInput;

