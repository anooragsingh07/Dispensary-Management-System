import { useState } from 'react';
import './login.css';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import axios from '@/api/client';

const Login = (props) => {
  const navigate = useNavigate();
  const [loginField, setLoginField] = useState({ email: '', password: '' });
  const [registerField, setRegisterField] = useState({ name: '', email: '', password: '', roll: '' });

  const handleOnChange = (event, key, card) => {
    if (card === 'login') setLoginField({ ...loginField, [key]: event.target.value });
    else setRegisterField({ ...registerField, [key]: event.target.value });
  };

  const saveLogin = (user) => {
    props.handleLogin(user);
    navigate(user.role === 'student' ? '/student/' + user._id : '/admin/dashboard');
  };

  const handleLogin = async () => {
    if (!loginField.email.trim() || !loginField.password.trim()) return toast.error('Please enter the credentials');
    props.showLoader();
    await axios.post('/api/auth/login', loginField, { withCredentials: true }).then((resp) => {
      toast.success(resp.data.message);
      saveLogin(resp.data.user);
    }).catch((err) => {
      toast.error(err?.response?.data?.error || 'Login failed');
    }).finally(() => props.hideLoader());
  };

  const handleRegister = async () => {
    if (!registerField.name.trim() || !registerField.email.trim() || !registerField.password.trim() || !registerField.roll.trim()) return toast.error('Please enter all the details');
    if (registerField.password.length < 8) return toast.error('Use a password with at least 8 characters');
    props.showLoader();
    await axios.post('/api/auth/register', registerField, { withCredentials: true }).then((resp) => {
      toast.success(resp.data.message);
      saveLogin(resp.data.user);
    }).catch((err) => {
      toast.error(err?.response?.data?.error || 'Registration failed');
    }).finally(() => props.hideLoader());
  };

  return (
    <main className="login-page">
      <section className="login-intro">
        <p className="eyebrow"><span className="eyebrow-dot" /> CGC Landran Health Centre</p>
        <h1>Your campus<br /><span>care starts here.</span></h1>
        <p>Sign in to view your health visits, or create a student account to get started with the campus dispensary.</p>
        <div className="login-intro-note"><span><LockOutlinedIcon /></span><span><strong>Private by design</strong><small>Your health information is available only through your account.</small></span></div>
      </section>

      <section className="login-cards" aria-label="Account access">
        <form className="login-page-card" onSubmit={(event) => { event.preventDefault(); handleLogin(); }}>
          <div className="auth-card-heading"><span className="auth-card-step">01</span><div><h2>Welcome back</h2><p>Sign in to your account.</p></div></div>
          <div className="form-input-fields">
            <label className="auth-field"><span>Email address</span><input className="form-input" type="email" autoComplete="username" placeholder="you@college.edu" value={loginField.email} onChange={(event) => handleOnChange(event, 'email', 'login')} required /></label>
            <label className="auth-field"><span>Password</span><input className="form-input" type="password" autoComplete="current-password" placeholder="Enter your password" value={loginField.password} onChange={(event) => handleOnChange(event, 'password', 'login')} required /></label>
          </div>
          <button className="form-btn" type="submit">Sign in <ArrowForwardRoundedIcon fontSize="small" /></button>
          <p className="auth-card-footnote">For students and authorized dispensary staff.</p>
        </form>

        <form className="signup-page-card" onSubmit={(event) => { event.preventDefault(); handleRegister(); }}>
          <div className="auth-card-heading"><span className="auth-card-step">02</span><div><h2>New to the centre?</h2><p>Create your student account.</p></div></div>
          <div className="form-input-fields">
            <label className="auth-field"><span>Full name</span><input className="form-input" type="text" autoComplete="name" placeholder="Your name" value={registerField.name} onChange={(event) => handleOnChange(event, 'name', 'register')} required /></label>
            <label className="auth-field"><span>Email address</span><input className="form-input" type="email" autoComplete="email" placeholder="you@college.edu" value={registerField.email} onChange={(event) => handleOnChange(event, 'email', 'register')} required /></label>
            <label className="auth-field"><span>Password</span><input className="form-input" type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={registerField.password} onChange={(event) => handleOnChange(event, 'password', 'register')} required /></label>
            <label className="auth-field"><span>Student roll number</span><input className="form-input" type="text" placeholder="Your roll number" value={registerField.roll} onChange={(event) => handleOnChange(event, 'roll', 'register')} required /></label>
          </div>
          <button className="form-btn" type="submit">Create student account <ArrowForwardRoundedIcon fontSize="small" /></button>
          <p className="auth-card-footnote">Registration is for students. Staff accounts are set up by an administrator.</p>
        </form>
      </section>
      <ToastContainer />
    </main>
  );
};

export default Login;
