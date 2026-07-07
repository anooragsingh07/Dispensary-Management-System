import React, { useState, useEffect } from 'react'
import './medcineModal.css'
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
const MedicineModal = (props) => {
    const [medicine, setMedicine] = useState({ name: "", quantity: "", usage: "" });
    const handleOnChange = (event, key) => {
        setMedicine({ ...medicine, [key]: event.target.value })
    }
    useEffect(() => {
        if (props.clickedMedicine) {
            setMedicine({ name: props.clickedMedicine.name, quantity: props.clickedMedicine.quantity, usage: props.clickedMedicine.usage })
        }
    }, [])

    const updateValue = async () => {
        props.showLoader();
        await axios.put(`http://localhost:4000/api/medicine/update/${props.clickedMedicine._id}`, medicine, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            window.location.reload()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to update medicine")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (props.clickedMedicine) {
            updateValue()
            return;
        }


        if (medicine.name.trim().length === 0 || !medicine.quantity || medicine.usage.trim().length === 0) {
            return toast.error("Please enter all fields")
        }
        props.showLoader();
        await axios.post('http://localhost:4000/api/medicine/add', medicine, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            window.location.reload()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to add medicine")
        }).finally(() => {
            props.hideLoader()
        })
    }


    return (
        <form onSubmit={handleSubmit}>
            <div className='register-form-div'>
                <div className='register-input-box'>
                    <input value={medicine.name} onChange={(event) => handleOnChange(event, "name")} className='input-box-register' type='text' placeholder='Medicine Name' />
                </div>
                <div className='register-input-box'>
                    <input value={medicine.quantity} onChange={(event) => handleOnChange(event, "quantity")} className='input-box-register' type='number' placeholder='Quantity' />
                </div>
                <div className='register-input-box'>
                    <input value={medicine.usage} onChange={(event) => handleOnChange(event, "usage")} className='input-box-register' type='text' placeholder='Usage' />
                </div>
            </div>
            <button type='submit' className='form-btn reg-btn' >{props.clickedMedicine ? "Update" : "Add"}</button>
            <ToastContainer />
        </form>
    )
}

export default MedicineModal
