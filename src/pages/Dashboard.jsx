import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PersonRow from '../components/PersonRow'
import { supabase, formatDate } from '../lib'

const demoPeople = [
  { id:'demo', name:'Neal Glatt', company:'GrowTheBench', title:'Founder', next_follow_up:'2026-08-13', last_contact:'2026-07-13' }
]

export default function Dashboard() {
  const [people, setPeople] = useState([])
  const [events, setEvents] = useState([])
  const [interactions, setInteractions] = useState([])

  useEffect(() => {
    if (!supabase) return setPeople(demoPeople)
    Promise.all([
      supabase.from('people').select('*').order('last_contact', { ascending:false }),
      supabase.from('events').select('*').order('event_date', { ascending:true }),
      supabase.from('interactions').select('*, people(name)').order('interaction_date', { ascending:false }).limit(8)
    ]).then(([p,e,i]) => {
      setPeople(p.data || [])
      setEvents(e.data || [])
      setInteractions(i.data || [])
    })
  }, [])

  const today = new Date().toISOString().slice(0,10)
  const duePeople = people.filter(p => p.next_follow_up && p.next_follow_up <= today)
  const recent = people.slice(0,5)

  return <>
    <PageHeader title="Your Network" subtitle="Remember the person, not just the contact." action={<Link className="primary-button" to="/people/new">+ New Connection</Link>} />
    <div className="stats-grid">
      <div className="stat-card"><span>People</span><strong>{people.length}</strong></div>
      <div className="stat-card"><span>Follow-ups due</span><strong>{duePeople.length}</strong></div>
      <div className="stat-card"><span>Cards ready</span><strong>{people.filter(p=>p.card_draft).length}</strong></div>
      <div className="stat-card"><span>Events</span><strong>{events.length}</strong></div>
    </div>

    {duePeople.length > 0 && <section className="panel priority-panel">
      <div className="eyebrow">Today’s priorities</div>
      <h2>People worth reconnecting with</h2>
      <div className="stack">{duePeople.slice(0,5).map(p=><div className="followup-row" key={p.id}><div><strong>{p.name}</strong><span>Follow-up due {formatDate(p.next_follow_up)}</span></div><Link className="secondary-button" to={`/people/${p.id}`}>Open</Link></div>)}</div>
    </section>}

    <div className="two-col">
      <section className="panel"><h2>Recent people</h2><div className="stack">{recent.length ? recent.map(p=><PersonRow key={p.id} person={p}/>) : <div className="empty">No people yet.</div>}</div></section>
      <section className="panel"><div className="eyebrow">Quick capture</div><h2>Who did you meet?</h2><p>Capture the conversation before the details disappear.</p><Link className="primary-button" to="/people/new">Add a new connection</Link></section>
    </div>

    <section className="panel top-gap">
      <div className="eyebrow">Recent activity</div>
      <h2>Relationship timeline</h2>
      {interactions.length ? interactions.map(i=><div className="activity-row" key={i.id}><div><strong>{i.people?.name || 'Contact'}</strong><span>{i.interaction_type} · {formatDate(i.interaction_date)}</span></div><p>{i.details}</p></div>) : <div className="empty">No activity yet.</div>}
    </section>
  </>
}
