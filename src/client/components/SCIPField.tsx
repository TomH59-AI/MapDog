import React, { useState, useEffect } from 'react'
import scipData, { getField, setField } from '../scipSchema'

interface FieldProps {
  label: string
  path: string
  type?: 'text' | 'date' | 'number' | 'email' | 'tel' | 'textarea' | 'select'
  options?: string[]
  placeholder?: string
  className?: string
  rows?: number
}

/**
 * SCIP Field - Binds directly to scipData schema
 *
 * Usage:
 *   <Field label="Site Name" path="search_ring.site_name" />
 *   <Field label="Tower Type" path="project_info.tower_type" type="select" options={TOWER_TYPES} />
 */
export function Field({
  label,
  path,
  type = 'text',
  options = [],
  placeholder = '',
  className = '',
  rows = 3
}: FieldProps) {
  // Local state synced with scipData
  const [value, setValue] = useState(() => getField(path))

  // Update local state when scipData changes externally
  useEffect(() => {
    const interval = setInterval(() => {
      const current = getField(path)
      if (current !== value) {
        setValue(current)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [path, value])

  const handleChange = (newValue: string) => {
    setValue(newValue)
    setField(path, newValue)
  }

  const baseClass = "w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"

  if (type === 'textarea') {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={baseClass}
        />
      </div>
    )
  }

  if (type === 'select') {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={baseClass}
        >
          <option value="">Select...</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={baseClass}
      />
    </div>
  )
}

/**
 * Section header for SCIP form
 */
export function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
        {icon && <i className={`fas ${icon} text-blue-600`}></i>}
        {title}
      </h3>
      {children}
    </div>
  )
}

/**
 * Grid layout for form fields
 */
export function Grid({ cols = 2, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-4`}>
      {children}
    </div>
  )
}

export default Field
