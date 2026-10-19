import React, { useCallback, useEffect, useState } from 'react';
import './registerStudent.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import RemoveRedEyeOutlinedIcon from '@mui/icons-material/RemoveRedEyeOutlined';
import { Link } from 'react-router-dom';
import SearchBox from '../../../components/SearchBox/searchBox';
import Modal from '../../../components/Modal/modal';
import ConsultationForm from './Report/report';
import ConsultationDetails from '../../../components/ConsultationDetails/consultationDetails';
import { toast, ToastContainer } from 'react-toastify';
import axios from '@/api/client';

const emptyStudent = { _id: '', email: '', name: '', roll: '', mobileNo: '', fatherName: '', fatherMobile: '', address: '', previous_health: '', age: '', bloodGroup: '' };
const formatDate = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date unavailable';

const RegisterStudent = (props) => {
    const [searchStudent, setSearchStudent] = useState('');
    const [reportModal, setReportModal] = useState(false);
    const [selectedConsultation, setSelectedConsultation] = useState(null);
    const [studentDetail, setStudentDetail] = useState(emptyStudent);
    const [consultations, setConsultations] = useState([]);
    const [consultationsLoading, setConsultationsLoading] = useState(false);

    const fetchConsultations = useCallback(async (studentId) => {
        if (!studentId) { setConsultations([]); return; }
        setConsultationsLoading(true);
        try {
            const { data } = await axios.get(`/api/consultations/student/${studentId}`);
            setConsultations(data.consultations || []);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Unable to load consultation history');
        } finally { setConsultationsLoading(false); }
    }, []);

    useEffect(() => {
        if (studentDetail._id) fetchConsultations(studentDetail._id);
        else setConsultations([]);
    }, [studentDetail._id, fetchConsultations]);

    const handleOnChangeInputField = (event, key) => setStudentDetail((current) => ({ ...current, [key]: event.target.value }));
    const closeConsultationForm = () => setReportModal(false);
    const openConsultationForm = () => {
        if (!studentDetail?._id) return toast.error('Register or search for a student first');
        setReportModal(true);
    };

    const handleSearch = async () => {
        const roll = searchStudent.trim();
        if (!roll) return toast.error('Enter a roll number to search');
        props.showLoader();
        try {
            const { data } = await axios.get(`/api/auth/get-student/${encodeURIComponent(roll)}`);
            setStudentDetail({ ...emptyStudent, ...data.student });
            toast.success('Student profile loaded');
        } catch (error) {
            setStudentDetail({ ...emptyStudent, roll: searchStudent });
            setConsultations([]);
            toast.error(error?.response?.data?.error || 'No student found');
        } finally { props.hideLoader(); }
    };

    const saveStudent = async (event) => {
        event.preventDefault();
        const required = ['name', 'email', 'roll', 'mobileNo'];
        if (required.some((key) => !String(studentDetail[key] || '').trim())) return toast.error('Name, email, roll number and mobile number are required');
        props.showLoader();
        try {
            if (studentDetail._id) {
                const fields = ['name', 'email', 'roll', 'mobileNo', 'fatherName', 'fatherMobile', 'address', 'previous_health', 'age', 'bloodGroup'];
                const profile = Object.fromEntries(fields.map((field) => [field, studentDetail[field]]));
                const { data } = await axios.put(`/api/auth/update-student/${studentDetail._id}`, profile);
                setStudentDetail({ ...emptyStudent, ...data.student });
                toast.success(data.message || 'Student profile updated');
            } else {
                const { data } = await axios.post('/api/auth/register-student', studentDetail);
                setStudentDetail({ ...emptyStudent, ...data.student });
                toast.success(`${data.message}${data.temporaryPassword ? ` · Temporary password: ${data.temporaryPassword}` : ''}`);
            }
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Unable to save student profile');
        } finally { props.hideLoader(); }
    };

    const handleConsultationSaved = async () => {
        closeConsultationForm();
        await fetchConsultations(studentDetail._id);
        toast.success('Consultation has been added to this student’s medical history');
    };

    return <main className="register-student">
        <div className="go-back"><Link to="/admin/dashboard"><ArrowBackIcon /> Back to dashboard</Link></div>
        <SearchBox handleClick={handleSearch} placeholder="Search by roll number" value={searchStudent} onChange={setSearchStudent} />

        <section className="register-form-block">
            <div className="register-form-header">{studentDetail._id ? 'Student profile' : 'Register student'}</div>
            <form className="register-form" onSubmit={saveStudent}>
                <div className="register-form-div">
                    <div className="register-input-box"><input aria-label="Student name" autoComplete="name" required maxLength="120" value={studentDetail.name} onChange={(event) => handleOnChangeInputField(event, 'name')} className="input-box-register" placeholder="Student Name" type="text" /></div>
                    <div className="register-input-box"><input aria-label="Student email" autoComplete="email" required maxLength="254" value={studentDetail.email} onChange={(event) => handleOnChangeInputField(event, 'email')} className="input-box-register" placeholder="Email" type="email" /></div>
                    <div className="register-input-box"><input aria-label="Roll number" required maxLength="50" value={studentDetail.roll} onChange={(event) => handleOnChangeInputField(event, 'roll')} className="input-box-register" placeholder="Roll No." type="text" /></div>
                    <div className="register-input-box"><input aria-label="Student mobile number" autoComplete="tel" required value={studentDetail.mobileNo} onChange={(event) => handleOnChangeInputField(event, 'mobileNo')} className="input-box-register" placeholder="Mobile No." type="tel" /></div>
                    <div className="register-input-box"><input aria-label="Father or guardian name" value={studentDetail.fatherName} onChange={(event) => handleOnChangeInputField(event, 'fatherName')} className="input-box-register" placeholder="Father / Guardian Name" type="text" /></div>
                    <div className="register-input-box"><input aria-label="Guardian mobile number" value={studentDetail.fatherMobile} onChange={(event) => handleOnChangeInputField(event, 'fatherMobile')} className="input-box-register" placeholder="Guardian Mobile No." type="tel" /></div>
                    <div className="register-input-box"><input aria-label="Address" autoComplete="street-address" value={studentDetail.address} onChange={(event) => handleOnChangeInputField(event, 'address')} className="input-box-register" placeholder="Address" type="text" /></div>
                    <div className="register-input-box"><textarea aria-label="Previous health details" maxLength="2000" value={studentDetail.previous_health} onChange={(event) => handleOnChangeInputField(event, 'previous_health')} className="input-box-register input-box-register-textarea" placeholder="Previous Health Details" /></div>
                    <div className="register-input-box"><input aria-label="Age" value={studentDetail.age} onChange={(event) => handleOnChangeInputField(event, 'age')} className="input-box-register" placeholder="Age" type="number" min="1" max="130" /></div>
                    <div className="register-input-box"><select aria-label="Blood group" value={studentDetail.bloodGroup} onChange={(event) => handleOnChangeInputField(event, 'bloodGroup')} className="input-box-register"><option value="">Blood Group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group} value={group}>{group}</option>)}</select></div>
                </div>
                <div className="block-divs">
                    <button type="submit" className="form-btn reg-btn">{studentDetail._id ? 'Update student' : 'Register student'}</button>
                    {studentDetail._id && <button type="button" className="button-primary reg-btn" onClick={openConsultationForm}>New consultation</button>}
                </div>
            </form>
        </section>

        {studentDetail._id && <section className="student-consultation-history">
            <div className="student-consultation-heading"><div><p className="eyebrow">MEDICAL RECORD</p><h2>Consultation history</h2></div><span>{studentDetail.bloodGroup || 'Blood group not recorded'}</span></div>
            {studentDetail.previous_health && <div className="previous-health-card"><strong>Previous health details</strong><p>{studentDetail.previous_health}</p></div>}
            {consultationsLoading ? <div className="empty-state">Loading medical history…</div> : consultations.length ? <div className="consultation-timeline">{consultations.map((visit) => <article className="consultation-timeline-row" key={visit._id}>
                <span className="timeline-icon"><MedicalServicesOutlinedIcon /></span>
                <div className="timeline-copy"><strong>{visit.chiefComplaint || 'Consultation'}</strong><span>{visit.diagnosis || 'Assessment not recorded'}</span><small>{formatDate(visit.visitAt)}</small></div>
                <button type="button" className="visit-view-button" onClick={() => setSelectedConsultation(visit)} aria-label="View consultation"><span>View</span><RemoveRedEyeOutlinedIcon /></button>
            </article>)}</div> : <div className="empty-state">No consultations are recorded for this student yet.</div>}
        </section>}

        {reportModal && <Modal header="New consultation" handleClose={closeConsultationForm}><ConsultationForm studentDetail={studentDetail} showLoader={props.showLoader} hideLoader={props.hideLoader} onCancel={closeConsultationForm} onSaved={handleConsultationSaved} /></Modal>}
        {selectedConsultation && <Modal header="Consultation details" handleClose={() => setSelectedConsultation(null)}><ConsultationDetails consultation={selectedConsultation} includePrivate /></Modal>}
        <ToastContainer />
    </main>;
};

export default RegisterStudent;
