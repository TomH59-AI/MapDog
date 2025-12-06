import React from 'react'

type StateFilter = 'NC' | 'GA' | 'ALL'

interface StateToggleProps {
  value: StateFilter
  onChange: (value: StateFilter) => void
}

export default function StateToggle({ value, onChange }: StateToggleProps) {
  const options: { id: StateFilter; label: string; color: string }[] = [
    { id: 'ALL', label: 'All States', color: 'gray' },
    { id: 'NC', label: 'North Carolina', color: 'blue' },
    { id: 'GA', label: 'Georgia', color: 'red' }
  ]

  return (
    <div className="flex items-center gap-2 bg-black bg-opacity-20 rounded-lg p-1">
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`px-4 py-2 rounded-md font-medium transition-all text-sm ${
            value === option.id
              ? option.id === 'NC'
                ? 'bg-blue-600 text-white'
                : option.id === 'GA'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-800'
              : 'text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          {option.id !== 'ALL' && (
            <span className="mr-2">
              {option.id === 'NC' ? '🔵' : '🔴'}
            </span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  )
}
