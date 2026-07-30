import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib'

export default function Cards(){
  const [people,setPeople]=useState([])
  useEffect(()=>{ if(supabase) supabase.from('people').select('*').not('card_draft','is',null).order('name').then(({data})=>setPeople(data||[])) },[])
  return <>
    <PageHeader title="Handwritten Cards" subtitle="Specific, personal drafts ready for A6 cards."/>
    <div className="stack">{people.length ? people.map(p=><section className="panel" key={p.id}><div className="eyebrow">{p.name}</div><h2>{p.company || 'Personal connection'}</h2><div className="note-preview">{p.card_draft}</div></section>) : <div className="empty">No card drafts yet.</div>}</div>
  </>
}
