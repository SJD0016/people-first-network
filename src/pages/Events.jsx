import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase, formatDate } from '../lib'

export default function Events(){
  const [events,setEvents]=useState([])
  useEffect(()=>{ if(supabase) supabase.from('events').select('*').order('event_date',{ascending:false}).then(({data})=>setEvents(data||[])) },[])
  const add = async e => {
    e.preventDefault(); if(!supabase) return
    const f=new FormData(e.currentTarget); const {data:{user}}=await supabase.auth.getUser()
    const payload={owner_id:user.id,name:f.get('name'),event_date:f.get('date'),location:f.get('location'),notes:f.get('notes')}
    const {data,error}=await supabase.from('events').insert(payload).select().single()
    if(!error){setEvents([data,...events]);e.currentTarget.reset()}
  }
  return <>
    <PageHeader title="Events" subtitle="Group relationships around where they began."/>
    <div className="two-col">
      <form className="panel form-stack" onSubmit={add}><h2>Add event</h2><label>Name<input name="name" required/></label><label>Date<input name="date" type="date"/></label><label>Location<input name="location"/></label><label>Notes<textarea name="notes"/></label><button className="primary-button">Save Event</button></form>
      <section className="panel"><h2>Events</h2><div className="stack">{events.map(e=><div className="event-row" key={e.id}><strong>{e.name}</strong><span>{formatDate(e.event_date)} · {e.location}</span></div>)}</div></section>
    </div>
  </>
}
