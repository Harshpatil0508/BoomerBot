import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/layout/Shell";
import Dashboard from './pages/Dashboard';
import Experts from './pages/Experts';
import ExpertDetail from './pages/ExpertDetail';
import Setup from './pages/Setup';
import KnowledgeAtRisk from './pages/KnowledgeAtRisk';
import Capture from './pages/Capture';
import DataScanner from './pages/DataScanner';
import Assets from './pages/Assets';
import Assistant from './pages/Assistant';
import Login from './pages/Login';
import KnowledgeNetwork from './pages/KnowledgeNetwork';
import NoSession from './pages/NoSession';
import Landing from './pages/Landing';
import Screening from './pages/Screening';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark" storageKey="boomerbot-theme">
        <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Shell />}>
            
            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/at-risk" element={<KnowledgeAtRisk />} />
              <Route path="/experts" element={<Experts />} />
              <Route path="/experts/:expertId" element={<ExpertDetail />} />
              <Route path="/setup" element={<Setup />} />
              <Route path="/scanner" element={<DataScanner />} />
              <Route path="/network" element={<KnowledgeNetwork />} />
              <Route path="/screening" element={<Screening />} />
            </Route>
            
            {/* Expert Route */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'EXPERT']} />}>
              <Route path="/capture/:sessionId" element={<Capture />} />
              <Route path="/no-session" element={<NoSession />} />
            </Route>
            
            {/* Employee/User Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'USER', 'EXPERT']} />}>
              <Route path="/assets" element={<Assets />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'USER']} />}>
              <Route path="/assistant" element={<Assistant />} />
            </Route>
            
          </Route>
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
