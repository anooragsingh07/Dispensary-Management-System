import React, { useState, useEffect } from 'react'
import './header.css'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
const Header = (props) => {

    const location = useLocation();
    const navigate = useNavigate();
    const [eventpopup, setEventpopup] = useState(false);
    const [helpline, setHelpline] = useState(false);
    const [events, setEvenets] = useState([]);


    const handleOpenPopup = (popup) => {
        if (popup === "event") {
            setEventpopup(true);
        } else {
            setHelpline(true)
        }
    }

    const fetchEvents = async () => {
        {
            // Please watch the Video for full code
        }
    }

    useEffect(() => {
        if (eventpopup) {
            fetchEvents()

        }
    }, [eventpopup])

    const handleClosePopup = (popup) => {
        if (popup === "event") {
            setEventpopup(false);
        } else {
            setHelpline(false)
        }
    }

    const handleLogin = () => {
        navigate('/login')
    }
    const handleLogout = async () => {
        props.showLoader();
        {
            // Please watch the Video for full code
        }
    }

    return (
        <div className='header'>
            <div className='header-college-details'>
                <div className='header-college-details-left'>
                    <img className='header-college-details-left-logo' src='https://cgclerp.in/Images/DEFAULT_BG/default_logo1.png' alt='collegeLogo' />
                    <div>
                        
                        <div className='header-college-details-name'>Chandigarh Group of Colleges, </div>
                        <div className='header-college-details-place'>Sector 112, Landran,
Mohali, Punjab 140307 </div>
                    </div>
                </div>

                <div className='header-college-details-right'>
                    <div className='header-college-social-media'>
                        <a target='_blank' href='https://m.youtube.com/channel/UCnxLo8hcWhq9wIwScNpOW5g'><img src='https://cdn-icons-png.flaticon.com/128/3670/3670147.png' className='header-social-media-image' /></a>
                        <a target='_blank' href='https://www.facebook.com/ChandigarhGroupOfCollegesLandran/'><img src='https://cdn-icons-png.flaticon.com/128/733/733547.png' className='header-social-media-image' /></a>
                        <a target='_blank' href='https://x.com/CGCPUNJAB'><img src='https://cdn-icons-png.flaticon.com/128/5968/5968830.png' className='header-social-media-image' /></a>
                        <a target='_blank' href='https://www.instagram.com/cgc_landran_punjab/'><img src='https://th.bing.com/th/id/OIP.0wjhvLpjGf_-r-1lqG3QAQHaHw?rs=1&pid=ImgDetMain' className='header-social-media-image' /></a>
                    </div>
                    <input type='text' className='header-input-tags' />
                </div>
            </div>
<div className='navbar'>
    <Link
        to={'/'}
        className={`navbar-links ${location.pathname === "/" ? "active-link" : ""}`}
    >
        Home
    </Link>

    <div
        onClick={props.isLogin ? handleLogout : handleLogin}
        className={`navbar-links ${location.pathname === "/login" ? "active-link" : ""}`}
    >
        {props.isLogin ? "Logout" : "Login"}
    </div>

    <Link
        to={'/stock'}
        className={`navbar-links ${location.pathname === "/stock" ? "active-link" : ""}`}
    >
        Stock View
    </Link>

    <div
        className='navbar-links event-link'
        onMouseEnter={() => handleOpenPopup("event")}
        onMouseLeave={() => handleClosePopup("event")}
    >
        <div className='navbar-link-opt'>
            New Events <ArrowDropDownIcon />
        </div>

        {eventpopup && (
            <div className='navbar-dropdown-popup event-pop'>
                <div className='popup-notification'>ABC</div>
                <div className='popup-notification'>XYZ</div>
            </div>
        )}
    </div>

    <div
        className='navbar-links event-link'
        onMouseEnter={() => handleOpenPopup("helpline")}
        onMouseLeave={() => handleClosePopup("helpline")}
    >
        <div className='navbar-link-opt'>
            Helpline <ArrowDropDownIcon />
        </div>

        {helpline && (
            <div className='navbar-dropdown-popup helpline-pop'>
                <div className='popup-notification'>Ambulance : 112</div>
                <div className='popup-notification'>Police : 112</div>
                <div className='popup-notification'>Fire : 112</div>
            </div>
        )}
    </div>
</div>

            {
                location.pathname === "/" && <div className='header-banner'>
                    <img src={"https://yt3.googleusercontent.com/tc40vDQyANxRaCLSN3bjUC-m52zX1yZwnMWcPUcRnFXnuwRoP8S2ogAsgJAs9yr10aIHm4GKPw=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj"} className='header-banner-image' />
                </div>
            }

            <ToastContainer />
        </div>
    )
}

export default Header