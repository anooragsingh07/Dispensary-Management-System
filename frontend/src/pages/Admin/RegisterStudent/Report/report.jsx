import React, { useState, useEffect } from 'react'
import './report.css'
import SearchBox from '../../../../components/SearchBox/searchBox'
import DeleteIcon from '@mui/icons-material/Delete';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';
const Report = (props) => {
    const [searchMedicineName, setSearchmedicineName] = useState("")
    const [dropdown, setDropDown] = useState(false);
    const [data, setData] = useState([])
    const [selectedMedicine, setSelectedMedicine] = useState([]);
    const onChange = (value) => {
        setSearchmedicineName(value)
        setDropDown(value.trim().length > 0)
    }
    const fetchData = async () => {
        const request = searchMedicineName.trim()
            ? axios.get('/api/medicine/search', { params: { name: searchMedicineName } })
            : axios.get('/api/medicine/get');
        await request.then(resp => {
            setData(resp.data.medicines || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || 'Unable to load medicine options')
        })
    }

    useEffect(() => {
        fetchData()
    }, [searchMedicineName])

    const addMedicine = (item) => {
        let exist = 0;
        selectedMedicine.map((medicine) => {
            if (medicine._id === item._id) {
                exist = 1;
            }
        })
        item = { ...item, requiredQuantity: "" }
        if (exist === 0) setSelectedMedicine([...selectedMedicine, item]);
        setSearchmedicineName("")
        setDropDown(false)
    }

    const onChangeHandle = (event, ind) => {
        const arr = selectedMedicine.map((item, index) => {
            if (ind === index) {
                return { ...item, requiredQuantity: event.target.value }
            }
            return item
        })
        setSelectedMedicine(arr)
    }
    const handleDelete = (item) => {
        let arr = selectedMedicine.filter((it) => item !== it._id);
        setSelectedMedicine(arr);
    }

    const checkInputInValid = () => {
        let invalid = false;
        selectedMedicine.map((item) => {
            if (!Number.isSafeInteger(Number(item.requiredQuantity)) || Number(item.requiredQuantity) < 1) {
                invalid = true;
            }
        })
        return invalid;
    }

    const handleOnSubmit = async () => {
        if (selectedMedicine.length === 0) return toast.error("Please select any medicine.");
        if (checkInputInValid()) return toast.error("Please enter all the fields.")
        props.showLoader();
        await axios.post('/api/history/add', {
            roll: props.studentDetail.roll,
            student: props.studentDetail._id,
            medicines: selectedMedicine
        }, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            setSelectedMedicine([])
            setSearchmedicineName("")
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to submit report")
        }).finally(() => {
            props.hideLoader()
        })
    }
    return (
        <div className='report-regieter'>
            <div className='medicine-suggestion-block'>
                <SearchBox value={searchMedicineName} onChange={onChange} placeholder="Search Medicine" />

                {
                    dropdown && data.length > 0 && <div className='report-dropdown'>
                        {
                            data.map((item) => {
                                return <div className='report-medicine-drpdown' key={item._id} onClick={() => addMedicine(item)}>{item.name} ({item.quantity})</div>
                            })
                        }
                    </div>
                }
            </div>

            <div className='report-form-rows'>
                <div className='report-form-header'>
                    <div className='col-1-rm'>Medicine Name</div>
                    <div className='col-2-rm'>Quantity Left</div>
                    <div className='col-3-rm'>Required Quantity</div>
                    <div className='col-4-rm'>Delete</div>
                </div>

                <div className='report-form-row-block'>
                    {
                        selectedMedicine.map((item, index) => {
                            return (
                                <div className='report-form-row' key={item._id}>
                                    <div className='col-1-rm'>{item.name}</div>
                                    <div className='col-2-rm'>{item.quantity}</div>
                                    <div className='col-3-rm'>
                                        <input className='input-table' type='number' min='1' step='1' value={item.requiredQuantity} onChange={(event) => onChangeHandle(event, index)} />
                                    </div>
                                    <div className='col-4-rm'><DeleteIcon className='delete-icon' onClick={() => handleDelete(item._id)} /></div>
                                </div>
                            );
                        })
                    }


                </div>


            </div>

            <div className='modal-submit' onClick={handleOnSubmit}>Submit</div>
            <ToastContainer />

        </div>
    )
}

export default Report
