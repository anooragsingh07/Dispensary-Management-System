import React, { useState } from 'react'
import './login.css'
import { toast, ToastContainer } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ForgotModal from '../../components/FogotModal/forgotModal'
const Login = (props) => {

    const navigate = useNavigate();

    const [forgotPassword, setForgotPassword] = useState(false);
    const [loginField, setLoginField] = useState({ email: "", password: "" });
    const [registerField, setRegisterField] = useState({ name: "", email: "", password: "", roll: "" });


    const handleForgotModal = () => {
        setForgotPassword(prev => !prev)
    }

    const handleOnChange = (event, key, card) => {
        if (card === "login") {
            setLoginField({ ...loginField, [key]: event.target.value })
        } else {
            setRegisterField({ ...registerField, [key]: event.target.value })
        }
    }

    const saveLogin = (user) => {
        localStorage.setItem("isLogin", "true");
        localStorage.setItem("userInfo", JSON.stringify(user));
        props.handleLogin("true");
        if (user.role === "student") {
            navigate(`/student/${user._id}`)
        } else {
            navigate('/admin/dashboard')
        }
    }

    const handleLogin = async () => {
        if (loginField.email.trim() === "" || loginField.password.trim() === "") return toast.error("Please enter the credentials");
        props.showLoader();

        await axios.post('http://localhost:4000/api/auth/login', loginField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            saveLogin(resp.data.user)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Login failed")
        }).finally(() => {
            props.hideLoader()
        })

    }

    const handleRegister = async () => {
        if (registerField.name.trim() === "" || registerField.email.trim() === "" || registerField.password.trim() === "" || registerField.roll.trim() === "") return toast.error("Please enter all the details");
        props.showLoader();
        await axios.post('http://localhost:4000/api/auth/register', registerField, { withCredentials: true }).then(resp => {
            toast.success(resp.data.message)
            saveLogin(resp.data.user)
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Registration failed")
        }).finally(() => {
            props.hideLoader()
        })
    }

    return (
        <div className='login-page'>

            <div className='login-page-card'>
                <div className='card-header-form'>Login</div>
                <div className='form-input-fields'>
                    <input className='form-input' type='email' placeholder='Email' value={loginField.email} onChange={(event) => handleOnChange(event, "email", "login")} />
                    <input className='form-input' type='password' placeholder='Password' value={loginField.password} onChange={(event) => handleOnChange(event, "password", "login")} />
                </div>
                <div className='forgot-password-link' onClick={handleForgotModal}>Forgot Password?</div>
                <div className='form-btn' onClick={handleLogin}>Login</div>
            </div>

            <div className='signup-page-card'>
                <div className='card-header-form'>Register</div>
                <div className='form-input-fields'>

                    <input className='form-input' type='text' placeholder='Name' value={registerField.name} onChange={(event) => handleOnChange(event, "name", "register")} />
                    <input className='form-input' type='email' placeholder='Email' value={registerField.email} onChange={(event) => handleOnChange(event, "email", "register")} />
                    <input className='form-input' type='password' placeholder='Password' value={registerField.password} onChange={(event) => handleOnChange(event, "password", "register")} />
                    <input className='form-input' type='text' placeholder='Roll No.' value={registerField.roll} onChange={(event) => handleOnChange(event, "roll", "register")} />
                    <div className='form-btn' onClick={handleRegister}>Register</div>
                </div>
            </div>
            <ToastContainer />
            {
                forgotPassword && <ForgotModal showLoader={props.showLoader} hideLoader={props.hideLoader} closeModal={handleForgotModal} />
            }

        </div>
    )
}

export default Login
