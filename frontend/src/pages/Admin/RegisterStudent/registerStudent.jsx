import React, { useState } from 'react'
import './registerStudent.css'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom';
import SearchBox from '../../../components/SearchBox/searchBox';
import Modal from '../../../components/Modal/modal';
import Report from './Report/report';
import { toast, ToastContainer } from 'react-toastify';
import axios from '@/api/client'
const RegisterStudent = (props) => {
    const [searchStudent, setSearchStudent] = useState("");
    const [reportModal, setReportModal] = useState(false)

    const emptyStudent = { _id: "", email: "", name: "", roll: "", mobileNo: "", fatherName: "", fatherMobile: "", address: "", previous_health: "", age: "", bloodGroup: "" };
    const [studentDetail, setStudentDetail] = useState(emptyStudent);

    const handleOnChangeInputField = (event, key) => {
        setStudentDetail({ ...studentDetail, [key]: event.target.value })
    }

    const openCloseModal = () => {
        if (!studentDetail?._id) return toast.error("Please register or search a student first")
        setReportModal(prev => !prev)
    }

    const handleOnChange = (value) => {
        setSearchStudent(value)
    }

    const handleSubmit = (e) => {
        e.preventDefault();
    }

    const handleSearch = async () => {
        if (searchStudent.trim().length === 0) return toast.error("Please enter correct roll number.");
        props.showLoader();
        await axios.get(`/api/auth/get-student/${searchStudent}`, { withCredentials: true }).then(resp => {
            setStudentDetail({ ...emptyStudent, ...resp.data.student })
            toast.success(resp.data.message)
        }).catch(err => {
            setStudentDetail({ ...emptyStudent, roll: searchStudent })
            toast.error(err?.response?.data?.error || "No student found")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const handleUpdateFunc = async () => {
        if (studentDetail.name.trim().length === 0 || studentDetail.email.trim().length === 0 || studentDetail.roll.trim().length === 0 || studentDetail.mobileNo.trim().length === 0) return toast.error("Name, Mobile No and Roll cant be empty");
        props.showLoader();
        const { _id, updatedAt, createdAt, __v, role, ...student } = { ...studentDetail };
        await axios.put(`/api/auth/update-student/${_id}`, student, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            setStudentDetail({ ...emptyStudent, ...resp.data.student })
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to update student")
        }).finally(() => {
            props.hideLoader()
        })

    }

    const registerStudent = async () => {
        if (studentDetail.name.trim().length === 0 || studentDetail.email.trim().length === 0 || studentDetail.roll.trim().length === 0 || studentDetail.mobileNo.trim().length === 0) return toast.error("Name, Mobile No, Email and Roll cant be empty");
        props.showLoader();
        await axios.post('/api/auth/register-student', studentDetail, { withCredentials: true }).then(resp => {
            toast.success(`${resp.data.message}. Temporary password: ${resp.data.temporaryPassword}`)
            setStudentDetail({ ...emptyStudent, ...resp.data.student })
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to register student")
        }).finally(() => {
            props.hideLoader()
        })
    }
    return (
        <div className='register-student'>
            <div className='go-back'><Link to={'/admin/dashboard'}><ArrowBackIcon /> Back To Dashboard</Link></div>

            <SearchBox handleClick={handleSearch} placeholder={"Search By Roll No."} value={searchStudent} onChange={handleOnChange} />
            <div className='register-form-block'>
                <div className='register-form-header'>Register Student</div>
                <form className='register-form' onSubmit={handleSubmit}>
                    <div className='register-form-div'>
                        <div className='register-input-box'>
                            <input value={studentDetail.name} onChange={(event) => handleOnChangeInputField(event, "name")} className='input-box-register' placeholder='Student Name' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.email} onChange={(event) => handleOnChangeInputField(event, "email")} className='input-box-register' placeholder='Email' type='email' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.roll} onChange={(event) => handleOnChangeInputField(event, "roll")} className='input-box-register' placeholder='Roll No.' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.mobileNo} onChange={(event) => handleOnChangeInputField(event, "mobileNo")} className='input-box-register' placeholder='Mobile No.' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.fatherName} onChange={(event) => handleOnChangeInputField(event, "fatherName")} className='input-box-register' placeholder='Father Name' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.fatherMobile} onChange={(event) => handleOnChangeInputField(event, "fatherMobile")} className='input-box-register' placeholder='Father Mobile No.' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.address} onChange={(event) => handleOnChangeInputField(event, "address")} className='input-box-register' placeholder='Address' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.previous_health} onChange={(event) => handleOnChangeInputField(event, "previous_health")} className='input-box-register' placeholder='Previous Health Details' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.age} onChange={(event) => handleOnChangeInputField(event, "age")} className='input-box-register' placeholder='Age' type='text' />
                        </div>
                        <div className='register-input-box'>
                            <input value={studentDetail.bloodGroup} onChange={(event) => handleOnChangeInputField(event, "bloodGroup")} className='input-box-register' placeholder='Blood Group' type='text' />
                        </div>
                    </div>


                    {
                        studentDetail?._id ? <div className='block-divs'>
                            <button type='submit' className='form-btn reg-btn' onClick={handleUpdateFunc} >Update</button>
                            <button type='submit' className='form-btn reg-btn' onClick={openCloseModal} >Report</button>
                        </div>
                            : <button type='submit' className='form-btn reg-btn' onClick={registerStudent} >Register</button>
                    }
                </form>
            </div>
            {reportModal && <Modal header="Report" handleClose={openCloseModal} children={<Report studentDetail={studentDetail} showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
            <ToastContainer />
        </div>
    )
}

export default RegisterStudent
