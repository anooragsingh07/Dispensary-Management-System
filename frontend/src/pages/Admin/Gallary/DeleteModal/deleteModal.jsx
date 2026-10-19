import { useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast } from 'react-toastify';
import api from '@/api/client';
import '../AddModal/addModal.css';

const DeleteModal = ({ clickedItem, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!clickedItem || deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/api/gallary/delete/${clickedItem._id}`);
      toast.success('Image removed from the gallery');
      onDeleted(clickedItem._id);
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to remove this image');
      setDeleting(false);
    }
  };

  return (
    <div className="addModal" role="dialog" aria-modal="true" aria-label="Remove gallery image">
      <div className="addModal-card">
        <div>Remove this image from the gallery?</div>
        <div className="modal-add-btns">
          <button type="button" className="cancel-modal-btn" onClick={onClose} disabled={deleting}>Keep image</button>
          <button type="button" className="cancel-modal-btn" onClick={handleDelete} disabled={deleting} aria-label="Delete image">
            {deleting ? 'Removing…' : <DeleteIcon />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
