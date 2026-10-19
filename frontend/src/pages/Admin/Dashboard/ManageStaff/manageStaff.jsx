import React, { useState, useEffect } from 'react'
import './manageStaff.css'
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import axios from '@/api/client';
import { toast, ToastContainer } from 'react-toastify';
const ManageStaff = (props) => {
    const [inputField, setInputField] = useState({ name: "", email: "", password: "", designation: "", mobileNo: "", role: "staff" })
    const [staffs, setStaffs] = useState([])
    const [clickedStaff, setClickedStaff] = useState(null);

    const handleOnChange = (event, key) => {
        setInputField({ ...inputField, [key]: event.target.value })
    }

    const clearForm = () => {
        setClickedStaff(null)
        setInputField({ name: "", email: "", password: "", designation: "", mobileNo: "", role: "staff" })
    }

    const fetchData = async () => {
        props.showLoader()
        await axios.get('/api/auth/get-staffs/manage').then(resp => {
            setStaffs(resp.data.staffs || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch staffs")
        }).finally(() => {
            props.hideLoader()
        })
    }
    useEffect(() => {
        fetchData()
    }, [])

    const handleUpdate = async () => {

        await axios.put(`/api/auth/update-staff/${clickedStaff?._id}`, inputField, { withCredentials: true }).then(response => {
            toast.success(response.data.message)
            setStaffs(staffs.map((item) => item._id === clickedStaff._id ? { ...item, ...inputField, password: undefined } : item))
            clearForm()
        }).catch(err => {
            toast.error(err?.response?.data?.error)

        })
    }

    const handleAddStaff = async (e) => {
        e.preventDefault()

        if (clickedStaff) {
            handleUpdate();
            return;
        }

        if (inputField.name.trim().length === 0 || inputField.email.trim().length === 0 || inputField.password.trim().length === 0 || inputField.designation.trim().length === 0 || inputField.mobileNo.trim().length === 0) return toast.error("Please fill all the details.");
        props.showLoader()
        await axios.post('/api/auth/add-staff', inputField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            setStaffs([resp.data.staff, ...staffs])
            clearForm()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to add staff")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const handleOnEditBtn = async (item) => {
        setClickedStaff(item);
        setInputField({ name: item.name || "", email: item.email || "", password: "", designation: item.designation || "", mobileNo: item.mobileNo || "", role: item.role || "staff" })
    }

    const filterOutData = (id) => {
        let newArr = staffs.filter((item) => item?._id !== id);
        setStaffs(newArr)
    }

    const handleDelete = async (id) => {
        props.showLoader()
        await axios.delete(`/api/auth/delete-staff/${id}`, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            filterOutData(id)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to delete staff")
        }).finally(() => {
            props.hideLoader()
        })
    }
    return (
        <div className='add-staffs-box'>
            <form className='register-form' onSubmit={handleAddStaff} autoComplete='off'>
                <div className='register-form-div'>
                    <div className='register-input-box'>
                        <input aria-label='Staff name' name='staff-name' autoComplete='off' value={inputField.name} onChange={(event) => handleOnChange(event, "name")} className='input-box-register' type='text' placeholder='Staff Name' />
                    </div>
                    <div className='register-input-box'>
                        <input aria-label='Staff email' name='staff-email' autoComplete='off' value={inputField.email} disabled={!!clickedStaff} onChange={(event) => handleOnChange(event, "email")} className='input-box-register' type='email' placeholder='Email' />
                    </div>
                    <div className='register-input-box'>
                        <input aria-label='Staff password' name='staff-initial-password' autoComplete='new-password' value={inputField.password} disabled={!!clickedStaff} onChange={(event) => handleOnChange(event, "password")} className='input-box-register' type='password' placeholder='Password' />
                    </div>
                    <div className='register-input-box'>
                        <input aria-label='Staff designation' value={inputField.designation} onChange={(event) => handleOnChange(event, "designation")} className='input-box-register' type='text' placeholder='Designation' />
                    </div>
                    <div className='register-input-box'>
                        <input aria-label='Staff mobile number' value={inputField.mobileNo} onChange={(event) => handleOnChange(event, "mobileNo")} className='input-box-register' type='tel' placeholder='Mobile No.' />
                    </div>
                    {!clickedStaff && <div className='register-input-box'>
                        <select aria-label='Account role' value={inputField.role} onChange={(event) => handleOnChange(event, "role")} className='input-box-register'>
                            <option value='staff'>Authorized staff</option>
                            <option value='doctor'>Doctor</option>
                        </select>
                    </div>}
                </div>
                <div className='staff-form-actions'>
                    <button type='submit' className='form-btn reg-btn'>{!clickedStaff ? "Add staff member" : "Save changes"}</button>
                    {clickedStaff && <button type='button' className='button-secondary staff-cancel-edit' onClick={clearForm}><CloseIcon fontSize='small' /> Cancel edit</button>}
                </div>

            </form>

            <div className='list-staffs'>

                {
                    staffs.map((item) => {
                        return (
                            <div className='list-staff' key={item._id}>
                                <div>
                                    <div>{item.name}</div>
                                    <div>{item.role === 'doctor' ? 'Doctor' : 'Authorized staff'} · {item.designation}</div>
                                    <div>{item.mobileNo}</div>
                                </div>
                                <div className='list-staff-btns'>
                                    <button type='button' className='icon-action' aria-label={`Edit ${item.name}`} title='Edit staff member' onClick={() => handleOnEditBtn(item)}><EditIcon /></button>
                                    <button type='button' className='icon-action icon-action-danger' aria-label={`Delete ${item.name}`} title='Delete staff member' onClick={() => handleDelete(item._id)}><DeleteIcon /></button>
                                </div>

                            </div>
                        );
                    })
                }

                {staffs.length === 0 && <div className='empty-state'>No staff accounts yet. Add a staff member using the form above.</div>}

            </div>
            <ToastContainer />
        </div>
    )
}

export default ManageStaff
