import React, { useState, useEffect } from 'react'
import './facilityModal.css'
import { ToastContainer, toast } from 'react-toastify';
import axios from '@/api/client';
const FacilityModal = (props) => {

    const [inputField, setInputField] = useState({ title: "", description: "" });
    const handleOnChange = (event, key) => {
        setInputField({ ...inputField, [key]: event.target.value });
    }

    useEffect(() => {
        if (props.clickedItem) {
            setInputField({ title: props.clickedItem.title, description: props.clickedItem.description });
        }
    }, [])
    const updateFacility = async () => {
        props.showLoader();
        await axios.put(`/api/facility/update/${props.clickedItem._id}`, inputField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            props.onClose()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to update facility")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (inputField.title.trim().length === 0 || inputField.description.trim().length === 0) return toast.error("Enter all the fields")
        if (props.clickedItem) {
            updateFacility()
            return;
        }

        props.showLoader();
        await axios.post('/api/facility/add', inputField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            props.onClose()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to add facility")
        }).finally(() => {
            props.hideLoader()
        })

    }
    return (
        <div className='facilty-modal'>
            <form className='register-form' onSubmit={handleSubmit}>
                <div className='register-form-div'>
                    <div className='register-input-box'>
                        <input value={inputField.title} onChange={(event) => handleOnChange(event, "title")} className='input-box-register' type='text' placeholder='Facility Title' />
                    </div>
                    <div className='register-input-box'>
                        <input value={inputField.description} onChange={(event) => handleOnChange(event, "description")} className='input-box-register' type='text' placeholder='Description' />
                    </div>
                </div>


                <button type='submit' className='form-btn reg-btn' >{props.clickedItem ? "Update" : "Add"}</button>
                <ToastContainer />
            </form>
        </div>
    )
}

export default FacilityModal
