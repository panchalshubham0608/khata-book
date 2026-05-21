import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from './components/Homepage';
import ReportsPage from './components/ReportsPage';
import ReportDetailsPage from './components/ReportDetailsPage';
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { LocaleProvider } from "./i18n/locale";
import SettingsButton from "./components/SettingsButton";
import './App.css';

function App() {
  return (
    <LocaleProvider>
      <Router basename="/khata-book">
        <ScrollToTop />
        <SettingsButton />
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/reports' element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } />
          <Route path='/reports/:reportId' element={
            <ProtectedRoute>
              <ReportDetailsPage />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </LocaleProvider>
  );
}

export default App;
