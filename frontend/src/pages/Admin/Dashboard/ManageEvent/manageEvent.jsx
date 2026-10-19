import React, { useState, useEffect } from 'react'
import './manageEvent.css'
import DeleteIcon from '@mui/icons-material/Delete';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';

const ManageEvent = (props) => {
    const [title, setTitle] = useState("");
    const [data, setData] = useState([])

    const fetchData = async () => {
        props.showLoader();
        await axios.get('/api/notification/get').then(resp => {
            setData(resp.data.notifications || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch events")
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSubmitEvent = async (e) => {
        e.preventDefault();
        if (title.trim().length === 0) return toast.error("Please Enter Title");
        props.showLoader();
        await axios.post('/api/notification/add', { title }, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            setData([resp.data.notification, ...data])
            setTitle("")
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to add event")
        }).finally(() => {
            props.hideLoader()
        })
    }
    const filterOutEvent = (id) => {
        let newArr = data.filter((item) => item._id !== id);
        setData(newArr)
    }

    const handleDeleteEvent = async (id) => {
        props.showLoader();
        await axios.delete(`/api/notification/delete/${id}`, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            filterOutEvent(id)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to delete event")
        }).finally(() => {
            props.hideLoader()
        })
    }

    return (
        <div className='add-staffs-box'>
            <form onSubmit={handleSubmitEvent} className='register-form'>
                <div className='register-form-div'>
                    <div className='register-input-box'>
                        <input aria-label='Notice title' className='input-box-register' value={title} onChange={(event) => setTitle(event.target.value)} placeholder='Notice title' />
                    </div>
                </div>
                <button type='submit' className='form-btn reg-btn'>Publish notice</button>

            </form>

            <div className='list-staffs'>

                {
                    data.map((item) => {
                        return (
                            <div className='list-staff' key={item._id}>
                                <div>{item.title}</div>
                                <div className='list-staff-btns'>
                                    <button type='button' className='icon-action icon-action-danger' aria-label={`Delete notice: ${item.title}`} title='Delete notice' onClick={() => handleDeleteEvent(item._id)}><DeleteIcon /></button>
                                </div>

                            </div>
                        );
                    })
                }
                {data.length === 0 && <div className='empty-state'>No notices have been published yet.</div>}
            </div>

            <ToastContainer />
        </div>
    )
}

export default ManageEvent
