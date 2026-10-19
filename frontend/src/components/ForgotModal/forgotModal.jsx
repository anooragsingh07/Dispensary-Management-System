import React, { useState } from 'react'
import './forgotModal.css'
import { ToastContainer, toast } from 'react-toastify';
import axios from '@/api/client';
const ForgotModal = (props) => {

    const [step, setStep] = useState(1);
    const [buttonText, setButtonText] = useState("Send reset code")
    const [inputField, setInputField] = useState({ email: "", otp: "", newPassword: "" })
    const [resetToken, setResetToken] = useState("")

    const handleOnChange = (event, key) => {
        setInputField({ ...inputField, [key]: event.target.value })
    }

    const sendOTPToMail = async () => {
        if (inputField.email.trim().length === 0) return toast.error("Please Enter Email")
        props.showLoader()
        await axios.post('/api/auth/send-otp', { email: inputField.email }).then(resp => {
            toast.success(resp.data.devOtp ? `Development reset code: ${resp.data.devOtp}` : resp.data.message)
            setStep(2)
            setButtonText("Verify code")
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to send OTP")
        }).finally(() => {
            props.hideLoader()
        })
    }


    const checkOtp = async () => {
        if (inputField.otp.trim().length === 0) return toast.error("Please Enter OTP")
        props.showLoader()

        await axios.post('/api/auth/verify-otp', { email: inputField.email, otp: inputField.otp }).then(resp => {
            toast.success(resp.data.message)
            setResetToken(resp.data.resetToken)
            setStep(3)
            setButtonText("Update password")
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Invalid OTP")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const resetPassword = async () => {
        if (inputField.newPassword.length < 8) return toast.error("Use a password with at least 8 characters")
        props.showLoader()

        await axios.post('/api/auth/reset-password', { email: inputField.email, newPassword: inputField.newPassword, resetToken }).then(resp => {
            toast.success(resp.data.message)
            props.closeModal()
        }).catch(err => {
            toast.error(err?.response?.data?.error || "Unable to reset password")
        }).finally(() => {
            props.hideLoader()
        })
    }

    const handleForgotBtn = async () => {
        if (step === 1) {
            await sendOTPToMail()
        } else if (step === 2) {
            await checkOtp()
        } else if (step === 3) {
            await resetPassword()
        }
    }
    return (
        <div className='forgot-password-modal'>
            <div className='signup-page-card'>
                <div className='card-header-form'>Reset Password</div>
                <div className='form-input-fields'>
                    {step === 1 && <input className='form-input' type='email' placeholder='Email' value={inputField.email} onChange={(event) => handleOnChange(event, "email")} />}
                    {step === 2 && <input className='form-input' type='text' placeholder='OTP' value={inputField.otp} onChange={(event) => handleOnChange(event, "otp")} />}
                    {step === 3 && <input className='form-input' type='password' placeholder='New Password' value={inputField.newPassword} onChange={(event) => handleOnChange(event, "newPassword")} />}
                </div>
                <div className='form-btn forgot-password-btn' onClick={handleForgotBtn} >{buttonText}</div>
                <div className='form-btn forgot-password-btn' onClick={() => props.closeModal()}>Cancel</div>
            </div>
            <ToastContainer />
        </div>
    )
}

export default ForgotModal
