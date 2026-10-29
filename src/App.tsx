import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";
import HomePage from './components/Homepage';
import ReportsPage from './components/ReportsPage';
import ReportDetailsPage from './components/ReportDetailsPage';
import TrashPage from './components/TrashPage';
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { LocaleProvider } from "./i18n/locale";
import './App.css';

function App() {
  const isAndroid = import.meta.env.MODE === "android";
  const Router = isAndroid ? HashRouter : BrowserRouter;

  return (
    <LocaleProvider>
      <Router basename={isAndroid ? "" : "/khata-book"}>
        <ScrollToTop />
        <Routes>
          <Route path='/' element={<HomePage />} />
          <Route path='/reports' element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } />
          <Route path='/trash' element={
            <ProtectedRoute>
              <TrashPage />
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
