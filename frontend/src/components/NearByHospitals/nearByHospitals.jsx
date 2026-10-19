import React, { useState, useEffect } from 'react'
import './nearByHospital.css'
import TableComp from '../Table/tableComp'
import axios from '@/api/client'
import { toast } from 'react-toastify';
const NearByHospitals = (props) => {
  const hosptalheaders = ["Sn No.", "Name", "Address", "Contact"]

  const [rowData, setRowData] = useState([]);

  const getFormattedData = (data) => {
    let newarr = data.map((item, ind) => {
      return {
        srNo: ind + 1,
        name: item.name,
        address: item.address,
        contact: item.contact
      }
    })
    setRowData(newarr);
  }

  const fetchData = async () => {
    props.showLoader()
    await axios.get('/api/hospital/get').then(resp => {
      getFormattedData(resp.data.hospitals || [])
    }).catch(err => {
      toast.error(err?.response?.data?.error || 'Unable to load nearby hospitals')
    }).finally(() => {
      props.hideLoader()
    })
  }

  useEffect(() => {
    fetchData()
  }, [])
  return (
    <div>
      <TableComp header={hosptalheaders} data={rowData} />
    </div>
  )
}

export default NearByHospitals
