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
  const [registerField, setRegisterField] = useState({ name: '', email: '', password: '', roll: '', employeeId: '' });
  const [accountType, setAccountType] = useState('student');
  const [authMode, setAuthMode] = useState('login');

  const handleOnChange = (event, key, card) => {
    if (card === 'login') setLoginField({ ...loginField, [key]: event.target.value });
    else setRegisterField({ ...registerField, [key]: event.target.value });
  };

  const saveLogin = (user) => {
    props.handleLogin(user);
    navigate(['student', 'employee'].includes(user.role) ? '/student/' + user._id : '/admin/dashboard');
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
    const campusId = accountType === 'employee' ? registerField.employeeId : registerField.roll;
    if (!registerField.name.trim() || !registerField.email.trim() || !registerField.password.trim() || !campusId.trim()) return toast.error('Please enter all the details');
    if (registerField.password.length < 8) return toast.error('Use a password with at least 8 characters');
    props.showLoader();
    const registration = { name: registerField.name, email: registerField.email, password: registerField.password, accountType };
    registration[accountType === 'employee' ? 'employeeId' : 'roll'] = campusId;
    await axios.post('/api/auth/register', registration, { withCredentials: true }).then((resp) => {
      toast.success(resp.data.message);
      saveLogin(resp.data.user);
    }).catch((err) => {
      toast.error(err?.response?.data?.error || 'Registration failed');
    }).finally(() => props.hideLoader());
  };

  return (
    <main className="login-page">
      <header className="auth-page-heading">
        <p className="eyebrow"><span className="eyebrow-dot" /> CGC Landran Health Centre</p>
        <h1>Your campus care, all in one place.</h1>
        <p>Sign in or create an account to access campus health services.</p>
      </header>

      <section className="auth-single-card" aria-label="Account access">
        <div className="auth-mode-switch" role="tablist" aria-label="Account action">
          <button id="auth-tab-login" type="button" role="tab" aria-selected={authMode === 'login'} className={authMode === 'login' ? 'selected' : ''} onClick={() => setAuthMode('login')}>Sign in</button>
          <button id="auth-tab-register" type="button" role="tab" aria-selected={authMode === 'register'} className={authMode === 'register' ? 'selected' : ''} onClick={() => setAuthMode('register')}>Create account</button>
        </div>
        {authMode === 'login' ? (
          <form role="tabpanel" aria-labelledby="auth-tab-login" onSubmit={(event) => { event.preventDefault(); handleLogin(); }}>
            <div className="auth-card-heading"><div><h2>Welcome back</h2><p>Sign in to your account.</p></div></div>
            <div className="form-input-fields">
              <label className="auth-field"><span>Email address</span><input className="form-input" type="email" autoComplete="username" placeholder="you@college.edu" value={loginField.email} onChange={(event) => handleOnChange(event, 'email', 'login')} required /></label>
              <label className="auth-field"><span>Password</span><input className="form-input" type="password" autoComplete="current-password" placeholder="Enter your password" value={loginField.password} onChange={(event) => handleOnChange(event, 'password', 'login')} required /></label>
            </div>
            <button className="form-btn" type="submit">Sign in <ArrowForwardRoundedIcon fontSize="small" /></button>
            <p className="auth-card-footnote"><LockOutlinedIcon fontSize="small" /> For students, college employees and authorized dispensary staff.</p>
          </form>
        ) : (
          <form role="tabpanel" aria-labelledby="auth-tab-register" onSubmit={(event) => { event.preventDefault(); handleRegister(); }}>
            <div className="auth-card-heading"><div><h2>New to the centre?</h2><p>Create your campus health account.</p></div></div>
            <div className="auth-account-switch" role="group" aria-label="Choose account type">
            <button type="button" className={accountType === 'student' ? 'selected' : ''} aria-pressed={accountType === 'student'} onClick={() => setAccountType('student')}>Student</button>
            <button type="button" className={accountType === 'employee' ? 'selected' : ''} aria-pressed={accountType === 'employee'} onClick={() => setAccountType('employee')}>College employee</button>
          </div>
          <div className="form-input-fields">
            <label className="auth-field"><span>Full name</span><input className="form-input" type="text" autoComplete="name" placeholder="Your name" value={registerField.name} onChange={(event) => handleOnChange(event, 'name', 'register')} required /></label>
            <label className="auth-field"><span>Email address</span><input className="form-input" type="email" autoComplete="email" placeholder="you@college.edu" value={registerField.email} onChange={(event) => handleOnChange(event, 'email', 'register')} required /></label>
            <label className="auth-field"><span>Password</span><input className="form-input" type="password" minLength={8} autoComplete="new-password" placeholder="At least 8 characters" value={registerField.password} onChange={(event) => handleOnChange(event, 'password', 'register')} required /></label>
            {accountType === 'student'
              ? <label className="auth-field"><span>Student roll number</span><input className="form-input" type="text" autoComplete="off" placeholder="Your roll number" value={registerField.roll} onChange={(event) => handleOnChange(event, 'roll', 'register')} required /></label>
              : <label className="auth-field"><span>College employee ID</span><input className="form-input" type="text" autoComplete="off" placeholder="Your employee ID" value={registerField.employeeId} onChange={(event) => handleOnChange(event, 'employeeId', 'register')} required /></label>}
          </div>
          <button className="form-btn" type="submit">Create {accountType === 'employee' ? 'employee' : 'student'} account <ArrowForwardRoundedIcon fontSize="small" /></button>
          <p className="auth-card-footnote">Use your college-issued {accountType === 'employee' ? 'employee ID' : 'student roll number'}. Dispensary staff accounts are set up by an administrator.</p>
          </form>
        )}
      </section>
      <ToastContainer />
    </main>
  );
};

export default Login;
