import { useState, useEffect, useCallback } from "react";
import { FiShare2, FiPlus, FiUsers, FiFileText } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AmountModalInput from "./AmountModalInput";
import { signOut, type User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./ReportsPage.css";
import type { Report } from "../firebase/types";
import { createReport, getReports } from "../firebase/reportService";
import { useAlert } from "../hooks/useAlert";
import Alert from "./Alert";
import Loader from "./Loader";
import { isShared, spentAmount, topupAmount } from "../utils/reportUtils";
import ReportsHamburger from "./ReportsHamburger";

const ReportsPage = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [showDeleted, setShowDeleted] = useState<boolean>(() => {
        const stored = localStorage.getItem("showDeleted");
        return stored === "true"; // converts string "true" to boolean true, everything else is false
    });
    const { alert, showAlert } = useAlert();

    const fetchReports = useCallback(async (email: string) => {
        try {
            setLoading(true);
            const userReports = await getReports(email, { showDeleted });
            setReports(userReports);
        } catch (err) {
            console.error(err);
            showAlert("रिपोर्ट लाने में समस्या हुई", "error");
        } finally {
            setLoading(false);
        }
    }, [setLoading, getReports, setReports, showAlert, showDeleted]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user?.email) {
                setUser(user);
                fetchReports(user.email);
            } else {
                setReports([]);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user?.email) fetchReports(user.email);
    }, [user, fetchReports]);

    const toggleShowDeleted = () => {
        setShowDeleted((prev) => {
            const next = !prev;
            localStorage.setItem("showDeleted", next.toString());
            return next;
        });
    };


    const handleAddReport = async (title: string, amount: number) => {
        try {
            setLoading(true);
            await createReport({ title, budget: amount });
            setIsModalOpen(false);

            // Refetch reports after adding
            if (auth.currentUser?.email) {
                await fetchReports(auth.currentUser.email);
            }
        } catch (err) {
            console.error(err);
            showAlert("रिपोर्ट बनाने में समस्या हुई", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            setLoading(true);
            await signOut(auth);
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reports-container">
            <Alert alert={alert} />
            <Loader visible={loading} />
            <ReportsHamburger
                showDeleted={showDeleted}
                toggleShowDeleted={toggleShowDeleted}
                handleLogout={handleLogout}
            />
            <div className="reports-topbar">
                {user?.photoURL && user?.displayName ?
                    <span className="reports-profile">
                        <img src={user.photoURL} className="reports-profile-icon" />
                    </span>
                    :
                    <FiUsers className="reports-profile-icon" />}
            </div>

            <h2 className="reports-title">आपके खर्चे की सूचि</h2>

            <div className="reports-list-container">
                <div className="reports-list">
                    {reports.map((report) => {
                        const percentage = Math.min((spentAmount(report) / (report.budget + topupAmount(report))) * 100, 100);
                        let progressColor = "#28a745";
                        if (percentage > 75) {
                            progressColor = "#dc3545";
                        } else if (percentage > 50) {
                            progressColor = "#ffc107";
                        }

                        return (
                            <div className={`report-card ${report.deleted && "report-deleted"}`} key={report.id} onClick={() => navigate(`/reports/${report.id}`)}>
                                <div className="report-header">
                                    <h3 className="report-title">{report.title}</h3>

                                    {isShared(report, user?.email) && (
                                        <span className="shared-badge">
                                            <FiShare2 size={14} /> साझा
                                        </span>
                                    )}
                                </div>

                                <div className="report-info">
                                    <p className="report-budget">
                                        बजट : ₹{report.budget.toLocaleString()}
                                    </p>
                                    <p className="report-spent">
                                        खर्चा : ₹{spentAmount(report).toLocaleString()}
                                    </p>
                                </div>

                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${percentage}%`, backgroundColor: progressColor }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                    {reports.length === 0 &&
                        <div className="no-reports-container">
                            <FiFileText size={48} className="no-reports-icon" />
                            <p className="no-reports-text">अभी कोई रिपोर्ट नहीं है</p>
                            <p className="no-reports-subtext">नई रिपोर्ट बनाने के लिए नीचे का बटन दबाएँ</p>
                        </div>}
                </div>
            </div>

            {/* Floating Add Button */}
            <button className="add-report-btn" onClick={() => setIsModalOpen(true)}>
                <FiPlus size={24} />
            </button>

            {/* Modal */}
            {isModalOpen && (
                <AmountModalInput
                    header="नई रिपोर्ट जोड़ें"
                    titlePlaceholder="रिपोर्ट का नाम"
                    amountPlaceholder="बजट राशि"
                    onReject={() => setIsModalOpen(false)}
                    onAccept={handleAddReport}
                />
            )}

        </div>
    );
};

export default ReportsPage;
