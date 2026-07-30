import PageHeader from '../components/PageHeader'
export default function Settings(){
  return <>
    <PageHeader title="Settings" subtitle="Connection and deployment status."/>
    <section className="panel"><h2>Version 2</h2><p>This build is ready for Cloudflare Pages and your Supabase database.</p><div className="checklist"><div>✓ Secure email sign-in</div><div>✓ Supabase people, interactions, and events</div><div>✓ Public connect page structure</div><div>✓ Mobile-first layout</div><div>✓ AI-ready card and research architecture</div></div></section>
  </>
}
