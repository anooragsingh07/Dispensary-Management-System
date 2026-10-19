import React, { useEffect, useState } from 'react'
import './staff.css'
import TableComp from '../Table/tableComp'
import axios from '@/api/client'
import { toast } from 'react-toastify';
const Staff = (props) => {
  const staffHeader = ["Name", "Designation", "Email Id", "Contact No."]

  const [rowData, setRowData] = useState([])

  const getFormattedData = (data) => {
    let newarr = data.map((item) => {
      return {
        name: item.name,
        designation: item.designation,
        email: item.email,
        mobileNo: item.mobileNo
      }
    })
    setRowData(newarr);
  }

  const fetchData = async () => {
    props.showLoader();
    await axios.get('/api/auth/get-staffs').then(resp => {
      getFormattedData(resp.data.staffs || [])
    }).catch(err => {
      toast.error(err?.response?.data?.error || 'Unable to load the staff directory')
    }).finally(() => {
      props.hideLoader()
    })
  }

  useEffect(() => {
    fetchData()
  }, [])
  return (
    <div className='staff'>
      <TableComp header={staffHeader} data={rowData} />
    </div>
  )
}

export default Staff
