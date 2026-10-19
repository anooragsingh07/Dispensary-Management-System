import React, { useState, useEffect } from 'react'
import './nearByModal.css'
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';
const NearByModal = (props) => {

    const [inputField, setInputField] = useState({ name: "", address: "", contact: "" });

    const handleOnChange = (event, key) => {
        setInputField({ ...inputField, [key]: event.target.value })
    }

    useEffect(() => {
        if (props.clickedItem) {
            setInputField({ name: props.clickedItem.name, address: props.clickedItem.address, contact: props.clickedItem.contact })
        }
    }, [])

    const updateFunc = async () => {
        props.showLoader();
        await axios.put(`/api/hospital/update/${props.clickedItem._id}`, inputField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            props.onClose()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to update hospital")
        }).finally(() => {
            props.hideLoader()
        })
    }
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (inputField.name.trim().length === 0 || inputField.address.trim().length === 0 || inputField.contact.trim().length === 0) return toast.error("Enter all the fields")

        if (props.clickedItem) {
            updateFunc()
            return;
        }

        props.showLoader();
        await axios.post('/api/hospital/add', inputField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            props.onClose()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to add hospital")
        }).finally(() => {
            props.hideLoader()
        })
    }
    return (
        <form className='register-form' onSubmit={handleSubmit}>
            <div className='register-form-div'>
                <div className='register-input-box'>
                    <input aria-label='Hospital name' value={inputField.name} onChange={(event) => handleOnChange(event, "name")} className='input-box-register' type='text' placeholder='Hospital name' />
                </div>
                <div className='register-input-box'>
                    <input aria-label='Hospital address' value={inputField.address} onChange={(event) => handleOnChange(event, "address")} className='input-box-register' type='text' placeholder='Address' />
                </div>
                <div className='register-input-box'>
                    <input aria-label='Hospital contact' value={inputField.contact} onChange={(event) => handleOnChange(event, "contact")} className='input-box-register' type='tel' placeholder='Contact' />
                </div>
            </div>


            <button type='submit' className='form-btn reg-btn' >{props.clickedItem ? "Update" : "Add"}</button>
            <ToastContainer />
        </form>
    )
}

export default NearByModal
