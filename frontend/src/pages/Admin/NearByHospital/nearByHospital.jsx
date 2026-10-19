import React, { useState, useEffect } from 'react'
import './nearByHospitals.css'
import { Link } from 'react-router-dom'
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Modal from '../../../components/Modal/modal';
import NearByModal from './NearByModal/nearByModal';
import axios from '@/api/client';
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
        await axios.get('/api/hospital/get').then(resp => {
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
        await axios.delete(`/api/hospital/delete/${id}`, { withCredentials: true }).then(resp => {
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
                <button type='button' className='add-facility-btn' onClick={onOFModal}>Add hospital</button>
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
                                    <button type='button' className='icon-action' aria-label={`Edit ${item.name}`} title='Edit hospital' onClick={() => handleEdit(item)}><EditIcon /></button>
                                    <button type='button' className='icon-action icon-action-danger' aria-label={`Delete ${item.name}`} title='Delete hospital' onClick={() => handleDelete(item._id)}><DeleteIcon /></button>
                                </div>

                            </div>
                        );
                    })
                }

                {
                    data.length === 0 && <div className='empty-state'>No nearby hospitals added yet. Add a hospital to make local care options easy to find.</div>
                }
            </div>
            {modal && <Modal header={clickedItem ? "Update Hospital" : "Add Hospital"} handleClose={onOFModal} children={<NearByModal clickedItem={clickedItem} onClose={onOFModal} showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
            <ToastContainer />
        </div>
    )
}

export default NearByHospital
