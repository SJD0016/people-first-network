import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PersonRow from '../components/PersonRow'
import { supabase } from '../lib'

export default function People() {
  const [people, setPeople] = useState([])
  const [search, setSearch] = useState('')
  useEffect(()=>{ if(supabase) supabase.from('people').select('*').order('name').then(({data})=>setPeople(data||[])) },[])
  const filtered = people.filter(p => [p.name,p.company,p.title,p.notes].join(' ').toLowerCase().includes(search.toLowerCase()))
  return <>
    <PageHeader title="People" subtitle="Every relationship in one place." action={<Link className="primary-button" to="/people/new">+ Add Person</Link>} />
    <section className="panel">
      <input className="search-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people, companies, or notes…"/>
      <div className="stack top-gap">{filtered.length ? filtered.map(p=><PersonRow key={p.id} person={p}/>) : <div className="empty">No matching people.</div>}</div>
    </section>
  </>
}
