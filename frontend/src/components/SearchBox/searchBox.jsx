import React from 'react'
import './searchBox.css'
import SearchIcon from '@mui/icons-material/Search';
const SearchBox = (props) => {
  const placeholder = props.placeholder ? props.placeholder : "";
  const value = props.value ?? "";

  const handleOnChange = (event) => {
    if (props.onChange) {
      props.onChange(event.target.value)
    }
  }

  const handleClick = () => {
    if (props.handleClick) {
      props.handleClick(value)
    }
  }

  return (
    <div className='page-searchBox'>
      <input className='input-box' value={value} onChange={(event) => handleOnChange(event)} placeholder={placeholder} />
      <button type='button' className='search-btn' onClick={handleClick} aria-label='Search'><SearchIcon /></button>
    </div>
  )
}

export default SearchBox
