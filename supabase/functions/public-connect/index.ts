import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const body = await req.json()
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const ownerId = Deno.env.get('PFN_OWNER_USER_ID')
    if (!ownerId) throw new Error('PFN_OWNER_USER_ID is not configured')

    const { error } = await admin.from('people').insert({
      owner_id: ownerId,
      name: body.name,
      company: body.company || null,
      email: body.email,
      phone: body.phone || null,
      notes: body.notes || null,
      tags: body.metAt ? [body.metAt] : [],
      last_contact: new Date().toISOString().slice(0,10),
      profile_summary: `Connected through ${body.metAt || 'the public connect page'}.`
    })
    if (error) throw error

    return new Response(JSON.stringify({ ok:true }), {
      headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error:String(error) }), {
      status:400,
      headers: { 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*' }
    })
  }
})
