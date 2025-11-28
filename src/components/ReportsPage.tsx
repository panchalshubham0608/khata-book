import { useState } from "react";
import "./ReportsPage.css";
import { FiShare2, FiPlus } from "react-icons/fi";
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
    const [reports, setReports] = useState<Report[]>(sampleReports);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newBudget, setNewBudget] = useState("");

    const handleAddReport = () => {
        if (!newTitle || !newBudget) return;

        const newReport: Report = {
            id: Date.now().toString(),
            title: newTitle,
            budget: parseInt(newBudget),
            spent: 0,
            shared: false,
        };
        console.log(newReport);

        setReports([newReport, ...reports]);
        setNewTitle("");
        setNewBudget("");
        setIsModalOpen(false);
    };

    return (
        <div className="reports-container">
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
                            <div className="report-card" key={report.id}>
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
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>नई रिपोर्ट जोड़ें</h3>
                        <input
                            type="text"
                            placeholder="रिपोर्ट का नाम"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <input
                            type="number"
                            placeholder="बजट राशि"
                            value={newBudget}
                            onChange={(e) => setNewBudget(e.target.value)}
                        />
                        <button className="modal-add-btn" onClick={handleAddReport}>
                            जोड़ें
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportsPage;
