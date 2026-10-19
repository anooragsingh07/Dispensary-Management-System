import React, { useState, useEffect } from 'react'
import './adminGallary.css'
import { Link } from 'react-router-dom'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddModal from './AddModal/addModal';
import DeleteModal from './DeleteModal/deleteModal';
import axios from '@/api/client';
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
        } else {
            setClickedItem(item)
        }

        setDeleteModal(prev => !prev)
    }

    const handleImageAdded = (image) => {
        setData((current) => [image, ...current]);
        setAddModal(false);
    };

    const handleImageDeleted = (id) => {
        setData((current) => current.filter((image) => image._id !== id));
        setDeleteModal(false);
        setClickedItem(null);
    };

    const fetchData = async () => {
        props.showLoader();
        await axios.get('/api/gallary/get').then(resp => {
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

            <button type='button' className='add-pic-gallary-btn' onClick={setAddModalFunc}>Add image</button>

            <div className='gallary-home'>

                {
                    data.map((item) => {
                        return (
                            <button type='button' className='gallary-home-image-block img-admin' key={item._id} onClick={() => setDeleteModalFunc(item)} aria-label='Remove this gallery image'>
                                <img className='gallary-home-image' src={item.link} alt='gallery' />
                            </button>
                        );
                    })
                }

                {
                    data.length === 0 && <div className='empty-state'>The gallery is empty. Add an image to share campus health updates.</div>
                }
            </div>
            {addModal && <AddModal onClose={() => setAddModal(false)} onAdded={handleImageAdded} />}
            {deleteModal && <DeleteModal clickedItem={clickedItem} onClose={() => setDeleteModalFunc()} onDeleted={handleImageDeleted} />}
            <ToastContainer />
        </div>
    )
}

export default AdminGallary
