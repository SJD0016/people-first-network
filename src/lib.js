import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anon ? createClient(url, anon) : null
export const configured = Boolean(supabase)
export const aiEndpoint = import.meta.env.VITE_AI_ENDPOINT || ''

export const formatDate = (value) => {
  if (!value) return 'Not set'
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const cardDraft = (name, notes) => {
  const first = name?.split(' ')[0] || name || 'Friend'
  const detail = notes?.split(/[.!?]/)[0]?.trim()

  return `${first},

It was a pleasure connecting with you. ${
    detail
      ? `I especially appreciated our conversation about ${detail
          .charAt(0)
          .toLowerCase()}${detail.slice(1)}.`
      : 'I appreciated the chance to learn more about you and your work.'
  }

Thank you for taking the time to share your perspective. I am glad we connected and look forward to staying in touch.

— Sam`
}

export const addDays = (dateString, days) => {
  const d = new Date(`${dateString}T12:00:00`)
  d.setDate(d.getDate() + Number(days))
  return d.toISOString().slice(0, 10)
}

export async function callAI(action, payload = {}) {
  if (!aiEndpoint) {
    throw new Error('AI endpoint is not configured.')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  if (supabase) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  }

  const response = await fetch(aiEndpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  })

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(result.error || 'AI request failed.')
  }

  return result
}

export const PFN_FIELDS = [
  { key: 'name', label: 'Full Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Job Title' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'event', label: 'Where We Met / Event' },
  { key: 'relationship_type', label: 'Relationship Type' },
  { key: 'notes', label: 'Notes' },
  { key: 'personal_details', label: 'Personal Details' },
  { key: 'interests', label: 'Professional Interests' },
  { key: 'ways_to_help', label: 'How I Could Help' },
  { key: 'priority', label: 'Follow-Up Priority' },
  { key: 'follow_up_date', label: 'Next Follow-Up Date' },
  { key: 'tags', label: 'Tags' },
]

const HEADER_ALIASES = {
  name: ['full name', 'name', 'contact name', 'person', 'full_name'],
  first_name: ['first name', 'firstname', 'given name', 'first_name'],
  last_name: ['last name', 'lastname', 'surname', 'family name', 'last_name'],
  company: ['company', 'organization', 'organisation', 'business', 'employer'],
  title: ['title', 'job title', 'position', 'role', 'job_title'],
  email: ['email', 'email address', 'e-mail', 'primary email'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'telephone'],
  linkedin_url: [
    'linkedin',
    'linkedin url',
    'linkedin profile',
    'linkedin profile url',
  ],
  event: [
    'event',
    'where did we meet',
    'where / how did we meet?',
    'how we met',
    'source',
  ],
  relationship_type: [
    'relationship type',
    'relationship',
    'contact type',
  ],
  notes: [
    'notes',
    'additional notes',
    'what did we discuss?',
    'discussion',
    'comments',
  ],
  personal_details: [
    'personal details',
    'personal details they shared',
    'remember',
    'personal',
  ],
  interests: [
    'professional interests',
    'professional interests / projects',
    'interests',
    'projects',
  ],
  ways_to_help: [
    'how could i help them?',
    'ways to help',
    'how i can help',
    'help',
  ],
  priority: ['priority', 'follow-up priority', 'follow up priority'],
  follow_up_date: [
    'next follow-up date',
    'follow-up date',
    'follow up date',
    'next contact date',
  ],
  tags: ['tags', 'labels', 'categories'],
}

export function normalizeHeader(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

export function suggestMapping(headers) {
  const mapping = {}

  headers.forEach((header) => {
    const normalized = normalizeHeader(header)
    const match = Object.entries(HEADER_ALIASES).find(([, aliases]) =>
      aliases.some((alias) => normalizeHeader(alias) === normalized),
    )

    mapping[header] = match ? match[0] : ''
  })

  return mapping
}

export async function parseSpreadsheet(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (!['xlsx', 'xls', 'csv'].includes(extension)) {
    throw new Error('Upload an Excel (.xlsx/.xls) or CSV (.csv) file.')
  }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: false,
  })

  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error('The spreadsheet does not contain a worksheet.')
  }

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    raw: false,
    blankrows: false,
  })

  if (!rows.length) {
    throw new Error('No contact rows were found in the first worksheet.')
  }

  const headers = Object.keys(rows[0] || {})

  if (!headers.length) {
    throw new Error('PFN could not detect spreadsheet column headers.')
  }

  return { sheetName, rows, headers }
}

function cleanText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function titleCase(value) {
  const text = cleanText(value)

  if (!text) return ''

  if (text === text.toUpperCase() || text === text.toLowerCase()) {
    return text
      .toLowerCase()
      .replace(/\b([a-z])/g, (match) => match.toUpperCase())
      .replace(/\bMc([a-z])/g, (_, letter) => `Mc${letter.toUpperCase()}`)
  }

  return text
}

function normalizeEmail(value) {
  return cleanText(value).toLowerCase()
}

function normalizePhone(value) {
  const original = cleanText(value)
  const digits = original.replace(/\D/g, '')
  const usNumber =
    digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits

  if (usNumber.length === 10) {
    return `(${usNumber.slice(0, 3)}) ${usNumber.slice(3, 6)}-${usNumber.slice(
      6,
    )}`
  }

  return original
}

function normalizeDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

export function convertRows(sourceRows, mapping) {
  return sourceRows.map((source, index) => {
    const mapped = {}

    Object.entries(mapping).forEach(([header, field]) => {
      if (field) mapped[field] = source[header]
    })

    const firstName = titleCase(mapped.first_name)
    const lastName = titleCase(mapped.last_name)
    const combinedName = [firstName, lastName].filter(Boolean).join(' ')
    const fullName = titleCase(mapped.name || combinedName)

    return {
      _row: index + 2,
      _source: source,
      name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
      company: titleCase(mapped.company) || null,
      title: titleCase(mapped.title) || null,
      email: normalizeEmail(mapped.email) || null,
      phone: normalizePhone(mapped.phone) || null,
      linkedin_url: cleanText(mapped.linkedin_url) || null,
      event: cleanText(mapped.event) || null,
      relationship_type: cleanText(mapped.relationship_type) || null,
      notes: cleanText(mapped.notes) || null,
      personal_details: cleanText(mapped.personal_details) || null,
      interests: cleanText(mapped.interests) || null,
      ways_to_help: cleanText(mapped.ways_to_help) || null,
      priority: cleanText(mapped.priority) || null,
      follow_up_date: normalizeDate(mapped.follow_up_date),
      tags: cleanText(mapped.tags) || null,
    }
  })
}

export function validateContacts(contacts) {
  return contacts.map((contact) => {
    const errors = []

    if (!contact.name) errors.push('Missing name')

    if (
      contact.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)
    ) {
      errors.push('Invalid email')
    }

    return {
      ...contact,
      _errors: errors,
    }
  })
}

function normalizedName(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function findDuplicates(importedContacts, existingContacts) {
  const byEmail = new Map()
  const byPhone = new Map()
  const byNameCompany = new Map()

  existingContacts.forEach((contact) => {
    if (contact.email) {
      byEmail.set(normalizeEmail(contact.email), contact)
    }

    if (contact.phone) {
      byPhone.set(contact.phone.replace(/\D/g, ''), contact)
    }

    if (contact.name) {
      const key = `${normalizedName(contact.name)}|${normalizedName(
        contact.company,
      )}`
      byNameCompany.set(key, contact)
    }
  })

  return importedContacts.map((contact) => {
    let duplicate = null
    let reason = ''

    if (contact.email && byEmail.has(contact.email)) {
      duplicate = byEmail.get(contact.email)
      reason = 'Same email'
    } else if (
      contact.phone &&
      byPhone.has(contact.phone.replace(/\D/g, ''))
    ) {
      duplicate = byPhone.get(contact.phone.replace(/\D/g, ''))
      reason = 'Same phone'
    } else if (contact.name) {
      const key = `${normalizedName(contact.name)}|${normalizedName(
        contact.company,
      )}`

      if (byNameCompany.has(key)) {
        duplicate = byNameCompany.get(key)
        reason = contact.company ? 'Same name and company' : 'Same name'
      }
    }

    return {
      ...contact,
      _duplicate: duplicate,
      _duplicateReason: reason,
      _decision: duplicate ? 'skip' : 'create',
    }
  })
}

export function downloadCsvTemplate() {
  const headers = PFN_FIELDS.map((field) => field.label)
  const example = [
    'Neal Glatt',
    'Neal',
    'Glatt',
    'Neal Glatt Sales & Strategy',
    'Founder & CEO',
    'neal@example.com',
    '(555) 555-1212',
    'https://www.linkedin.com/in/example',
    'Cultivate 2026',
    'Potential Mentor',
    'Discussed leadership, relationships, and Giftology.',
    'Sent a handwritten card and book after the event.',
    'Leadership, culture, sales, and relationship building.',
    'Share practical green-industry examples and follow through.',
    'High',
    '2026-08-14',
    'cultivate 2026, mentor, leadership',
  ]

  const escape = (value) => `"${String(value).replaceAll('"', '""')}"`
  const csv = [headers, example]
    .map((row) => row.map(escape).join(','))
    .join('\n')

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8',
  })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = 'PFN_Contact_Import_Template.csv'
  anchor.click()

  URL.revokeObjectURL(objectUrl)
}

export async function insertContactsInBatches({
  contacts,
  userId,
  workspaceId,
  batchSize = 100,
  onProgress,
}) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const created = []
  const failures = []
  let completed = 0

  const rows = contacts.map(
    ({
      _row,
      _source,
      _errors,
      _duplicate,
      _duplicateReason,
      _decision,
      ...contact
    }) => ({
      ...contact,
      ...(userId ? { user_id: userId } : {}),
      ...(workspaceId ? { workspace_id: workspaceId } : {}),
    }),
  )

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize)
    const { data, error } = await supabase
      .from('contacts')
      .insert(batch)
      .select()

    if (error) {
      batch.forEach((row, offset) => {
        failures.push({
          row: contacts[index + offset]?._row,
          name: row.name,
          error: error.message,
        })
      })
    } else {
      created.push(...(data || []))
    }

    completed += batch.length
    onProgress?.(Math.round((completed / rows.length) * 100))
  }

  return { created, failures }
}

export async function mergeContact({ existing, incoming }) {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const patch = {}

  const supportedFields = [
    'name',
    'first_name',
    'last_name',
    'company',
    'title',
    'email',
    'phone',
    'linkedin_url',
    'event',
    'relationship_type',
    'notes',
    'personal_details',
    'interests',
    'ways_to_help',
    'priority',
    'follow_up_date',
    'tags',
  ]

  supportedFields.forEach((key) => {
    if (incoming[key] && !existing[key]) {
      patch[key] = incoming[key]
    }
  })

  if (!Object.keys(patch).length) {
    return {
      data: existing,
      skipped: true,
    }
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(patch)
    .eq('id', existing.id)
    .select()
    .single()

  if (error) throw error

  return {
    data,
    skipped: false,
  }
}
