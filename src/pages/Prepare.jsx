import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { supabase, ownerId, callAI } from '../lib'

export default function Prepare() {
  const [people,setPeople]=useState([]); const [id,setId]=useState(''); const [brief,setBrief]=useState(null); const [busy,setBusy]=useState(false)
  useEffect(()=>{ ownerId().then(uid => supabase.from('people').select('*').eq('owner_id', uid).order('name')).then(({data})=>{setPeople(data||[]);setId(data?.[0]?.id||'')}) },[])
  const person=people.find(item=>item.id===id)
  const prepare=async()=>{ if(!person)return; setBusy(true); try { const uid=await ownerId(); const {data:interactions}=await supabase.from('interactions').select('*').eq('owner_id',uid).eq('person_id',person.id).order('interaction_date',{ascending:false}); setBrief(await callAI('prepare_me',{person,interactions:interactions||[]})) } catch(error){alert(error.message)} finally{setBusy(false)} }
  return <><PageHeader title="Prepare Me" subtitle="Walk into the next conversation remembering what matters."/>
    <section className="panel form-stack"><label>Choose a person<select value={id} onChange={e=>{setId(e.target.value);setBrief(null)}}><option value="">Select someone</option>{people.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="primary-button" onClick={prepare} disabled={!person||busy}>{busy?'Preparing…':'Build AI meeting brief'}</button></section>
    {person && <div className="two-col"><section className="panel"><div className="eyebrow">Relationship memory</div><h2>Before you talk with {person.name.split(' ')[0]}</h2><p>{person.profile_summary || person.notes || 'Add interaction notes to improve this briefing.'}</p></section><section className="panel"><div className="eyebrow">Suggested opener</div><h2>{brief?.opener || 'Start with the last real detail you discussed.'}</h2><p>{brief?.recommended_follow_up}</p></section></div>}
    {brief && <div className="two-col"><section className="panel"><h2>Questions worth asking</h2><ol className="question-list">{(brief.questions||[]).map((q,i)=><li key={i}>{q}</li>)}</ol></section><section className="panel"><h2>Ways to be useful</h2><ul>{(brief.ways_to_help||[]).map((item,i)=><li key={i}>{item}</li>)}</ul><h3>Avoid</h3><ul>{(brief.risks_to_avoid||[]).map((item,i)=><li key={i}>{item}</li>)}</ul></section></div>}
  </>
}
