const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function verifyUser(request, env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new Error('Missing sign-in token.')
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) throw new Error('Worker Supabase verification is not configured.')
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: env.SUPABASE_ANON_KEY } })
  if (!response.ok) throw new Error('Your session could not be verified. Please sign in again.')
  return response.json()
}

function outputText(raw) {
  if (raw.output_text) return raw.output_text
  for (const item of raw.output || []) for (const content of item.content || []) if (content.type === 'output_text') return content.text
  return ''
}

async function runOpenAI(env, instruction, useWeb) {
  const base = { model: env.OPENAI_MODEL || 'gpt-5-mini', input: instruction, text: { format: { type: 'json_object' } } }
  const attempts = useWeb ? ['web_search', 'web_search_preview', null] : [null]
  let lastError
  for (const toolType of attempts) {
    const payload = toolType ? { ...base, tools: [{ type: toolType }] } : base
    const response = await fetch('https://api.openai.com/v1/responses', { method:'POST', headers:{ Authorization:`Bearer ${env.OPENAI_API_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify(payload) })
    const raw = await response.json()
    if (response.ok) return JSON.parse(outputText(raw))
    lastError = new Error(raw.error?.message || 'OpenAI request failed')
    if (!toolType) break
  }
  throw lastError
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
    if (request.method !== 'POST') return Response.json({ error:'Method not allowed' }, { status:405, headers:corsHeaders })
    try {
      await verifyUser(request, env)
      const body=await request.json(); const action=body.action||'relationship_intelligence'; const person=body.person||{}; const interactions=Array.isArray(body.interactions)?body.interactions:[]; const writer=body.writer_profile||{}
      const evidence={ person, interactions:interactions.map(item=>({date:item.interaction_date||'',type:item.interaction_type||'',details:item.details||''})) }
      let instruction=''; let useWeb=false
      if(action==='relationship_intelligence'||action==='research_person'){
        useWeb=true
        instruction=`You are the verified contact-intelligence engine for People First Network.\n\nWRITER:\n${JSON.stringify(writer)}\n\nPRIVATE RELATIONSHIP EVIDENCE:\n${JSON.stringify(evidence)}\n\nResearch the contact and company on current public web sources. Resolve identity conservatively using name, title, company, email domain, LinkedIn URL, and location when supplied. Never merge facts from a different person.\n\nRULES:\n1. Clearly separate private relationship facts from verified public facts.\n2. Never invent a conversation, promise, dinner, invitation, mentorship detail, personal fact, or future plan.\n3. Public facts must be supported by sources. If identity is uncertain, state that and omit questionable facts.\n4. The handwritten note may use ONLY PRIVATE RELATIONSHIP EVIDENCE—not newly found public facts—unless Sam already mentioned those facts in his notes.\n5. The note must sound warm, direct, specific and human; 70-145 words; sign exactly “— Sam”. No corporate filler.\n6. Questions may use verified public facts, but should not feel invasive.\n\nReturn JSON with relationship_summary, relationship_stage, private_relationship_facts (array), public_facts (array), shared_history (array), conversation_themes (array), next_opener, next_questions (array of 3-5), ways_to_help (array), risks_to_avoid (array), recommended_follow_up, handwritten_note, note_evidence (array), sources (array of objects with title and url), identity_confidence (high|medium|low), confidence (high|medium|low).`
      } else {
        instruction=`Prepare Sam for a real conversation using only the supplied relationship evidence and any saved AI intelligence inside the person record. Do not invent facts. Return JSON with summary, opener, questions (3-5), ways_to_help, risks_to_avoid, and recommended_follow_up.\nEVIDENCE:\n${JSON.stringify(evidence)}`
      }
      const result=await runOpenAI(env,instruction,useWeb)
      return Response.json(result,{headers:corsHeaders})
    } catch(error){ return Response.json({error:error.message||String(error)},{status:400,headers:corsHeaders}) }
  }
}
