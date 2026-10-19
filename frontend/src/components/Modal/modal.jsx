import React, { useId } from 'react'
import './modal.css'
import CloseIcon from '@mui/icons-material/Close';
const Modal = (props) => {
    const header = props.header ? props.header : "Modal";
    const children = props.children ? props.children : null;
    const titleId = useId();

    const onCloseBtn = () => {
        if (props.handleClose) {
            props.handleClose(props.value)
        }
    }
    return (
        <div className='modal'>
            <section className='modal-card' role='dialog' aria-modal='true' aria-labelledby={titleId}>
                <div className='modal-card-header'>
                    <h2 className='modal-card-header-title' id={titleId}>{header}</h2>
                    <button type='button' className='modal-close-button' onClick={onCloseBtn} aria-label={`Close ${header}`}>
                        <CloseIcon />
                    </button>
                </div>
                <div className='modal-content'>{children}</div>
            </section>
        </div>
    )
}

export default Modal
