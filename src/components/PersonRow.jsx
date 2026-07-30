import { Link } from 'react-router-dom'
import { initials } from '../lib'

export default function PersonRow({ person }) {
  return <Link className="person-row" to={`/people/${person.id}`}>
    <div className="avatar">{initials(person.name)}</div>
    <div className="grow"><strong>{person.name}</strong><span>{[person.title, person.company].filter(Boolean).join(' · ')}</span></div>
    <span className="open-label">Open</span>
  </Link>
}
