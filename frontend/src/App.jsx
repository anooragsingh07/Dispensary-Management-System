import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import api from '@/api/client';
import Header from './components/Header/header';
import Footer from './components/Footer/footer';
import Home from './pages/Home/home';
import Login from './pages/Login/login';
import Stock from './pages/Stock/stock';
import AdminDashboard from './pages/Admin/Dashboard/adminDashboard';
import RegisterStudent from './pages/Admin/RegisterStudent/registerStudent';
import ManageMedicine from './pages/Admin/ManageMedcine/manageMedicine';
import Record from './pages/Admin/Records/record';
import Facility from './pages/Admin/Facility/facility';
import NearByHospital from './pages/Admin/NearByHospital/nearByHospital';
import AdminGallary from './pages/Admin/Gallary/adminGallary';
import StudentDashboard from './pages/Student/studentDashboard';
import GlobalLoader from './components/GlobalLoader/globalLoader';

const AccessRoute = ({ loading, allowed, children }) => {
  if (loading) return <div className="session-loading">Checking your session…</div>;
  return allowed ? children : <Navigate to="/login" replace />;
};

function App() {
  const [loader, setLoader] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let active = true;
    api.get('/api/auth/me')
      .then(({ data }) => {
        if (!active) return;
        setUser(data.user);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  const handleLogin = (account) => {
    setUser(account || null);
  };

  const showLoader = () => setLoader(true);
  const hideLoader = () => setLoader(false);
  const isStaff = ['admin', 'staff'].includes(user?.role);
  const isClinical = ['admin', 'doctor', 'staff'].includes(user?.role);
  const isStudent = user?.role === 'student';
  const dashboardPath = isStudent ? `/student/${user._id}` : '/admin/dashboard';

  return (
    <div className="App">
      <Header
        isLogin={Boolean(user)}
        user={user}
        showLoader={showLoader}
        hideLoader={hideLoader}
        handleLogin={handleLogin}
      />
      <Routes>
        <Route path="/" element={<Home showLoader={showLoader} hideLoader={hideLoader} user={user} />} />
        <Route path="/login" element={checkingSession ? null : user ? <Navigate to={dashboardPath} replace /> : <Login handleLogin={handleLogin} showLoader={showLoader} hideLoader={hideLoader} />} />
        <Route path="/stock" element={<Stock showLoader={showLoader} hideLoader={hideLoader} />} />
        <Route path="/admin/dashboard" element={<AccessRoute loading={checkingSession} allowed={isClinical}><AdminDashboard user={user} showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/admin/register-student" element={<AccessRoute loading={checkingSession} allowed={isClinical}><RegisterStudent showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/admin/manage-medicine" element={<AccessRoute loading={checkingSession} allowed={isStaff}><ManageMedicine showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/admin/records" element={<AccessRoute loading={checkingSession} allowed={isClinical}><Record showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/admin/facility" element={<AccessRoute loading={checkingSession} allowed={isStaff}><Facility showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/admin/near-by-hospital" element={<AccessRoute loading={checkingSession} allowed={isStaff}><NearByHospital showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/admin/gallary" element={<AccessRoute loading={checkingSession} allowed={isStaff}><AdminGallary showLoader={showLoader} hideLoader={hideLoader} /></AccessRoute>} />
        <Route path="/student/:id" element={<AccessRoute loading={checkingSession} allowed={isStudent}><StudentDashboard showLoader={showLoader} hideLoader={hideLoader} user={user} /></AccessRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
      {loader && <GlobalLoader />}
    </div>
  );
}

export default App;
