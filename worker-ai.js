export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })

    try {
      const body = await request.json()
      const action = body.action || 'relationship_intelligence'
      const person = body.person || {}
      const interactions = Array.isArray(body.interactions) ? body.interactions : []
      const writer = body.writer_profile || {}

      const evidence = {
        person: {
          name: person.name || '', company: person.company || '', title: person.title || '',
          event: person.event || person.where_met || '', relationship_type: person.relationship_type || '',
          notes: person.notes || '', personal_details: person.personal_details || '',
          interests: person.interests || '', ways_to_help: person.ways_to_help || '',
          profile_summary: person.profile_summary || '', tags: person.tags || '',
        },
        interactions: interactions.map(item => ({
          date: item.interaction_date || '', type: item.interaction_type || '', details: item.details || '',
        })),
      }

      let instruction = ''

      if (action === 'relationship_intelligence' || action === 'research_person') {
        instruction = `You are the relationship-memory engine for People First Network.

WRITER:
${JSON.stringify(writer)}

CONTACT EVIDENCE:
${JSON.stringify(evidence)}

NON-NEGOTIABLE RULES:
1. Use only facts explicitly present in CONTACT EVIDENCE. Never invent a topic, promise, meeting, dinner, compliment, business practice, future visit, mentorship detail, or personal fact.
2. The handwritten note must sound like Sam: warm, plainspoken, grateful, specific, and human. Avoid corporate language, generic praise, and AI phrases.
3. Do not use these phrases unless directly supported: "pleasure connecting", "share your perspective", "look forward to staying in touch", "valuable insights", "leveraging", "drive foot traffic", "sparked ideas", "clearer place to start".
4. Mention at least two concrete details from the evidence when two are available. If only one concrete detail exists, write a shorter note rather than filling space.
5. Do not create a request for coffee, a call, a visit, an introduction, or a future meeting unless the evidence explicitly says Sam wants that.
6. Keep the note between 70 and 145 words. Use natural paragraphs. Sign exactly “— Sam”.
7. The note should explain why the relationship or action mattered to Sam, but only when that meaning is supported by his notes.
8. Prefer precise wording from the user’s notes over polished paraphrases.

Return one JSON object with:
relationship_summary (2-4 factual sentences),
relationship_stage (string),
shared_history (array of factual strings),
what_matters (array),
acts_of_generosity (array),
conversation_themes (array),
people_and_organizations (array),
future_opportunities (array; empty if unsupported),
next_opener (one natural line grounded in evidence),
next_questions (array of 3 grounded questions),
ways_to_help (array; empty if unsupported),
risks_to_avoid (array),
recommended_follow_up (string),
handwritten_note (the finished note),
note_evidence (array listing the exact facts used in the handwritten note),
confidence ("high", "medium", or "low").`
      } else if (action === 'write_card') {
        instruction = `Write a handwritten card from Sam using only this evidence:\n${JSON.stringify(evidence)}\nPurpose: ${body.purpose || 'thank you'}\nFollow the same strict rules: specific, factual, warm, 70-145 words, no invented invitation or generic filler, sign “— Sam”. Return JSON with handwritten_note and note_evidence.`
      } else {
        instruction = `Prepare Sam for a conversation using only these supplied facts:\n${JSON.stringify(evidence)}\nReturn JSON with summary, opener, questions, ways_to_help, and risks_to_avoid. Do not invent facts.`
      }

      const payload = {
        model: env.OPENAI_MODEL || 'gpt-5-mini',
        input: instruction,
        text: { format: { type: 'json_object' } },
      }

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const raw = await response.json()
      if (!response.ok) throw new Error(raw.error?.message || 'OpenAI request failed')

      const outputText = raw.output_text || raw.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text
      if (!outputText) throw new Error('No AI output was returned')

      return Response.json(JSON.parse(outputText), { headers: cors })
    } catch (error) {
      return Response.json({ error: String(error) }, { status: 400, headers: cors })
    }
  },
}
