import './App.css';
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import NotFound from './pages/NotFound';
import Login from './auth/Login';
import Regiter from './auth/Register';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import Account from './pages/Account';
import ManageService from './pages/ManageService';
import Messenger from './pages/Messenger';
import ChangePassword from './auth/ChangePassword';
import ChangePasswordFirstLogin from './auth/ChangePasswordFirstLogin';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import DentistWorkingTime from './pages/DentistWorkingTime';
import Appointment from './pages/Appointment';
import ManageMedicine from './pages/ManageMedicine';
import MedicalRecord from './pages/MedicalRecord';
import Promotion from './pages/Promotion';
import Payment from './pages/Payment';
import DentistProfile from './pages/DentistProfile';
import Notification from './pages/Notification';
import Review from './pages/Review';
import Service from './pages/Service';

const ProtectedRoute = ({ children, roles }) => {
  const token = localStorage.getItem("token");
  const rawUser = localStorage.getItem("user");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  let user = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (error) {
      console.error("Failed to parse stored user", error);
    }
  }

  if (roles?.length && (!user || !roles.includes(user.role))) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

function App() {
  const protectedRoutes = [
    { path: "/home", element: <HomePage /> },
    { path: "/dashboard", element: <Dashboard />, roles: ["Admin", "Staff", "Dentist"] },
    { path: "/accounts", element: <Account />, roles: ["Admin", "Staff"] },
    { path: "/manage-service", element: <ManageService />, roles: ["Admin", "Staff"] },
    { path: "/messenger", element: <Messenger /> },
    { path: "/change-password", element: <ChangePassword /> },
    { path: "/change-pasword-first-login", element: <ChangePasswordFirstLogin /> },
    { path: "/profile", element: <Profile /> },
    { path: "/dentist-working-time", element: <DentistWorkingTime />, roles: ["Admin", "Staff", "Dentist"] },
    { path: "/appointment", element: <Appointment /> },
    { path: "/manage-medicine", element: <ManageMedicine />, roles: ["Admin", "Staff"] },
    { path: "/medical-record", element: <MedicalRecord />, roles: ["Admin", "Staff", "Dentist"] },
    { path: "/promotion", element: <Promotion />, roles: ["Admin", "Staff"] },
    { path: "/payment", element: <Payment /> },
    { path: "/notification", element: <Notification /> },
    { path: "/dentist-profile", element: <DentistProfile /> },
    { path: "/review", element: <Review /> },
    { path: "/service", element: <Service /> }
  ];

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Regiter />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          {protectedRoutes.map(({ path, element, roles }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute roles={roles}>
                  {element}
                </ProtectedRoute>
              }
            />
          ))}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;