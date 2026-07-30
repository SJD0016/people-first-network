import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import VoiceCapture from '../components/VoiceCapture'
import { supabase, cardDraft, addDays, currentUser } from '../lib'

export default function NewConnection() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [followUp, setFollowUp] = useState('')

  const appendVoice = (text) => setNotes(current => `${current}${current ? ' ' : ''}${text}`)

  const submit = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email') || '').trim()
    const name = String(f.get('name') || '').trim()
    const payload = {
      name, company:f.get('company'), title:f.get('title'),
      email, phone:f.get('phone'), notes,
      tags:[f.get('metAt')].filter(Boolean), last_contact:f.get('lastContact'),
      next_follow_up:followUp || null,
      profile_summary:`Connected through ${f.get('metAt') || 'a recent conversation'}.`,
      card_draft:cardDraft(name, notes)
    }

    setSaving(true)
    const user = await currentUser()

    let duplicateQuery = supabase.from('people').select('id,name,email').eq('owner_id', user.id).limit(1)
    duplicateQuery = email ? duplicateQuery.eq('email', email) : duplicateQuery.ilike('name', name)
    const { data: duplicate } = await duplicateQuery
    if (duplicate?.length && !confirm(`${duplicate[0].name} may already exist. Add another profile anyway?`)) {
      setSaving(false)
      return
    }

    const { data, error } = await supabase.from('people').insert({ ...payload, owner_id:user.id }).select().single()
    if (error) { alert(error.message); setSaving(false); return }

    await supabase.from('interactions').insert({
      owner_id:user.id, person_id:data.id, interaction_date:payload.last_contact,
      interaction_type:'Met', details:payload.notes
    })
    navigate(`/people/${data.id}`)
  }

  const setFollowUpDays = (days) => setFollowUp(addDays(new Date().toISOString().slice(0,10), days))

  return <>
    <PageHeader title="New Connection" subtitle="Add someone in under a minute."/>
    <form className="panel form-stack" onSubmit={submit}>
      <div className="form-grid">
        <label>Full name<input name="name" required autoFocus/></label>
        <label>Company<input name="company"/></label>
        <label>Title<input name="title"/></label>
        <label>Where you met<input name="metAt" placeholder="Cultivate, store visit, LinkedIn…"/></label>
        <label>Email<input type="email" name="email"/></label>
        <label>Phone<input name="phone"/></label>
      </div>

      <label>What did you talk about?
        <textarea name="notes" required value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Use voice capture or type the details you do not want to forget."/>
      </label>
      <VoiceCapture onText={appendVoice}/>

      <div className="form-grid">
        <label>Last contact<input type="date" name="lastContact" defaultValue={new Date().toISOString().slice(0,10)}/></label>
        <label>Follow up on<input type="date" name="nextFollowUp" value={followUp} onChange={e=>setFollowUp(e.target.value)}/></label>
      </div>
      <div className="quick-buttons">
        <button type="button" onClick={()=>setFollowUpDays(7)}>7 days</button>
        <button type="button" onClick={()=>setFollowUpDays(30)}>30 days</button>
        <button type="button" onClick={()=>setFollowUpDays(90)}>90 days</button>
        <button type="button" onClick={()=>setFollowUp('')}>No reminder</button>
      </div>
      <button className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Create Profile'}</button>
    </form>
  </>
}
