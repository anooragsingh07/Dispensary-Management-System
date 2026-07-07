import React, { useState, useEffect } from 'react'
import './nearByHospitals.css'
import { Link } from 'react-router-dom'
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Modal from '../../../components/Modal/modal';
import NearByModal from './NearByModal/nearByModal';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
const NearByHospital = (props) => {
    const [modal, setModal] = useState(false)
    const [data, setData] = useState([]);
    const [clickedItem, setClickedItem] = useState(null)
    const onOFModal = () => {
        if (modal) {
            setClickedItem(null)
            fetchData()
        }
        setModal(prev => !prev)
    }

    const fetchData = async () => {
        props.showLoader();
        await axios.get('http://localhost:4000/api/hospital/get').then(resp => {
            setData(resp.data.hospitals || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch hospitals")
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleEdit = (item) => {
        setClickedItem(item);
        setModal(true)
    }

    const filterOutData = (id) => {
        let newArrr = data.filter((item) => item._id !== id);
        setData(newArrr)
    }

    const handleDelete = async (id) => {
        props.showLoader();
        await axios.delete(`http://localhost:4000/api/hospital/delete/${id}`, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            filterOutData(id)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to delete hospital")
        }).finally(() => {
            props.hideLoader()
        })
    }

    return (
        <div className='admin-facility'>
            <div className='go-back'><Link to={'/admin/dashboard'}><ArrowBackIcon /> Back To Dashboard</Link></div>

            <div className='admin-facility-header'>
                <div>Near By Hospitals</div>
                <div className='add-facility-btn' onClick={onOFModal}>Add</div>
            </div>

            <div className='admin-facility-rows'>

                {
                    data.map((item) => {
                        return (
                            <div className='admin-facility-row' key={item._id}>

                                <div>
                                    <div className='admin-facility-title'>{item.name}</div>
                                    <div>{item.address}</div>
                                    <div>{item.contact}</div>
                                </div>
                                <div className='admin-facility-btns'>
                                    <EditIcon className='delete-icon' onClick={() => handleEdit(item)} />
                                    <DeleteIcon className='delete-icon' onClick={() => handleDelete(item._id)} />
                                </div>

                            </div>
                        );
                    })
                }

                {
                    data.length === 0 && <div>No hospitals added yet.</div>
                }
            </div>
            {modal && <Modal header={clickedItem ? "Update Hospital" : "Add Hospital"} handleClose={onOFModal} children={<NearByModal clickedItem={clickedItem} showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
            <ToastContainer />
        </div>
    )
}

export default NearByHospital
