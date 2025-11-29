import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from './components/Homepage';
import ReportsPage from './components/ReportsPage';
import ReportDetailsPage from './components/ReportDetailsPage';
import ScrollToTop from "./components/ScrollToTop";
import './App.css';

function App() {
  return (
    <Router basename="/khata-book">
      <ScrollToTop />
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/reports' element={<ReportsPage />} />
        <Route path='/reports/:reportId' element={<ReportDetailsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
