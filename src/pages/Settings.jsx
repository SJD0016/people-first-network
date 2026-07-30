import PageHeader from '../components/PageHeader'
import { aiEndpoint } from '../lib'
export default function Settings({ session }) {
  return <><PageHeader title="Settings" subtitle="Account, security, and connection status."/>
    <div className="two-col">
      <section className="panel"><div className="eyebrow">Account</div><h2>{session?.user?.user_metadata?.full_name || 'People First Network user'}</h2><p>{session?.user?.email}</p><p className="muted">Your account ID: {session?.user?.id}</p></section>
      <section className="panel"><div className="eyebrow">Production status</div><h2>Private account mode</h2><div className="checklist"><div>✓ Email and password authentication</div><div>✓ User-owned contact records</div><div>✓ Row-level database security</div><div>{aiEndpoint ? '✓' : '○'} Phase 1 AI endpoint {aiEndpoint ? 'connected' : 'not configured'}</div></div></section>
    </div>
  </>
}
