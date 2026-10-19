import { useState } from 'react';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Diversity3OutlinedIcon from '@mui/icons-material/Diversity3Outlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AboutUs from '../../components/AboutUs/aboutUs';
import Staff from '../../components/Staffs/staff';
import Facility from '../../components/Facilities/facility';
import NearByHospitals from '../../components/NearByHospitals/nearByHospitals';
import Gallary from '../../components/Gallary/gallary';
import { Link } from 'react-router-dom';
import './home.css';

const Home = ({ showLoader, hideLoader, user }) => {
  const [page, setPage] = useState('About');
  const dashboardPath = user?.role === 'student' ? '/student/' + user._id : '/admin/dashboard';
  const sections = [
    { key: 'About', label: 'About the centre', icon: <HomeOutlinedIcon /> },
    { key: 'Staff', label: 'Staff directory', icon: <PeopleAltOutlinedIcon /> },
    { key: 'Facilities', label: 'Facilities', icon: <Diversity3OutlinedIcon /> },
    { key: 'NearByHospitals', label: 'Nearby hospitals', icon: <LocalHospitalOutlinedIcon /> },
    { key: 'Gallary', label: 'Photo gallery', icon: <ImageOutlinedIcon /> },
  ];

  const activeSection = sections.find((section) => section.key === page) || sections[0];
  const renderSection = () => {
    switch (page) {
      case 'Staff': return <Staff showLoader={showLoader} hideLoader={hideLoader} />;
      case 'Facilities': return <Facility showLoader={showLoader} hideLoader={hideLoader} />;
      case 'NearByHospitals': return <NearByHospitals showLoader={showLoader} hideLoader={hideLoader} />;
      case 'Gallary': return <Gallary showLoader={showLoader} hideLoader={hideLoader} />;
      default: return <AboutUs />;
    }
  };

  return (
    <main className="home">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> CGC Landran Health Centre</p>
          <h1>Care that keeps<br /><span>campus moving.</span></h1>
          <p className="hero-description">Find the people, medicine and support you need, all in one simple place. Your campus health centre is here for you.</p>
          <div className="hero-actions">
            <Link to="/stock" className="button-primary">Browse medicine stock <ArrowForwardRoundedIcon fontSize="small" /></Link>
            <Link to={user ? dashboardPath : '/login'} className="button-secondary">{user ? 'Open your workspace' : 'Student sign in'}</Link>
          </div>
          <div className="hero-assurance"><span className="assurance-check">✓</span> Clear health-centre information, whenever you need it.</div>
        </div>

        <div className="hero-preview" aria-label="Campus care portal overview">
          <div className="preview-topline"><span className="preview-mark"><LocalHospitalOutlinedIcon /></span><span>Campus care portal</span><span className="preview-status"><i /> Ready to help</span></div>
          <div className="preview-heading"><p className="preview-kicker">YOUR HEALTH CENTRE</p><h2>Everything in<br />one place.</h2><p>Support for every campus day.</p></div>
          <div className="preview-links">
            <Link to="/stock" className="preview-link"><span className="preview-link-icon"><Inventory2OutlinedIcon /></span><span><strong>Medicine stock</strong><small>Check current availability</small></span><ArrowForwardRoundedIcon /></Link>
            <div className="preview-link"><span className="preview-link-icon preview-link-muted"><PeopleAltOutlinedIcon /></span><span><strong>Care team</strong><small>Meet your health-centre staff</small></span><ArrowForwardRoundedIcon /></div>
          </div>
          <div className="preview-footnote"><span className="preview-mini-avatar">CG</span><span>Made for the CGC campus community</span></div>
        </div>
      </section>

      <section className="home-benefits" aria-label="Campus care highlights">
        <div><span className="benefit-number">01</span><span><strong>One trusted place</strong><small>Health-centre details at a glance</small></span></div>
        <div><span className="benefit-number">02</span><span><strong>Helpful resources</strong><small>Staff, facilities and nearby care</small></span></div>
        <div><span className="benefit-number">03</span><span><strong>Private student access</strong><small>Your visit history stays in your account</small></span></div>
      </section>

      <section className="home-discover">
        <div className="discover-heading">
          <div><p className="eyebrow">CAMPUS HEALTH, MADE SIMPLE</p><h2>Find what you need.</h2></div>
          <p>Explore the people and services supporting student wellbeing at CGC Landran.</p>
        </div>
        <div className="home-directory">
          <div className="home-tabs" role="tablist" aria-label="Health centre information">
            {sections.map((section) => <button
              type="button"
              role="tab"
              id={'tab-' + section.key}
              aria-selected={page === section.key}
              className={'home-tab' + (page === section.key ? ' is-selected' : '')}
              key={section.key}
              onClick={() => setPage(section.key)}
            >{section.icon}<span>{section.label}</span><ArrowForwardRoundedIcon className="home-tab-arrow" /></button>)}
          </div>
          <section className="home-panel" role="tabpanel" aria-labelledby={'tab-' + activeSection.key}>
            <div className="home-panel-heading"><div><p className="eyebrow">CGC HEALTH CENTRE</p><h3>{activeSection.label}</h3></div><span className="home-panel-icon">{activeSection.icon}</span></div>
            <div className="home-panel-content">{renderSection()}</div>
          </section>
        </div>
      </section>
    </main>
  );
};

export default Home;
