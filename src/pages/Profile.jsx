import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import VoiceCapture from '../components/VoiceCapture'
import { supabase, formatDate, initials, callAI, ownerId } from '../lib'

export default function Profile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [person, setPerson] = useState(null)
  const [interactions, setInteractions] = useState([])
  const [showInteraction, setShowInteraction] = useState(false)
  const [interactionText, setInteractionText] = useState('')
  const [researching, setResearching] = useState(false)
  const [error, setError] = useState('')

  const [editingInteractionId, setEditingInteractionId] = useState(null)
  const [editingInteractionDate, setEditingInteractionDate] = useState('')
  const [editingInteractionType, setEditingInteractionType] = useState('Note')
  const [editingInteractionText, setEditingInteractionText] = useState('')

  const load = async () => {
    setError('')

    const uid = await ownerId()
    const [personResult, interactionsResult] = await Promise.all([
      supabase.from('people').select('*').eq('id', id).eq('owner_id', uid).single(),
      supabase
        .from('interactions')
        .select('*')
        .eq('person_id', id)
        .eq('owner_id', uid)
        .order('interaction_date', { ascending: false }),
    ])

    if (personResult.error) {
      setError(personResult.error.message || 'Could not load this profile.')
      return
    }

    setPerson(personResult.data)
    setInteractions(interactionsResult.data || [])
  }

  useEffect(() => {
    load()
  }, [id])

  const saveFollowUp = async value => {
    const uid = await ownerId()

    const { error: updateError } = await supabase
      .from('people')
      .update({ next_follow_up: value || null })
      .eq('id', id)
      .eq('owner_id', uid)

    if (updateError) {
      alert(updateError.message)
      return
    }

    setPerson(current => ({
      ...current,
      next_follow_up: value || null,
    }))
  }

  const addInteraction = async event => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const payload = {
      owner_id: user.id,
      person_id: id,
      interaction_date: form.get('date'),
      interaction_type: form.get('type'),
      details: interactionText.trim(),
    }

    const { error: insertError } = await supabase
      .from('interactions')
      .insert(payload)

    if (insertError) {
      alert(insertError.message)
      return
    }

    await supabase
      .from('people')
      .update({ last_contact: payload.interaction_date })
      .eq('id', id)

    setInteractionText('')
    setShowInteraction(false)
    load()
  }

  const beginEditInteraction = interaction => {
    setEditingInteractionId(interaction.id)
    setEditingInteractionDate(interaction.interaction_date)
    setEditingInteractionType(interaction.interaction_type)
    setEditingInteractionText(interaction.details)
  }

  const cancelEditInteraction = () => {
    setEditingInteractionId(null)
    setEditingInteractionDate('')
    setEditingInteractionType('Note')
    setEditingInteractionText('')
  }

  const saveInteractionEdit = async interactionId => {

    const { error: updateError } = await supabase
      .from('interactions')
      .update({
        interaction_date: editingInteractionDate,
        interaction_type: editingInteractionType,
        details: editingInteractionText.trim(),
      })
      .eq('id', interactionId)

    if (updateError) {
      alert(updateError.message)
      return
    }

    cancelEditInteraction()
    load()
  }

  const deleteInteraction = async interactionId => {

    if (!window.confirm('Delete this interaction?')) return

    const { error: deleteError } = await supabase
      .from('interactions')
      .delete()
      .eq('id', interactionId)

    if (deleteError) {
      alert(deleteError.message)
      return
    }

    load()
  }

  const deletePerson = async () => {

    const confirmed = window.confirm(
      `Delete ${person.name} and all of this person’s interactions? This cannot be undone.`
    )

    if (!confirmed) return

    const { error: interactionDeleteError } = await supabase
      .from('interactions')
      .delete()
      .eq('person_id', id)

    if (interactionDeleteError) {
      alert(interactionDeleteError.message)
      return
    }

    const { error: personDeleteError } = await supabase
      .from('people')
      .delete()
      .eq('id', id)

    if (personDeleteError) {
      alert(personDeleteError.message)
      return
    }

    navigate('/people')
  }

  const research = async () => {
    setResearching(true)
    try {
      const result = await callAI('relationship_intelligence', {
        person,
        interactions,
        writer_profile: {
          name: 'Samuel Di Rito', preferred_name: 'Sam',
          business: "Collier's Greenhouse & Garden Center",
          role: 'Third-generation greenhouse and garden center operator',
          values: ['People First, Plants Always', 'gratitude', 'specificity', 'long-term relationships'],
          voice: 'warm, direct, sincere, grounded, never corporate or overly polished',
        },
      })

      if (!result.schema_version) throw new Error('PFN AI returned an outdated response. Replace and redeploy the AI Worker from the Phase 1.1 patch.')

      const updatePayload = {
        profile_summary: result.relationship_summary || person.profile_summary,
        card_draft: result.handwritten_note || person.card_draft,
        ai_intelligence: result,
        ai_researched_at: result.generated_at || new Date().toISOString(),
      }
      const uid = await ownerId()
      const { error: updateError } = await supabase.from('people').update(updatePayload).eq('id', id).eq('owner_id', uid)
      if (updateError) throw updateError
      await load()
    } catch (researchError) {
      alert(researchError.message || 'Research failed.')
    } finally {
      setResearching(false)
    }
  }

  if (error) {
    return (
      <>
        <PageHeader
          title="Profile unavailable"
          subtitle="This contact could not be loaded."
        />
        <section className="panel">
          <p>{error}</p>
        </section>
      </>
    )
  }

  if (!person) {
    return <div className="center-screen">Loading profile…</div>
  }

  return (
    <>
      <PageHeader
        title={person.name}
        subtitle={[person.title, person.company].filter(Boolean).join(' · ')}
        action={
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="primary-button"
              onClick={research}
              disabled={researching}
            >
              {researching ? 'Verifying identity and sources…' : person.ai_intelligence ? 'Refresh AI Intelligence' : 'Run AI Intelligence'}
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={deletePerson}
            >
              Delete Person
            </button>
          </div>
        }
      />


      <section className="panel profile-hero top-gap">
        <div className="avatar large">{initials(person.name)}</div>
        <div>
          <h2>{person.name}</h2>
          <p>
            {person.email || 'No email'} · {person.phone || 'No phone'}
          </p>
        </div>
      </section>

      {person.ai_intelligence && (
        <section className="panel intelligence-panel top-gap">
          <div className="eyebrow">Phase 1.1 · Evidence-first intelligence</div>
          <div className="section-heading">
            <h2>PFN relationship brief</h2>
            <span className={`confidence-badge confidence-${person.ai_intelligence.identity?.confidence || 'low'}`}>
              Identity: {person.ai_intelligence.identity?.confidence || 'low'}
            </span>
          </div>

          <p>{person.ai_intelligence.relationship_summary || 'No summary returned.'}</p>

          <div className="intel-grid">
            <div><strong>Relationship stage</strong><p>{person.ai_intelligence.relationship_stage || 'Not determined'}</p></div>
            <div><strong>Identity match</strong><p>{person.ai_intelligence.identity?.explanation || 'No identity explanation returned.'}</p></div>
          </div>

          {Array.isArray(person.ai_intelligence.warnings) && person.ai_intelligence.warnings.length > 0 && (
            <div className="ai-warning"><strong>Review before using</strong><ul>{person.ai_intelligence.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div>
          )}

          {Array.isArray(person.ai_intelligence.private_relationship_facts) && person.ai_intelligence.private_relationship_facts.length > 0 && <><h3>From your relationship history</h3><ul>{person.ai_intelligence.private_relationship_facts.map((fact,index)=><li key={index}>{fact}</li>)}</ul></>}

          {Array.isArray(person.ai_intelligence.public_facts) && person.ai_intelligence.public_facts.length > 0 && <><h3>Verified public facts</h3><div className="fact-stack">{person.ai_intelligence.public_facts.map((fact,index)=><div className="fact-card" key={index}><p>{fact.claim}</p><div className="fact-meta"><span>{fact.confidence || 'low'} confidence</span>{Array.isArray(fact.source_urls) && fact.source_urls.map((url,urlIndex)=><a key={urlIndex} href={url} target="_blank" rel="noreferrer">Source {urlIndex + 1}</a>)}</div></div>)}</div></>}

          {person.ai_intelligence.next_opener && <><h3>Best opener</h3><p className="opener-box">{person.ai_intelligence.next_opener}</p></>}
          {Array.isArray(person.ai_intelligence.next_questions) && person.ai_intelligence.next_questions.length > 0 && <><h3>Questions worth asking</h3><ol>{person.ai_intelligence.next_questions.map((question,index)=><li key={index}>{question}</li>)}</ol></>}
          {Array.isArray(person.ai_intelligence.ways_to_help) && person.ai_intelligence.ways_to_help.length > 0 && <><h3>Ways you may be able to help</h3><ul>{person.ai_intelligence.ways_to_help.map((item,index)=><li key={index}>{item}</li>)}</ul></>}
          {Array.isArray(person.ai_intelligence.risks_to_avoid) && person.ai_intelligence.risks_to_avoid.length > 0 && <><h3>Avoid assuming</h3><ul>{person.ai_intelligence.risks_to_avoid.map((item,index)=><li key={index}>{item}</li>)}</ul></>}
          {person.ai_intelligence.recommended_follow_up && <><h3>Recommended follow-up</h3><p>{person.ai_intelligence.recommended_follow_up}</p></>}

          {Array.isArray(person.ai_intelligence.sources) && person.ai_intelligence.sources.length > 0 && <details><summary>All sources reviewed</summary><ul>{person.ai_intelligence.sources.map((source,index)=><li key={index}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title || source.url}</a> : source.title}</li>)}</ul></details>}
          <p className="muted ai-timestamp">Generated {person.ai_researched_at ? new Date(person.ai_researched_at).toLocaleString() : 'recently'} · Public facts require linked evidence.</p>
        </section>
      )}

      <div className="two-col">
        <div className="stack">
          <section className="panel">
            <div className="eyebrow">Relationship summary</div>
            <h2>What matters</h2>
            <p>{person.profile_summary || person.notes}</p>
            <p className="muted pre-wrap">{person.notes}</p>
          </section>

          <section className="panel">
            <div className="section-heading">
              <h2>Timeline</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowInteraction(value => !value)}
              >
                + Add interaction
              </button>
            </div>

            {showInteraction && (
              <form className="interaction-form" onSubmit={addInteraction}>
                <div className="form-grid">
                  <label>
                    Date
                    <input
                      type="date"
                      name="date"
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </label>

                  <label>
                    Type
                    <select name="type">
                      <option>Call</option>
                      <option>Email</option>
                      <option>Met</option>
                      <option>LinkedIn</option>
                      <option>Follow-up</option>
                      <option>Note</option>
                    </select>
                  </label>
                </div>

                <label>
                  What happened?
                  <textarea
                    required
                    value={interactionText}
                    onChange={event =>
                      setInteractionText(event.target.value)
                    }
                  />
                </label>

                <VoiceCapture
                  onText={text =>
                    setInteractionText(current =>
                      `${current}${current ? ' ' : ''}${text}`
                    )
                  }
                />

                <button className="primary-button">Save interaction</button>
              </form>
            )}

            {interactions.length ? (
              interactions.map(interaction => (
                <div className="timeline-item" key={interaction.id}>
                  {editingInteractionId === interaction.id ? (
                    <div className="interaction-form">
                      <div className="form-grid">
                        <label>
                          Date
                          <input
                            type="date"
                            value={editingInteractionDate}
                            onChange={event =>
                              setEditingInteractionDate(event.target.value)
                            }
                          />
                        </label>

                        <label>
                          Type
                          <select
                            value={editingInteractionType}
                            onChange={event =>
                              setEditingInteractionType(event.target.value)
                            }
                          >
                            <option>Call</option>
                            <option>Email</option>
                            <option>Met</option>
                            <option>LinkedIn</option>
                            <option>Follow-up</option>
                            <option>Note</option>
                          </select>
                        </label>
                      </div>

                      <label>
                        Details
                        <textarea
                          required
                          value={editingInteractionText}
                          onChange={event =>
                            setEditingInteractionText(event.target.value)
                          }
                        />
                      </label>

                      <div
                        style={{
                          display: 'flex',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() =>
                            saveInteractionEdit(interaction.id)
                          }
                        >
                          Save changes
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={cancelEditInteraction}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong>{interaction.interaction_type}</strong>
                        <span>{formatDate(interaction.interaction_date)}</span>
                        <p>{interaction.details}</p>
                      </div>

                      <div className="timeline-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            beginEditInteraction(interaction)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() =>
                            deleteInteraction(interaction.id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <p className="muted">No interactions yet.</p>
            )}
          </section>
        </div>

        <div className="stack">
          <section className="panel">
            <h2>Follow-up</h2>
            <p>
              <strong>Last contact:</strong>{' '}
              {formatDate(person.last_contact)}
            </p>

            <label>
              Next follow-up
              <input
                type="date"
                value={person.next_follow_up || ''}
                onChange={event => saveFollowUp(event.target.value)}
              />
            </label>
          </section>

          <section className="panel">
            <div className="eyebrow">Handwritten note</div>
            <h2>Current draft</h2>
            <div className="note-preview pre-wrap">
              {person.card_draft || 'Run Research Person to create a personalized draft.'}
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
