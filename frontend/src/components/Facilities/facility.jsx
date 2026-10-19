import React, { useState, useEffect } from 'react'
import './facility.css'
import axios from '@/api/client';
const Facility = (props) => {

  const [data, setData] = useState([]);

  const fetchData = async () => {
    props.showLoader()
    await axios.get('/api/facility/get').then(resp => {
      setData(resp.data.facilities || [])
    }).catch(err => {
      console.log(err)
    }).finally(() => {
      props.hideLoader()
    })
  }

  useEffect(() => {
    fetchData();
  }, [])
  return (
    <div className='facility'>
      <div className='facility-header'>
        List of facilities available at CGC HEALTH CENTRE:
      </div>
      <div className='facility-lists'>

        {
          data.map((item) => {
            return <div className='facility-list' key={item._id}>
              <div className='facility-list-header'>{item.title}</div>
              <div className='facility-list-value'>{item.description}</div>
            </div>
          })
        }

        {
          data.length === 0 && <div>No facilities added yet.</div>
        }
      </div>
    </div>
  )
}

export default Facility
