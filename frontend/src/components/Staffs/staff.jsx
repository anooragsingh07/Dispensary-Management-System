import React, { useCallback, useEffect, useState } from 'react'
import './staff.css'
import TableComp from '../Table/tableComp'
import axios from '@/api/client'
import { toast } from 'react-toastify';
const Staff = ({ showLoader, hideLoader }) => {
  const staffHeader = ["Name", "Designation", "Role"]

  const [rowData, setRowData] = useState([])

  const getFormattedData = (data) => {
    let newarr = data.map((item) => {
      return {
        name: item.name,
        designation: item.designation,
        role: item.role === 'doctor' ? 'Doctor' : 'Dispensary staff'
      }
    })
    setRowData(newarr);
  }

  const fetchData = useCallback(async () => {
    showLoader();
    await axios.get('/api/auth/get-staffs').then(resp => {
      getFormattedData(resp.data.staffs || [])
    }).catch(err => {
      toast.error(err?.response?.data?.error || 'Unable to load the staff directory')
    }).finally(() => hideLoader())
  }, [hideLoader, showLoader]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return (
    <div className='staff'>
      <TableComp header={staffHeader} data={rowData} />
    </div>
  )
}

export default Staff
