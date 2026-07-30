import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib'

export default function Prepare() {
  const [people,setPeople]=useState([])
  const [id,setId]=useState('')
  useEffect(()=>{ if(supabase) supabase.from('people').select('*').order('name').then(({data})=>{setPeople(data||[]);setId(data?.[0]?.id||'')}) },[])
  const p=people.find(x=>x.id===id)
  return <>
    <PageHeader title="Prepare Me" subtitle="Walk into the next conversation remembering what matters."/>
    <section className="panel"><label>Choose a person<select value={id} onChange={e=>setId(e.target.value)}><option value="">Select someone</option>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></section>
    {p && <div className="two-col">
      <section className="panel"><div className="eyebrow">Briefing</div><h2>Before you talk with {p.name.split(' ')[0]}</h2><p><strong>Remember:</strong> {p.profile_summary || p.notes}</p><p><strong>Suggested opener:</strong> “I have been thinking about our last conversation. How has that developed since we spoke?”</p></section>
      <section className="panel"><h2>Questions worth asking</h2><ol className="question-list"><li>What are you most focused on right now?</li><li>What has changed since we last spoke?</li><li>Is there a connection or resource that would help?</li></ol></section>
    </div>}
  </>
}
