import React, { useEffect, useState } from 'react'
import './record.css'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link } from 'react-router-dom'
import SearchBox from '../../../components/SearchBox/searchBox';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import Modal from '../../../components/Modal/modal';
import RecordModal from './RecordModal/recordModal';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';
import StudentAllFiles from './StudentAllDetails/studentAllFiles';
const Record = (props) => {
    const [studentRoll, setStudentRoll] = useState("");
    const [listOfYear, setListOfYear] = useState([]);
    const [listOfMonth, setListOfMonths] = useState([]);
    const currentYear = new Date().getFullYear();
    const [modal, setModal] = useState(false)
    const [allRecordModal, setAllRecordModal] = useState(false)
    const [data, setData] = useState([]);
    const [selectedHistory, setSelectedHistory] = useState(null)
    const [selectedAllDetails, setSelecetedAllDetaisl] = useState(null)

    const [selectedYear, setSelectedYear] = useState("")
    const [selectedMonth, setSelectedMonth] = useState("")

    const onOffModal = () => {
        setModal(prev => !prev)
    }
    const onOffAllRecordModal = () => {
        if (allRecordModal) {
            setSelecetedAllDetaisl(null)
        }
        setAllRecordModal(prev => !prev)
    }

    const onChangeField = (value) => {
        setStudentRoll(value)
    }

    const fetchData = async () => {
        props.showLoader()
        await axios.get(`/api/history/get-history?month=${selectedMonth}&year=${selectedYear}`, { withCredentials: true }).then(response => {
            setData(response.data.history)
        }).catch(err => {
            console.log(err)
            toast.error(err?.response?.data?.error);

        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        if (selectedMonth === "" || selectedYear === "") {
            return;
        }
        fetchData();

    }, [selectedYear, selectedMonth])

    useEffect(() => {
        let arr = [];
        for (let i = 2010; i <= parseInt(currentYear); i++) {
            arr.unshift(i.toString())
        }

        const monthArr = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];

        setListOfYear(arr);
        setSelectedYear(arr[0]);
        setListOfMonths(monthArr);
        setSelectedMonth(monthArr[new Date().getMonth()]);

    }, [])

    const handleOnOpenModal = (item) => {
        setModal(prev => !prev)
        setSelectedHistory(item ? item : null)

    }

    const handleClick = async () => {
        if (studentRoll.trim().length === 0) return toast.error("Please Enter Correct Roll No.");
        props.showLoader()
        await axios.get(`/api/history/get-student/${encodeURIComponent(studentRoll.trim())}`).then(resp => {
            if ((resp.data.history || []).length === 0) {
                return toast.error("No records found for this roll number")
            }
            setSelecetedAllDetaisl(resp.data.history)
            setAllRecordModal(true)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to fetch records")
        }).finally(() => {
            props.hideLoader()
        })
    }
    return (
        <div className='records'>
            <div className='go-back'><Link to={'/admin/dashboard'}><ArrowBackIcon /> Back To Dashboard</Link></div>

            <SearchBox handleClick={handleClick} value={studentRoll} onChange={onChangeField} placeholder="Search By Roll No." />

            <div className='record-date-block'>
                Select year
                <div className='record-date-year'>
                    {
                        listOfYear.map((item) => {
                            return <div className={`record-year ${selectedYear === item ? "active-stats" : ""}`} key={item} onClick={() => setSelectedYear(item)}>{item}</div>
                        })
                    }



                </div>

                Select Month
                <div className='record-date-year'>
                    {
                        listOfMonth.map((item) => {
                            return <div className={`record-year ${selectedMonth === item ? "active-stats" : ""}`} key={item} onClick={() => setSelectedMonth(item)}>{item}</div>
                        })
                    }

                </div>
            </div>

            <div className='manageMedicine-card'>
                <div className='report-form-rows'>
                    <div className='report-form-header'>
                        <div className=''>View</div>
                        <div className='col-2-mng'>Student Name</div>
                        <div className='col-2-mng'>Roll No.</div>
                        <div className='col-3-mng'>Date</div>
                    </div>

                    <div className='report-form-row-block'>
                        {
                            data.map((item) => {
                                return (
                                    <div className='report-form-row' key={item._id}>
                                        <div><RemoveRedEyeIcon className='delete-icon' onClick={() => handleOnOpenModal(item)} /></div>
                                        <div className='col-2-mng'>{item.student?.name || "N/A"}</div>
                                        <div className='col-2-mng'>{item.roll}</div>
                                        <div className='col-3-mng'>{item.createdAt?.slice(0, 10).split("-").reverse().join("-")}</div>
                                    </div>
                                );
                            })
                        }

                        {
                            data.length === 0 && <div className='report-form-row' >
                                <div className=''>No Any records yet</div>

                            </div>
                        }


                    </div>


                </div>
            </div>
            <ToastContainer />
            {modal && <Modal header="Records" handleClose={onOffModal} children={<RecordModal selectedHistory={selectedHistory} />} />}
            {allRecordModal && <Modal header="All Records" handleClose={onOffAllRecordModal} children={<StudentAllFiles studnetAllDetails={selectedAllDetails || []} />} />}
        </div>
    )
}

export default Record
