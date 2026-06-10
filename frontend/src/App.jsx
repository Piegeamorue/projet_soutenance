import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Register from './pages/auth/Register'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import RecoverAccount from './pages/auth/RecoverAccount'
import AdminPanel from './pages/admin/AdminPanel.jsx'
import Landing from "./pages/Landing";
import Chat from './pages/consultation/Chat'
import Home from './pages/patient/Home'
import Classement from './pages/Classement'
import DoctorProfile from './pages/patient/DoctorProfile'
import DoctorDashboard from './pages/doctor/DoctorDashboard'
import VerifyPrescription from './pages/VerifyPrescription'
import InfoPage from './pages/InfoPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/recover-account" element={<RecoverAccount />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/consultation/:consultationId/chat" element={<Chat />} />
        <Route path="/doctor/:id" element={<DoctorProfile />} />
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/verify-prescription/:token" element={<VerifyPrescription />} />
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Home />} />
        <Route path="/classement" element={<Classement />} />
        <Route path="/info" element={<InfoPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App