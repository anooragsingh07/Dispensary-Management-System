import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <span className="footer-brand-mark"><LocalHospitalOutlinedIcon /></span>
        <div className="footer-brand-name">Campus Care</div>
        <p>CGC Landran Health Centre<br />Sector 112, Landran, Mohali, Punjab 140307</p>
      </div>

      <div className="footer-links">
        <h2>Explore</h2>
        <Link to="/">Health centre</Link>
        <Link to="/stock">Medicine stock</Link>
        <Link to="/login">Student portal</Link>
      </div>

      <div className="footer-links">
        <h2>College resources</h2>
        <a href="https://www.cgc.edu.in/anti-ragging-committee" target="_blank" rel="noreferrer">Anti-ragging initiative</a>
        <a href="https://www.cgc.edu.in/student-grievance-redressal-committee" target="_blank" rel="noreferrer">Grievance cell</a>
        <a href="https://www.cgc.edu.in/college-rules-regulations" target="_blank" rel="noreferrer">College rules</a>
      </div>

      <div className="footer-contact">
        <h2>Need help?</h2>
        <a href="tel:18002003575"><PhoneOutlinedIcon /> 1800-200-3575</a>
        <a href="https://www.cgc.edu.in/" target="_blank" rel="noreferrer"><LanguageOutlinedIcon /> cgc.edu.in</a>
        <span><LocalHospitalOutlinedIcon /> Emergency support: 108</span>
      </div>

      <div className="footer-bottom"><span>© {new Date().getFullYear()} CGC Landran</span><span>Campus health, all in one place.</span></div>
    </div>
  </footer>
);

export default Footer;
