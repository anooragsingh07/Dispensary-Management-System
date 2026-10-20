import { useState } from 'react';
import { Link } from 'react-router-dom';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { ToastContainer, toast } from 'react-toastify';
import axios from '@/api/client';
import './changePassword.css';

const emptyFields = { currentPassword: '', newPassword: '', confirmPassword: '' };

const ChangePassword = ({ user, showLoader, hideLoader }) => {
  const [fields, setFields] = useState(emptyFields);
  const [saving, setSaving] = useState(false);
  const isPatient = ['student', 'employee'].includes(user?.role);
  const returnPath = isPatient ? `/student/${user._id}` : '/admin/dashboard';

  const handleChange = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }));

  const savePassword = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (fields.newPassword.length < 8) return toast.error('Use a new password with at least 8 characters');
    if (fields.newPassword !== fields.confirmPassword) return toast.error('The new passwords do not match');

    setSaving(true);
    showLoader();
    try {
      const { data } = await axios.post('/api/auth/change-password', fields);
      setFields(emptyFields);
      toast.success(data.message || 'Your password has been changed');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Unable to change your password');
    } finally {
      hideLoader();
      setSaving(false);
    }
  };

  return (
    <main className="change-password-page">
      <Link className="change-password-back" to={returnPath}><ArrowBackRoundedIcon fontSize="small" /> Back to your workspace</Link>
      <section className="change-password-card">
        <p className="eyebrow"><span className="eyebrow-dot" /> ACCOUNT SECURITY</p>
        <h1>Change password</h1>
        <p className="change-password-intro">Choose a new password for your account. You’ll stay signed in here, and other active sessions will be signed out.</p>
        <form className="change-password-form" onSubmit={savePassword}>
          <label className="change-password-field">
            <span>Current password</span>
            <input name="currentPassword" type="password" autoComplete="current-password" value={fields.currentPassword} onChange={handleChange} required />
          </label>
          <label className="change-password-field">
            <span>New password</span>
            <input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={fields.newPassword} onChange={handleChange} required />
            <small>Use at least 8 characters.</small>
          </label>
          <label className="change-password-field">
            <span>Confirm new password</span>
            <input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} value={fields.confirmPassword} onChange={handleChange} required />
          </label>
          <div className="change-password-actions">
            <Link className="change-password-cancel" to={returnPath}>Cancel</Link>
            <button className="change-password-submit" type="submit" disabled={saving}><LockOutlinedIcon fontSize="small" /> {saving ? 'Saving…' : 'Save new password'}</button>
          </div>
        </form>
      </section>
      <ToastContainer />
    </main>
  );
};

export default ChangePassword;
