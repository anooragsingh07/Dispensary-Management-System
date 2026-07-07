import React, { useState } from 'react'
import './adminDashboard.css'
import Modal from '../../../components/Modal/modal'
import ManageStaff from './ManageStaff/manageStaff'
import ManageEvent from './ManageEvent/manageEvent'
import { Link } from 'react-router-dom'

const AdminDashboard = (props) => {
  const [manageStaffModal, setmanageStaffModal] = useState(false)
  const [eventModal, setEventModal] = useState(false)
  const openCloseModal = (value) => {
    if (value === "event") {
      setEventModal(prev => !prev);
    } else {
      setmanageStaffModal(prev => !prev);
    }
  }

  let userInfo = localStorage.getItem("userInfo") ? JSON.parse(localStorage.getItem("userInfo")) : null;
  return (
    <div className='adminDashboard'>
      <div className='welcome-header'>
        <div className='welcome-admin'>Welcome, {userInfo?.name || "Admin"}</div>
        <div className='welcome-admin-right-side'>
          <div className='manage-staff-btn' onClick={() => openCloseModal("staff")}>Manage Staff</div>
          <div className='manage-staff-btn' onClick={() => openCloseModal("event")}>Manage Events</div>
        </div>
      </div>

      <div className='admin-dashboard-cards'>
        <Link to={'/admin/register-student'} className='admin-dashboard-card'>
          Register Student
        </Link>
        <Link to={'/admin/manage-medicine'} className='admin-dashboard-card'>
          Manage Medicines
        </Link>
        <Link to={'/admin/records'} className='admin-dashboard-card'>
          Records
        </Link>
        <Link to={'/admin/facility'} className='admin-dashboard-card'>
          Facilities
        </Link>
        <Link to={'/admin/near-by-hospital'} className='admin-dashboard-card'>
          Near By Hospitals
        </Link>
        <Link to={'/admin/gallary'} className='admin-dashboard-card'>
          Gallary
        </Link>
      </div>
      {manageStaffModal && <Modal value={"staff"} handleClose={openCloseModal} header={"Manage Staffs"} children={<ManageStaff showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
      {eventModal && <Modal value={"event"} handleClose={openCloseModal} header={"Manage Events"} children={<ManageEvent showLoader={props.showLoader} hideLoader={props.hideLoader} />} />}
    </div>
  )
}

export default AdminDashboard
