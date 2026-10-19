import React, { useState, useEffect } from 'react'
import './stock.css'
import SearchBox from '../../components/SearchBox/searchBox'
import TableComp from '../../components/Table/tableComp';
import axios from '@/api/client'
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
            console.log(err)
        }).finally(() => {
            props.hideLoader()
        })
    }

    useEffect(() => {
        fetchData()
    }, [medicineName])
    return (
        <div className='stock-page'>
            <SearchBox placeholder="Seach Medicine" value={medicineName} onChange={handleInputChange} />
            <div className='stock-page-card'>
                <TableComp header={headers} data={stocks} />
            </div>
        </div>
    )
}

export default Stock
