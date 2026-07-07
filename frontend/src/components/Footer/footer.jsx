import React from 'react'
import './footer.css'
import PhoneIcon from '@mui/icons-material/Phone';
import LanguageIcon from '@mui/icons-material/Language';
import CloudIcon from '@mui/icons-material/Cloud';
const Footer = () => {

    const todayDate = new Date()
    return (
        <div className='footer'>
            <div className='foooter-left'>
                <img className='footer-logo' src='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRa2tpofldsaeLbZ2jwpQDY4wsW0G2zWVA92_xmXEEiHfR81_GRFOqU17I&s=10' />
                <div className='footer-text-white'>Chandigarh Group of Colleges
</div>
                <div className='footer-text-white'>Delhi</div>
                <div className='footer-text-smaller'>Sector 112, Landran,
Mohali, Punjab 140307</div>
                <div className='footer-text-smaller'><PhoneIcon /> 1800-200-3575</div>
                <div className='footer-text-smaller'><LanguageIcon />https://www.cgc.edu.in/</div>
            </div>

            <div className='foooter-center'>
                <div className='important-link'>Important Links</div>
                <a href='https://www.cgc.edu.in/anti-ragging-committee' target='_blank'>Anti-Ragging Initiative</a>
                <a href='https://www.cgc.edu.in/placements'>Career Counselling and Placement Section</a>
                <a href='https://www.cgc.edu.in/college-rules-regulations'>College Rules & Regulations</a>
                <a href='https://www.cgc.edu.in/internal-complaint-committee'>Internal Complaint Committee
</a>
                <a href='https://www.cgc.edu.in/student-grievance-redressal-committee' target='_blank' target='_blank'>Grievance Cell</a>
                
                <a href='https://www.cgc.edu.in/'>College Official Website</a>
                <a href='https://www.cgc.edu.in/contact-us'>Contact Us</a>

            </div>

            <div className='footer-right'>
                <div className='footer-right-name'><CloudIcon/>CGC Landran</div>
                <div className='today-date-footer'>{todayDate.toDateString()}</div>
            </div>
        </div>
    )
}

export default Footer