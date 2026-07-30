import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import VoiceCapture from '../components/VoiceCapture'
import { supabase, formatDate, initials, aiEndpoint } from '../lib'

const demoPerson = {
  id: 'demo',
  name: 'Neal Glatt',
  company: 'GrowTheBench',
  title: 'Founder',
  email: '',
  phone: '',
  notes:
    'Met at Cultivate. Strong connection around people development and practical leadership.',
  profile_summary:
    'Industry educator and leadership specialist. Sam values Neal’s practical, people-centered approach.',
  card_draft: `Neal,

Thank you for the time, generosity, and practical insight you shared at Cultivate. Your session gave me ideas I can put to work immediately, and I especially appreciated the personal encouragement and connections. I’m grateful we had the chance to meet and look forward to staying connected.

— Sam`,
  last_contact: '2026-07-13',
  next_follow_up: '2026-08-13',
}

const demoInteractions = [
  {
    id: 'demo-1',
    interaction_type: 'Met',
    interaction_date: '2026-07-13',
    details: 'Connected at Cultivate and attended his session.',
  },
  {
    id: 'demo-2',
    interaction_type: 'Follow-up',
    interaction_date: '2026-07-14',
    details: 'Prepared a handwritten thank-you note.',
  },
]

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

    if (!supabase) {
      if (id === 'demo') {
        setPerson(demoPerson)
        setInteractions(demoInteractions)
      } else {
        setError('This profile is unavailable in demo mode.')
      }
      return
    }

    const [personResult, interactionsResult] = await Promise.all([
      supabase.from('people').select('*').eq('id', id).single(),
      supabase
        .from('interactions')
        .select('*')
        .eq('person_id', id)
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
    if (!supabase) {
      alert('Connect Supabase to save changes.')
      return
    }

    const { error: updateError } = await supabase
      .from('people')
      .update({ next_follow_up: value || null })
      .eq('id', id)

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

    if (!supabase) {
      alert('Connect Supabase to save interactions.')
      return
    }

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
    if (!supabase) {
      alert('Connect Supabase to edit interactions.')
      return
    }

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
    if (!supabase) {
      alert('Connect Supabase to delete interactions.')
      return
    }

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
    if (!supabase) {
      alert('Connect Supabase to delete this person.')
      return
    }

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
    if (!supabase) {
      alert('Connect Supabase before using AI research.')
      return
    }

    if (!aiEndpoint) {
      alert('AI research endpoint has not been connected yet.')
      return
    }

    setResearching(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch(aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'relationship_intelligence',
          person,
          interactions,
          writer_profile: {
            name: 'Samuel Di Rito',
            preferred_name: 'Sam',
            business: "Collier's Greenhouse & Garden Center",
            role: 'Third-generation greenhouse and garden center operator',
            values: ['People First, Plants Always', 'gratitude', 'specificity', 'long-term relationships'],
            voice: 'warm, direct, sincere, grounded, never corporate or overly polished',
          },
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Research failed.')
      }

      const summary =
        result.relationship_summary ||
        result.summary ||
        result.profile_summary ||
        person.profile_summary ||
        ''

      const listSection = (title, items) =>
        Array.isArray(items) && items.length
          ? `${title}:\n${items.map(item => `• ${item}`).join('\n')}`
          : ''

      const researchNotes = [
        result.relationship_stage
          ? `Relationship stage:\n${result.relationship_stage}`
          : '',
        listSection('Shared history', result.shared_history),
        listSection('What matters to them', result.what_matters),
        listSection('Acts of generosity', result.acts_of_generosity),
        listSection('Conversation themes', result.conversation_themes),
        listSection('People and organizations', result.people_and_organizations),
        listSection('Future opportunities', result.future_opportunities),
        result.next_opener
          ? `Suggested next opener:\n${result.next_opener}`
          : result.opener
            ? `Suggested next opener:\n${result.opener}`
            : '',
        listSection(
          'Questions for the next conversation',
          result.next_questions || result.questions
        ),
        listSection('Ways to help', result.ways_to_help),
        listSection('Risks to avoid', result.risks_to_avoid),
        result.recommended_follow_up
          ? `Recommended follow-up:\n${result.recommended_follow_up}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n')

      const baseNotes = (person.notes || '')
        .split('\n\nAI Relationship Intelligence:')[0]
        .split('\n\nAI Research:')[0]
        .trim()

      const updatePayload = {
        profile_summary: summary,
        notes: `${baseNotes}\n\nAI Relationship Intelligence:\n${researchNotes}`.trim(),
      }

      const generatedCard =
        result.handwritten_note ||
        result.card_draft ||
        result.note_draft ||
        ''

      if (generatedCard) {
        updatePayload.card_draft = generatedCard
      }

      const { error: updateError } = await supabase
        .from('people')
        .update(updatePayload)
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

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
              {researching ? 'Researching…' : 'Research Person'}
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

      {!supabase && (
        <div className="notice warning top-gap">
          Demo profile: connect Supabase to save edits, interactions, and AI
          research.
        </div>
      )}

      <section className="panel profile-hero top-gap">
        <div className="avatar large">{initials(person.name)}</div>
        <div>
          <h2>{person.name}</h2>
          <p>
            {person.email || 'No email'} · {person.phone || 'No phone'}
          </p>
        </div>
      </section>

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
