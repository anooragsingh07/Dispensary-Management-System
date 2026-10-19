import React, { useState, useEffect } from 'react'
import './manageMedicine.css'
import { Link } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchBox from '../../../components/SearchBox/searchBox';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Modal from '../../../components/Modal/modal';
import MedicineModal from './MedicineModal/medicineModal';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';
const ManageMedicine = (props) => {
    const [medicineSearch, setMedicineSearch] = useState("")
    const [addModal, setAddModal] = useState(false);
    const [clickedMedicine, setClickedMedicine] = useState(null)

    const [data, setData] = useState([])

    const onOffmodal = () => {
        if (addModal) {
            setClickedMedicine(null)
            fetchData()
        }
        setAddModal(prev => !prev)
    }

    const onChangeValue = (value) => {
        setMedicineSearch(value)
    }
    const fetchData = async () => {
        props.showLoader();
        const request = medicineSearch.trim()
            ? axios.get('/api/medicine/search', { params: { name: medicineSearch } })
            : axios.get('/api/medicine/get');
        await request.then(resp => {
            setData(resp.data.medicines || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch medicines")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const handleEdit = (item) => {
        setClickedMedicine(item)
        setAddModal(true)
    }

    const filterOutMedicine = (id) => {
        let newArr = data.filter((item) => item._id !== id);
        setData(newArr)
    }

    const handleDelete = async (id) => {
        props.showLoader();
        await axios.delete(`/api/medicine/delete/${id}`, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            filterOutMedicine(id)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to delete medicine")
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {

        fetchData()
    }, [medicineSearch])
    return (
        <div className='manageMedicine'>
            <div className='go-back'><Link to={'/admin/dashboard'}><ArrowBackIcon /> Back To Dashboard</Link></div>

            <div className='top-manage-medicine'>
                <SearchBox placeholder="Search Medicine " value={medicineSearch} onChange={onChangeValue} />
                <div className='add-manage-medicine' onClick={onOffmodal} >Add</div>
            </div>

            <div className='manageMedicine-card'>
                <div className='report-form-rows'>
                    <div className='report-form-header'>
                        <div className='col-1-rm'>Name</div>
                        <div className='col-2-rm'>Quantity</div>
                        <div className='col-3-rm'>Usage</div>
                        <div className='col-4-rm'>Action</div>
                    </div>

                    <div className='report-form-row-block'>
                        {
                            data.map((item) => {
                                return <div className='report-form-row' key={item._id}>
                                    <div className='col-1-rm'>{item.name}</div>
                                    <div className='col-2-rm'>{item.quantity}</div>
                                    <div className='col-3-rm'>{item.usage}</div>
                                    <div className='col-4-rm'>
                                        <EditIcon className='delete-icon' onClick={() => handleEdit(item)} />
                                        <DeleteIcon className='delete-icon' onClick={() => handleDelete(item._id)} />
                                    </div>
                                </div>
                            })
                        }

                        {
                            data.length === 0 && <div className='report-form-row' >
                                <div className=''>No Any medicine yet</div>

                            </div>
                        }


                    </div>


                </div>
            </div>
            {
                addModal && <Modal header={clickedMedicine ? "Update Medicine" : "Add Medicine"} handleClose={onOffmodal} children={<MedicineModal clickedMedicine={clickedMedicine} showLoader={props.showLoader} hideLoader={props.hideLoader} />} />
            }
            <ToastContainer />
        </div>
    )
}

export default ManageMedicine
