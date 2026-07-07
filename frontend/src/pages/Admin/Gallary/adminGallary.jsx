import React, { useState, useEffect } from 'react'
import './adminGallary.css'
import { Link } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddModal from './AddModal/addModal';
import DeleteModal from './DeleteModal/deleteModal';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
const AdminGallary = (props) => {

    const [addModal, setAddModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false)
    const [data, setData] = useState([])
    const [clickedItem, setClickedItem] = useState(null)
    const setAddModalFunc = () => {
        setAddModal(prev => !prev)
    }
    const setDeleteModalFunc = (item = null) => {
        if (deleteModal) {
            setClickedItem(null)
            fetchData()
        } else {
            setClickedItem(item)
        }

        setDeleteModal(prev => !prev)
    }

    const fetchData = async () => {
        props.showLoader();
        await axios.get('http://localhost:4000/api/gallary/get').then(resp => {
            setData(resp.data.images || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch gallery")
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        fetchData()
    }, [])
    return (
        <div className='gallary-admin'>
            <div className='go-back'><Link to={'/admin/dashboard'}><ArrowBackIcon /> Back To Dashboard</Link></div>

            <div className='add-pic-gallary-btn' onClick={setAddModalFunc}>Add</div>

            <div className='gallary-home'>

                {
                    data.map((item) => {
                        return (
                            <div className='gallary-home-image-block img-admin' key={item._id} onClick={() => setDeleteModalFunc(item)}>
                                <img className='gallary-home-image' src={item.link} alt='gallery' />
                            </div>
                        );
                    })
                }

                {
                    data.length === 0 && <div>No gallery images added yet.</div>
                }
            </div>
            {addModal && <AddModal onClose={setAddModalFunc} />}
            {deleteModal && <DeleteModal clickedItem={clickedItem} onClose={setDeleteModalFunc} />}
            <ToastContainer />
        </div>
    )
}

export default AdminGallary
