import { useState } from 'react'

export default function Connect(){
  const [done,setDone]=useState(false)
  const [error,setError]=useState('')
  const submit=async e=>{
    e.preventDefault(); const f=new FormData(e.currentTarget)
    const endpoint=import.meta.env.VITE_PUBLIC_CONNECT_FUNCTION_URL
    if(!endpoint) return setError('Public intake is not connected yet.')
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(f.entries()))})
    if(response.ok) setDone(true); else setError('Something went wrong. Please try again.')
  }
  return <div className="connect-page"><div className="connect-card">
    <div className="eyebrow">Samuel Di Rito</div>
    {done ? <><h1>Thank you.</h1><p>Your information was received. Sam looks forward to staying connected.</p></> :
    <><h1>Let’s stay connected.</h1><p>Great relationships should not end with a business card.</p>
    <form className="form-stack" onSubmit={submit}><div className="form-grid"><label>Name<input name="name" required/></label><label>Company<input name="company"/></label><label>Email<input name="email" type="email" required/></label><label>Phone<input name="phone"/></label></div><label>Where did we meet?<input name="metAt"/></label><label>What did we talk about?<textarea name="notes"/></label><button className="primary-button">Stay Connected</button></form>{error&&<div className="notice warning">{error}</div>}</>}
  </div></div>
}
