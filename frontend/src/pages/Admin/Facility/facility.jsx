import React, { useState, useEffect } from 'react'
import './facility.css'
import { Link } from 'react-router-dom'
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Modal from '../../../components/Modal/modal';
import FacilityModal from './FacilityModal/facilityModal';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';
const Facility = (props) => {
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
        await axios.get('/api/facility/get').then(resp => {
            setData(resp.data.facilities || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch facilities")
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleEdit = (item) => {
        setClickedItem(item)
        setModal(true)

    }

    const filterOutData = (id) => {
        let newArr = data.filter((item) => item._id !== id);
        setData(newArr);
    }
    const handlDelete = async (id) => {
        props.showLoader()
        await axios.delete(`/api/facility/delete/${id}`, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            filterOutData(id)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to delete facility")
        }).finally(() => {
            props.hideLoader()
        })
    }
    return (
        <div className='admin-facility'>
            <div className='go-back'><Link to={'/admin/dashboard'}><ArrowBackIcon /> Back To Dashboard</Link></div>

            <div className='admin-facility-header'>
                <div>Facilities</div>
                <button type='button' className='add-facility-btn' onClick={onOFModal}>Add facility</button>
            </div>

            <div className='admin-facility-rows'>

                {
                    data.map((item) => {
                        return (
                            <div className='admin-facility-row' key={item._id}>
                                <div>
                                    <div className='admin-facility-title'>{item.title}</div>
                                    <div>{item.description}</div>
                                </div>
                                <div className='admin-facility-btns'>
                                    <button type='button' className='icon-action' aria-label={`Edit ${item.title}`} title='Edit facility' onClick={() => handleEdit(item)}><EditIcon /></button>
                                    <button type='button' className='icon-action icon-action-danger' aria-label={`Delete ${item.title}`} title='Delete facility' onClick={() => handlDelete(item._id)}><DeleteIcon /></button>
                                </div>
                            </div>
                        );
                    })
                }

                {
                    data.length === 0 && <div className='empty-state'>No facilities added yet. Add one to share available services with students.</div>
                }
            </div>
            {modal && <Modal header={clickedItem ? "Update Facility" : "Add Facility"} handleClose={onOFModal} children={<FacilityModal clickedItem={clickedItem} onClose={onOFModal} showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
            <ToastContainer />
        </div>
    )
}

export default Facility
