import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    FiMic,
    FiCheck,
    FiRefreshCw,
    FiX,
    FiKey,
    FiAlertCircle,
} from "react-icons/fi";
import {
    analyzeExpenseAudioWithGemini,
    type GeminiAudioAnalysisResult,
} from "../services/geminiAudioService";
import { useTranslation } from "../i18n/locale";
import "./GeminiVoiceRecorderModal.css";

interface GeminiVoiceRecorderModalProps {
    apiKey: string;
    onClose: () => void;
    onOpenKeySettings: () => void;
    onExtracted: (result: GeminiAudioAnalysisResult) => void;
}

type RecorderPhase = "recording" | "analyzing" | "error";

const PREFERRED_MIME_TYPES = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
];

function pickSupportedAudioMime(): string {
    if (typeof MediaRecorder === "undefined") return "";
    for (const candidate of PREFERRED_MIME_TYPES) {
        if (
            typeof MediaRecorder.isTypeSupported === "function" &&
            MediaRecorder.isTypeSupported(candidate)
        ) {
            return candidate;
        }
    }
    return "";
}

function formatSeconds(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

const GeminiVoiceRecorderModal: React.FC<GeminiVoiceRecorderModalProps> = ({
    apiKey,
    onClose,
    onOpenKeySettings,
    onExtracted,
}) => {
    const { t, locale } = useTranslation();
    const [phase, setPhase] = useState<RecorderPhase>("recording");
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [isKeyError, setIsKeyError] = useState<boolean>(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<number | null>(null);
    const unmountedRef = useRef<boolean>(false);

    const stopMediaTracks = useCallback(() => {
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    const launchMediaRecorder = useCallback(async () => {
        chunksRef.current = [];

        if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices ||
            typeof navigator.mediaDevices.getUserMedia !== "function"
        ) {
            await Promise.resolve();
            if (!unmountedRef.current) {
                setPhase("error");
                setErrorMessage(t("gemini.micNotSupported"));
            }
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            if (unmountedRef.current) {
                stream.getTracks().forEach((track) => track.stop());
                return;
            }
            mediaStreamRef.current = stream;

            const mimeType = pickSupportedAudioMime();
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);

            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.start(250);

            timerRef.current = window.setInterval(() => {
                setElapsedSeconds((prev) => prev + 1);
            }, 1000);
        } catch {
            stopMediaTracks();
            if (!unmountedRef.current) {
                setPhase("error");
                setErrorMessage(t("gemini.micPermissionError"));
            }
        }
    }, [stopMediaTracks, t]);

    const handleRetryRecording = useCallback(() => {
        setErrorMessage("");
        setIsKeyError(false);
        setElapsedSeconds(0);
        setPhase("recording");
        launchMediaRecorder();
    }, [launchMediaRecorder]);

    useEffect(() => {
        unmountedRef.current = false;
        launchMediaRecorder();
        return () => {
            unmountedRef.current = true;
            if (
                mediaRecorderRef.current &&
                mediaRecorderRef.current.state !== "inactive"
            ) {
                try {
                    mediaRecorderRef.current.stop();
                } catch {
                    // ignore
                }
            }
            stopMediaTracks();
        };
    }, [launchMediaRecorder, stopMediaTracks]);

    const handleStopAndAnalyze = useCallback(() => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        setPhase("analyzing");
        if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const finalizeAnalysis = async () => {
            const mimeType =
                recorder.mimeType || pickSupportedAudioMime() || "audio/webm";
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            stopMediaTracks();

            if (audioBlob.size === 0) {
                setPhase("error");
                setErrorMessage(t("gemini.emptyAudioError"));
                return;
            }

            try {
                const result = await analyzeExpenseAudioWithGemini(
                    audioBlob,
                    apiKey,
                    locale
                );
                if (unmountedRef.current) return;

                if (result.expenses.length === 0) {
                    setPhase("error");
                    setErrorMessage(
                        result.transcript
                            ? t("gemini.noExpensesWithTranscript", {
                                transcript: result.transcript,
                            })
                            : t("gemini.noExpensesDetected")
                    );
                    return;
                }

                onExtracted(result);
            } catch (err) {
                console.log(err);
                if (unmountedRef.current) return;
                const code = err instanceof Error ? err.message : "";
                setPhase("error");
                if (
                    code === "MISSING_API_KEY" ||
                    code === "INVALID_API_KEY_OR_REQUEST"
                ) {
                    setIsKeyError(true);
                    setErrorMessage(t("gemini.apiKeyRequestError"));
                } else {
                    setErrorMessage(t("gemini.analysisFailedError"));
                }
            }
        };

        if (recorder.state !== "inactive") {
            recorder.onstop = () => {
                finalizeAnalysis();
            };
            recorder.stop();
        } else {
            finalizeAnalysis();
        }
    }, [apiKey, locale, onExtracted, stopMediaTracks, t]);

    return (
        <div className="gemini-recorder-overlay" onClick={onClose}>
            <div
                className="gemini-recorder-box"
                role="dialog"
                aria-modal="true"
                aria-label={t("gemini.recorderTitle")}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="gemini-recorder-header">
                    <div className="gemini-recorder-title-wrap">
                        <span className="gemini-recorder-ai-badge">
                            Gemini AI
                        </span>
                        <h3 className="gemini-recorder-title">
                            {t("gemini.recorderTitle")}
                        </h3>
                    </div>
                    <button
                        type="button"
                        className="gemini-recorder-close"
                        aria-label={t("gemini.closeButton")}
                        onClick={onClose}
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {phase === "recording" && (
                    <div className="gemini-recorder-body">
                        <div className="gemini-mic-pulse-wrap">
                            <div className="gemini-mic-ring ring-1" />
                            <div className="gemini-mic-ring ring-2" />
                            <div className="gemini-mic-circle">
                                <FiMic size={28} />
                            </div>
                        </div>

                        <div className="gemini-recorder-timer">
                            {formatSeconds(elapsedSeconds)}
                        </div>

                        <p className="gemini-recorder-status">
                            {t("gemini.listeningPrompt")}
                        </p>
                        <p className="gemini-recorder-example">
                            {t("gemini.listeningExample")}
                        </p>

                        <div className="gemini-recorder-actions">
                            <button
                                type="button"
                                className="gemini-recorder-btn secondary"
                                onClick={onClose}
                            >
                                <FiX size={16} />
                                <span>{t("amountModal.cancel")}</span>
                            </button>
                            <button
                                type="button"
                                className="gemini-recorder-btn primary"
                                onClick={handleStopAndAnalyze}
                            >
                                <FiCheck size={16} />
                                <span>{t("gemini.stopAndAnalyzeButton")}</span>
                            </button>
                        </div>
                    </div>
                )}

                {phase === "analyzing" && (
                    <div className="gemini-recorder-body analyzing">
                        <div className="gemini-analyzing-spinner" />
                        <p className="gemini-recorder-status">
                            {t("gemini.analyzingStatus")}
                        </p>
                        <p className="gemini-recorder-example">
                            {t("gemini.analyzingSubtext")}
                        </p>
                    </div>
                )}

                {phase === "error" && (
                    <div className="gemini-recorder-body">
                        <div className="gemini-error-icon-circle">
                            <FiAlertCircle size={26} />
                        </div>
                        <p className="gemini-error-text">{errorMessage}</p>

                        <div className="gemini-recorder-actions">
                            {isKeyError ? (
                                <button
                                    type="button"
                                    className="gemini-recorder-btn primary"
                                    onClick={onOpenKeySettings}
                                >
                                    <FiKey size={15} />
                                    <span>{t("gemini.updateKeyButton")}</span>
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="gemini-recorder-btn secondary"
                                        onClick={onClose}
                                    >
                                        <FiX size={16} />
                                        <span>{t("amountModal.cancel")}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="gemini-recorder-btn primary"
                                        onClick={handleRetryRecording}
                                    >
                                        <FiRefreshCw size={15} />
                                        <span>{t("gemini.tryAgainButton")}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GeminiVoiceRecorderModal;
