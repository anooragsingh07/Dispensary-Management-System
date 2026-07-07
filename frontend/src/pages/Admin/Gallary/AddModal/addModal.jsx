import React, { useState } from 'react'
import './addModal.css'
import axios from 'axios'
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
const AddModal = (props) => {
  const [image, setImage] = useState(null)
  const [loader, setLoader] = useState(false)

  const uploadImage = async (e) => {
    const files = e.target.files;
    if (!files || !files[0]) return;

    const data = new FormData();
    data.append('file', files[0]);

    data.append('upload_preset', "college_dispensary");
    setLoader(true)
    try {
      const response = await axios.post("https://api.cloudinary.com/v1_1/mashhuudanny/image/upload", data);
      const imageUrl = response.data.url;
      setImage(imageUrl)

    } catch (err) {
      console.log(err)
    } finally {
      setLoader(false)
    }

  }

  const handleSubmit = async () => {
    await axios.post('http://localhost:4000/api/gallary/add', { link: image }, { withCredentials: true }).then(resp => {
      window.location.reload();
    }).catch(err => {
      console.log(err)
    })
  }

  return (
    <div className='addModal'>
      <div className='addModal-card'>
        <div>Add Image</div>
        <div className='modal-add-btns'>
          <label className='cancel-modal-btn' htmlFor='gallery-upload'>Upload</label>
          <input id='gallery-upload' className='cancel-file' type='file' accept='image/*' onChange={uploadImage} />
          <div className='cancel-modal-btn' onClick={() => props.onClose()}>Cancel</div>
        </div>
        {
          loader && <Box sx={{ display: 'flex' }}>
            <CircularProgress />
          </Box>
        }

        {
          image && <div className='gallary-home-image-block'>
            <img className='gallary-home-image' src={image} alt='preview' />
          </div>
        }

        {
          image && <div className='cancel-modal-btn' onClick={handleSubmit}>Submit</div>
        }
      </div>

    </div>
  )
}

export default AddModal


