import { useState } from 'react';
import { Link } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import LocalHospitalOutlinedIcon from '@mui/icons-material/LocalHospitalOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import Modal from '../../../components/Modal/modal';
import ManageStaff from './ManageStaff/manageStaff';
import ManageEvent from './ManageEvent/manageEvent';
import './adminDashboard.css';

const modules = [
  { to: '/admin/register-student', title: 'Register student', description: 'Create a student profile and record a visit.', icon: <PersonAddAlt1OutlinedIcon /> },
  { to: '/admin/manage-medicine', title: 'Medicine stock', description: 'Review quantities and update medicine details.', icon: <Inventory2OutlinedIcon /> },
  { to: '/admin/records', title: 'Visit records', description: 'Browse dispensary visits by month and year.', icon: <HistoryOutlinedIcon /> },
  { to: '/admin/facility', title: 'Health-centre facilities', description: 'Update the services available on campus.', icon: <MedicalServicesOutlinedIcon /> },
  { to: '/admin/near-by-hospital', title: 'Nearby hospitals', description: 'Keep local hospital contacts up to date.', icon: <LocalHospitalOutlinedIcon /> },
  { to: '/admin/gallary', title: 'Photo gallery', description: 'Manage health-centre photos and updates.', icon: <PhotoLibraryOutlinedIcon /> },
];

const AdminDashboard = (props) => {
  const [manageStaffModal, setManageStaffModal] = useState(false);
  const [eventModal, setEventModal] = useState(false);
  const userInfo = props.user;
  const isAdministrator = userInfo?.role === 'admin';
  const isDoctor = userInfo?.role === 'doctor';
  const visibleModules = isDoctor
    ? modules.filter((item) => ['/admin/register-student', '/admin/records'].includes(item.to))
    : modules;

  const openCloseModal = (value) => {
    if (value === 'event') setEventModal((open) => !open);
    else setManageStaffModal((open) => !open);
  };

  return (
    <main className="adminDashboard">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> {isDoctor ? 'CLINICAL WORKSPACE' : 'DISPENSARY WORKSPACE'}</p>
          <h1>Good to see you, <span>{userInfo?.name || 'Admin'}</span></h1>
          <p>{isDoctor ? 'Find student records and document campus health consultations.' : 'Keep campus health services organized from one place.'}</p>
        </div>
        {isAdministrator && <div className="workspace-actions">
          <button type="button" className="button-secondary" onClick={() => openCloseModal('staff')}>Manage staff</button>
          <button type="button" className="button-primary" onClick={() => openCloseModal('event')}>Publish a notice</button>
        </div>}
      </header>

      <div className="workspace-section-heading"><div><p className="eyebrow">{isDoctor ? 'PATIENT CARE' : 'CENTRE OPERATIONS'}</p><h2>{isDoctor ? 'Student care records' : 'What would you like to manage?'}</h2></div><span>{isDoctor ? 'Choose a clinical workspace' : 'Choose a workspace'}</span></div>
      <section className="admin-dashboard-cards" aria-label="Dispensary management tools">
        {visibleModules.map((item, index) => <Link to={item.to} className="admin-dashboard-card" key={item.to}>
          <span className="dashboard-card-icon">{item.icon}</span>
          <span className="dashboard-card-copy"><small>0{index + 1}</small><strong>{item.title}</strong><span>{item.description}</span></span>
          <ArrowForwardRoundedIcon className="dashboard-card-arrow" />
        </Link>)}
      </section>

      {manageStaffModal && <Modal value="staff" handleClose={openCloseModal} header="Manage staff" children={<ManageStaff showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
      {eventModal && <Modal value="event" handleClose={openCloseModal} header="Publish a notice" children={<ManageEvent showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
    </main>
  );
};

export default AdminDashboard;
