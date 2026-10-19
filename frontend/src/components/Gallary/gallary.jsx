import React, { useState, useEffect } from 'react'
import './gallary.css'
import axios from '@/api/client'
import { toast } from 'react-toastify';
const Gallary = (props) => {


  const [data, setData] = useState([]);

  useEffect(() => {

    const fetchData = async () => {
      props.showLoader()
      await axios.get('/api/gallary/get').then(resp => {
        setData(resp.data.images || [])
      }).catch(err => {
        toast.error(err?.response?.data?.error || 'Unable to load gallery images')
      }).finally(() => {
        props.hideLoader()
      })
    }

    fetchData()
  }, [])
  return (
    <div className='gallary-home'>

      {
        data.map((item, index) => {
          return (
            <div className='gallary-home-image-block' key={item._id || index}>
              <img className='gallary-home-image' src={item.link} alt='gallery' />
            </div>
          );
        })
      }

      {
        data.length === 0 && <div>No gallery images added yet.</div>
      }
    </div>
  )
}

export default Gallary
