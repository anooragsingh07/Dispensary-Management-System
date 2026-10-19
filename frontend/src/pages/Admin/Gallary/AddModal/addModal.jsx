import { useState } from 'react';
import { toast } from 'react-toastify';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import api from '@/api/client';
import './addModal.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const AddModal = ({ onClose, onAdded }) => {
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Choose an image file');
    if (file.size > MAX_IMAGE_SIZE) return toast.error('Choose an image smaller than 5 MB');

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) return toast.error('Gallery uploads need Cloudinary settings in frontend/.env');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    setUploading(true);
    try {
      const response = await api.post(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, formData, { timeout: 60000, withCredentials: false });
      const imageUrl = response.data.secure_url;
      if (!imageUrl) throw new Error('Cloudinary did not return a secure image link');
      setImage(imageUrl);
      toast.success('Image uploaded. Review it, then add it to the gallery.');
    } catch (error) {
      toast.error(error?.response?.data?.error?.message || error.message || 'Unable to upload this image');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!image || saving) return;
    setSaving(true);
    try {
      const response = await api.post('/api/gallary/add', { link: image });
      toast.success(response.data.message);
      setSaving(false);
      onAdded(response.data.image);
    } catch (error) {
      setSaving(false);
      toast.error(error?.response?.data?.error || 'Unable to add this image to the gallery');
    }
  };

  return (
    <div className="addModal" role="dialog" aria-modal="true" aria-label="Add gallery image">
      <div className="addModal-card">
        <div>Add image</div>
        <div className="modal-add-btns">
          <label className="cancel-modal-btn" htmlFor="gallery-upload">Choose image</label>
          <input id="gallery-upload" className="cancel-file" type="file" accept="image/*" onChange={uploadImage} disabled={uploading || saving} />
          <button type="button" className="button-secondary cancel-modal-btn" onClick={onClose} disabled={uploading || saving}>Cancel</button>
        </div>
        {(uploading || saving) && <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}><CircularProgress /></Box>}
        {image && <div className="gallary-home-image-block"><img className="gallary-home-image" src={image} alt="Gallery upload preview" /></div>}
        {image && <button type="button" className="cancel-modal-btn" onClick={handleSubmit} disabled={uploading || saving}>{saving ? 'Saving...' : 'Add to gallery'}</button>}
      </div>
    </div>
  );
};

export default AddModal;
