import { useEffect, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import api from '@/api/client';
import './header.css';

const Header = ({ isLogin, user, showLoader, hideLoader, handleLogin }) => {
  const navigate = useNavigate();
  const [eventPopup, setEventPopup] = useState(false);
  const [helplinePopup, setHelplinePopup] = useState(false);
  const [events, setEvents] = useState([]);
  const isPatient = ['student', 'employee'].includes(user?.role);
  const dashboardPath = isPatient ? '/student/' + user._id : '/admin/dashboard';
  const initials = String(user?.name || 'User')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!eventPopup) return;
    api.get('/api/notification/get')
      .then(({ data }) => setEvents(data.notifications || []))
      .catch(() => setEvents([]));
  }, [eventPopup]);

  const handleLogout = async () => {
    showLoader();
    try {
      await api.post('/api/auth/logout');
      handleLogin(null);
      toast.success('You have signed out');
      navigate('/');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to sign out. Please try again.');
    } finally {
      hideLoader();
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <Link to={isPatient ? dashboardPath : '/'} className="brand-lockup" aria-label="Campus Care home">
            <span className="brand-symbol"><LocalHospitalOutlinedIcon /></span>
            <span className="brand-copy"><strong>Campus Care</strong><small>CGC Landran</small></span>
          </Link>

          <nav className="navbar" aria-label="Main navigation">
            <div className="navbar-primary">
              {isPatient ? <NavLink to={dashboardPath} className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>My visits</NavLink> : <>
                <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>Overview</NavLink>
                <NavLink to="/stock" className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>Medicine stock</NavLink>
                {isLogin && <NavLink to={dashboardPath} className={({ isActive }) => 'nav-link' + (isActive ? ' is-active' : '')}>Workspace</NavLink>}

                <div className="nav-popover-wrap" onMouseEnter={() => setEventPopup(true)} onMouseLeave={() => setEventPopup(false)}>
                  <button type="button" className={'nav-link nav-popover-trigger' + (eventPopup ? ' is-active' : '')} aria-expanded={eventPopup} onClick={() => setEventPopup((open) => !open)}>
                    Notices <ArrowDropDownIcon fontSize="small" />
                  </button>
                  {eventPopup && <div className="nav-popover" role="region" aria-label="Notices">
                    <p className="popover-eyebrow">Latest updates</p>
                    {events.length ? events.map((event) => <div className="popup-notification" key={event._id}>{event.title}</div>) : <div className="popup-notification">No notices right now</div>}
                  </div>}
                </div>
              </>}
            </div>

            <div className="navbar-actions">
              {!isPatient && <div className="nav-popover-wrap" onMouseEnter={() => setHelplinePopup(true)} onMouseLeave={() => setHelplinePopup(false)}>
                <button type="button" className={'nav-link nav-popover-trigger' + (helplinePopup ? ' is-active' : '')} aria-expanded={helplinePopup} onClick={() => setHelplinePopup((open) => !open)}>
                  Help <ArrowDropDownIcon fontSize="small" />
                </button>
                {helplinePopup && <div className="nav-popover nav-popover-right" role="region" aria-label="Helplines">
                  <p className="popover-eyebrow">Campus support</p>
                  <div className="popup-notification"><strong>Emergency</strong><span>108</span></div>
                  <div className="popup-notification"><strong>Health centre</strong><span>1346-257400</span></div>
                  <div className="popup-notification"><strong>Ambulance</strong><span>Available 24 hours</span></div>
                </div>}
              </div>}
              {isLogin ? <div className="header-user">
                <Link to={dashboardPath} className="user-identity" aria-label={'Open workspace for ' + user?.name}>
                  <span className="user-avatar">{initials}</span>
                  <span className="header-user-name">{user?.name}</span>
                </Link>
                <button type="button" onClick={handleLogout} className="header-signin header-signout">Sign out</button>
              </div> : <Link to="/login" className="header-signin">Sign in</Link>}
            </div>
          </nav>
        </div>
      </header>
      <ToastContainer />
    </>
  );
};

export default Header;
