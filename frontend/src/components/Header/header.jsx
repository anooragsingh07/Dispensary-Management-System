import { useEffect, useState } from 'react';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import api from '@/api/client';
import './header.css';

const Header = ({ isLogin, user, showLoader, hideLoader, handleLogin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [eventPopup, setEventPopup] = useState(false);
  const [helplinePopup, setHelplinePopup] = useState(false);
  const [events, setEvents] = useState([]);

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
    <div className="header">
      <div className="header-college-details">
        <div className="header-college-details-left">
          <img className="header-college-details-left-logo" src="https://cgclerp.in/Images/DEFAULT_BG/default_logo1.png" alt="Chandigarh Group of Colleges logo" />
          <div>
            <div className="header-college-details-name">Chandigarh Group of Colleges</div>
            <div className="header-college-details-place">Sector 112, Landran, Mohali, Punjab 140307</div>
          </div>
        </div>
        <div className="header-college-details-right">
          <div className="header-college-social-media">
            <a target="_blank" rel="noreferrer" href="https://m.youtube.com/channel/UCnxLo8hcWhq9wIwScNpOW5g" aria-label="YouTube"><img alt="" src="https://cdn-icons-png.flaticon.com/128/3670/3670147.png" className="header-social-media-image" /></a>
            <a target="_blank" rel="noreferrer" href="https://www.facebook.com/ChandigarhGroupOfCollegesLandran/" aria-label="Facebook"><img alt="" src="https://cdn-icons-png.flaticon.com/128/733/733547.png" className="header-social-media-image" /></a>
            <a target="_blank" rel="noreferrer" href="https://x.com/CGCPUNJAB" aria-label="X"><img alt="" src="https://cdn-icons-png.flaticon.com/128/5968/5968830.png" className="header-social-media-image" /></a>
            <a target="_blank" rel="noreferrer" href="https://www.instagram.com/cgc_landran_punjab/" aria-label="Instagram"><img alt="" src="https://th.bing.com/th/id/OIP.0wjhvLpjGf_-r-1lqG3QAQHaHw?rs=1&pid=ImgDetMain" className="header-social-media-image" /></a>
          </div>
        </div>
      </div>

      <nav className="navbar" aria-label="Main navigation">
        <Link to="/" className={`navbar-links ${location.pathname === '/' ? 'active-link' : ''}`}>Home</Link>
        <button type="button" onClick={isLogin ? handleLogout : () => navigate('/login')} className={`navbar-links ${location.pathname === '/login' ? 'active-link' : ''}`}>
          {isLogin ? `Sign out${user?.name ? ` (${user.name})` : ''}` : 'Sign in'}
        </button>
        <Link to="/stock" className={`navbar-links ${location.pathname === '/stock' ? 'active-link' : ''}`}>Medicine stock</Link>
        <div className="navbar-links event-link" onMouseEnter={() => setEventPopup(true)} onMouseLeave={() => setEventPopup(false)}>
          <button type="button" className="navbar-link-opt" aria-expanded={eventPopup} onClick={() => setEventPopup((open) => !open)}>
            Notices <ArrowDropDownIcon />
          </button>
          {eventPopup && <div className="navbar-dropdown-popup event-pop">
            {events.length ? events.map((event) => <div className="popup-notification" key={event._id}>{event.title}</div>) : <div className="popup-notification">No notices right now</div>}
          </div>}
        </div>
        <div className="navbar-links event-link" onMouseEnter={() => setHelplinePopup(true)} onMouseLeave={() => setHelplinePopup(false)}>
          <button type="button" className="navbar-link-opt" aria-expanded={helplinePopup} onClick={() => setHelplinePopup((open) => !open)}>
            Helplines <ArrowDropDownIcon />
          </button>
          {helplinePopup && <div className="navbar-dropdown-popup helpline-pop">
            <div className="popup-notification">Emergency: 108</div>
            <div className="popup-notification">Health Centre: 1346-257400</div>
            <div className="popup-notification">Ambulance available 24 hours</div>
          </div>}
        </div>
      </nav>

      {location.pathname === '/' && <div className="header-banner">
        <img alt="CGC campus" src="https://yt3.googleusercontent.com/tc40vDQyANxRaCLSN3bjUC-m52zX1yZwnMWcPUcRnFXnuwRoP8S2ogAsgJAs9yr10aIHm4GKPw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj" className="header-banner-image" />
      </div>}
      <ToastContainer />
    </div>
  );
};

export default Header;
