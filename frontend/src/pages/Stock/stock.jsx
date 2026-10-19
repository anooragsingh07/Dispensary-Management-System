import React, { useState, useEffect } from 'react'
import './stock.css'
import SearchBox from '../../components/SearchBox/searchBox'
import TableComp from '../../components/Table/tableComp';
import axios from '@/api/client'
import { toast } from 'react-toastify';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
const Stock = (props) => {
    const [medicineName, setMedicineName] = useState("");
    const [stocks, setStocks] = useState([]);

    const handleInputChange = (value) => {
        setMedicineName(value)
    }

    const headers = ["Sr No.", "Name", "Quantity", "Usage"];

    const getFormattedData = (data) => {
        let newarr = data.map((item, ind) => {
            return { srNo: ind + 1, name: item.name, quantity: item.quantity, usage: item.usage }
        })
        setStocks(newarr);
    }

    const fetchData = async () => {
        props.showLoader();
        const request = medicineName.trim()
            ? axios.get('/api/medicine/search', { params: { name: medicineName } })
            : axios.get('/api/medicine/get');
        await request.then(resp => {
            getFormattedData(resp.data.medicines || [])
        }).catch(err => {
            toast.error(err?.response?.data?.error || 'Unable to load medicine stock')
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        fetchData()
    }, [medicineName])
    return (
        <div className='stock-page'>
            <div className="stock-heading">
                <div><p className="eyebrow"><span className="eyebrow-dot" /> CAMPUS HEALTH CENTRE</p><h1>Medicine stock</h1><p>Check the medicines currently listed by the dispensary.</p></div>
                <span className="stock-heading-icon"><Inventory2OutlinedIcon /></span>
            </div>
            <SearchBox placeholder="Search medicine" value={medicineName} onChange={handleInputChange} />
            <div className='stock-page-card'>
                <TableComp header={headers} data={stocks} />
            </div>
        </div>
    )
}

export default Stock
