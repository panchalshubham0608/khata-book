import { useState, useEffect } from "react";
import { FiShare2, FiPlus, FiUsers, FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import AmountModalInput from "./AmountModalInput";
import { signOut, type User } from "firebase/auth";
import { auth } from "../firebase/firebase";
import "./ReportsPage.css";


interface Report {
    id: string;
    title: string;
    budget: number;
    spent: number;
    shared: boolean;
}

const sampleReports: Report[] = [
    {
        id: "1",
        title: "मासिक खर्च",
        budget: 15000,
        spent: 8200,
        shared: false,
    },
    {
        id: "2",
        title: "माता-पिता की दवाइयाँ और आवश्यकताएँ",
        budget: 5000,
        spent: 4200,
        shared: true,
    },
    {
        id: "3",
        title: "सब्ज़ियाँ और किराना",
        budget: 6000,
        spent: 3400,
        shared: false,
    },
    {
        id: "4",
        title: "बिजली और पानी का बिल",
        budget: 3000,
        spent: 2100,
        shared: false,
    },
    {
        id: "5",
        title: "यात्रा और पेट्रोल खर्च",
        budget: 7000,
        spent: 500,
        shared: false,
    }
];

const ReportsPage = () => {
    console.log(auth.currentUser);
    const navigate = useNavigate();
    const [reports, setReports] = useState<Report[]>(sampleReports);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser: User | null) => {
            setUser(currentUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAddReport = (title: string, amount: string) => {
        const newReport: Report = {
            id: Date.now().toString(),
            title,
            budget: parseInt(amount),
            spent: 0,
            shared: false,
        };
        console.log(newReport);

        setReports([newReport, ...reports]);
        setIsModalOpen(false);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate("/", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <div className="reports-container">
            <div className="reports-topbar">
                {user?.photoURL && user?.displayName ?
                <span className="reports-profile">
                    <img src={user.photoURL} className="reports-profile-icon" />
                </span>
                    :
                    <FiUsers className="reports-profile-icon" />}
                <button className="reports-logout-btn" onClick={handleLogout}>
                    <FiLogOut />
                </button>
            </div>

            <h2 className="reports-title">आपके खर्चे की सूचि</h2>

            <div className="reports-list-container">
                <div className="reports-list">
                    {reports.map((report) => {
                        const percentage = Math.min((report.spent / report.budget) * 100, 100);
                        let progressColor = "#28a745";
                        if (percentage > 75) {
                            progressColor = "#dc3545";
                        } else if (percentage > 50) {
                            progressColor = "#ffc107";
                        }

                        return (
                            <div className="report-card" key={report.id} onClick={() => navigate(`/reports/${report.id}`)}>
                                <div className="report-header">
                                    <h3 className="report-title">{report.title}</h3>

                                    {report.shared && (
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
                                        खर्चा : ₹{report.spent.toLocaleString()}
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
