import React, { useState, useEffect } from 'react'
import './studentDashboard.css'
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import Modal from '../../components/Modal/modal';
import StudentModal from './StudentModal/studentModal';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';
const StudentDashboard = (props) => {
    const userInfo = props.user;
    const [history, setHistory] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState(null)

    const [modal, setModal] = useState(false);

    const fetchData = async () => {
        props.showLoader();

        await axios.get('/api/history/mine').then(resp => {
            setHistory(resp.data.history)
        }).catch(err => {
            toast.error(err?.response?.data?.error)
        }).finally(() => {
            props.hideLoader()
        })
    }
    useEffect(() => {
        fetchData()
    }, [])

    const handleOnOfModal = (item) => {
        setModal(prev => !prev)
        setSelectedHistory(item ? item : null)
    }

    return (
        <div className='student-dashboard'>
            <div className='student-info'>
                <div className='welcone-user'>Welcome <span>{userInfo?.name}</span></div>
                <div className='welcone-user'>Roll No. <span>{userInfo?.roll}</span></div>

            </div>

            <div className='student-data'>
                <div className='student-data-header'>
                    <div className='student-header-title'>View</div>
                    <div className='student-header-title'>Date</div>

                </div>

                <div className='student-row-items'>
                    {
                        history.map((item) => {
                            return (
                                <div className='student-row-item' key={item._id}>
                                    <RemoveRedEyeIcon className='delete-icon' onClick={() => handleOnOfModal(item)} />
                                    <div>{item.createdAt?.slice(0, 10).split("-").reverse().join("-")}</div>
                                </div>
                            );
                        })
                    }
                    {
                        history.length === 0 && <div>No records yet.</div>
                    }

                </div>
            </div>
            {modal && <Modal header={"Details"} handleClose={handleOnOfModal} children={<StudentModal selectedHistory={selectedHistory} />} />}
            <ToastContainer />
        </div>
    )
}

export default StudentDashboard
