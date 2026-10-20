import { useCallback, useEffect, useState } from 'react';
import './studentDashboard.css';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import Modal from '../../components/Modal/modal';
import StudentModal from './StudentModal/studentModal';
import axios from '@/api/client';
import { toast, ToastContainer } from 'react-toastify';

const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const StudentDashboard = (props) => {
  const { showLoader, hideLoader } = props;
  const userInfo = props.user;
  const isEmployee = userInfo?.role === 'employee' || userInfo?.recordType === 'employee';
  const campusId = isEmployee ? userInfo?.employeeId || userInfo?.roll : userInfo?.roll;
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [modal, setModal] = useState(false);

  const fetchData = useCallback(async () => {
    showLoader();
    await axios.get('/api/consultations/mine').then((resp) => {
      setHistory(resp.data.consultations || []);
    }).catch((err) => {
      toast.error(err?.response?.data?.error || 'Unable to load your visit history');
    }).finally(() => { hideLoader(); setHistoryLoading(false); });
  }, [hideLoader, showLoader]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openHistory = (item) => {
    setSelectedHistory(item);
    setModal(true);
  };

  const closeHistory = () => {
    setModal(false);
    setSelectedHistory(null);
  };

  const initials = String(userInfo?.name || 'Student').split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  const upcomingFollowUp = history
    .filter((visit) => visit.followUpAt && new Date(visit.followUpAt).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.followUpAt) - new Date(b.followUpAt))[0];

  return (
    <main className="student-dashboard">
      <header className="student-page-heading">
        <div>
          <p className="eyebrow"><span className="eyebrow-dot" /> {isEmployee ? 'EMPLOYEE PORTAL' : 'STUDENT PORTAL'}</p>
          <h1>Your campus health.</h1>
          <p>Your consultation history and prescriptions in one place.</p>
        </div>
        <div className="student-identity-card">
          <span className="student-avatar">{initials}</span>
          <span><strong>{userInfo?.name}</strong><small>{isEmployee ? 'College employee' : 'Student'} account · {campusId}</small></span>
        </div>
      </header>

      <section className="student-visits">
        <div className="student-visits-heading"><div><p className="eyebrow">YOUR RECORDS</p><h2>Medical history</h2></div><span className="student-record-count">{historyLoading ? 'Loading…' : `${history.length} ${history.length === 1 ? 'record' : 'records'}`}</span></div>
        {upcomingFollowUp && <div className="student-upcoming-followup"><strong>Upcoming follow-up</strong><time dateTime={upcomingFollowUp.followUpAt}>{formatDate(upcomingFollowUp.followUpAt)}</time><span>{upcomingFollowUp.chiefComplaint || 'Consultation follow-up'}</span></div>}
        {historyLoading ? <div className="student-empty-state" role="status">Loading your visit history…</div> : history.length > 0 ? <div className="student-visits-list">
          {history.map((item) => <article className="student-visit-row" key={item._id}>
            <span className="visit-date-icon"><MedicalServicesOutlinedIcon /></span>
            <span className="visit-row-copy"><strong>{item.chiefComplaint || 'Dispensary consultation'}</strong><small>{item.diagnosis || 'Assessment not recorded'} · {item.prescriptions?.length || 0} prescribed</small></span>
            <time dateTime={item.visitAt}>{formatDate(item.visitAt)}</time>
            <button type="button" className="visit-view-button" onClick={() => openHistory(item)} aria-label={'View visit from ' + formatDate(item.visitAt)}><span>View details</span><RemoveRedEyeOutlinedIcon /></button>
          </article>)}
        </div> : <div className="student-empty-state"><span className="visit-date-icon"><MedicalServicesOutlinedIcon /></span><div><strong>No visit records yet</strong><p>Your dispensary visits will appear here when they are recorded.</p></div></div>}
      </section>

      <section className="student-profile-card" aria-label={`${isEmployee ? 'Employee' : 'Student'} health profile`}>
        <div><p className="eyebrow">YOUR PROFILE</p><h2>Health details</h2></div>
        <div className="student-profile-facts">
          <div><small>{isEmployee ? 'Employee ID' : 'Roll number'}</small><strong>{campusId || 'Not recorded'}</strong></div>
          <div><small>Email</small><strong>{userInfo?.email || 'Not recorded'}</strong></div>
          <div><small>Mobile number</small><strong>{userInfo?.mobileNo || 'Not recorded'}</strong></div>
          <div><small>Age · Blood group</small><strong>{userInfo?.age || '—'} · {userInfo?.bloodGroup || 'Not recorded'}</strong></div>
          <div className="student-profile-wide"><small>Previous health details</small><p>{userInfo?.previous_health || 'No previous health details recorded.'}</p></div>
        </div>
      </section>

      {modal && <Modal header="Visit details" handleClose={closeHistory} children={<StudentModal selectedHistory={selectedHistory} />} />}
      <ToastContainer />
    </main>
  );
};

export default StudentDashboard;
