import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Users, UserPlus, Upload, Sparkles, Mail, CalendarDays, Settings, LogOut } from 'lucide-react'
import { supabase } from '../lib'

const links = [['/', 'Dashboard', Home], ['/people', 'People', Users], ['/people/new', 'New Connection', UserPlus], ['/import', 'Bulk Import', Upload], ['/prepare', 'Prepare Me', Sparkles], ['/cards', 'Cards', Mail], ['/events', 'Events', CalendarDays], ['/settings', 'Settings', Settings]]

export default function Layout({ session }) {
  const navigate = useNavigate()
  const name = session?.user?.user_metadata?.full_name || session?.user?.email || 'PFN User'
  const signOut = async () => { await supabase.auth.signOut(); navigate('/login') }

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">PF</div><div><strong>People First Network</strong><small>Relationship assistant</small></div></div>
      <nav>{links.map(([to,label,Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon size={18}/>{label}</NavLink>)}</nav>
      <div className="sidebar-footer">
        <button className="link-button" onClick={signOut}><LogOut size={16}/>Sign out</button>
        <small>{name}<br/>People First, Plants Always.</small>
      </div>
    </aside>
    <main className="main"><Outlet/></main>
    <nav className="mobile-nav">{links.slice(0,5).map(([to,label,Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon size={19}/><span>{label === 'New Connection' ? 'Add' : label === 'Bulk Import' ? 'Import' : label}</span></NavLink>)}</nav>
  </div>
}
