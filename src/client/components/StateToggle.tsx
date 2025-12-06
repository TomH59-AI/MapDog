import React from 'react'

type StateFilter = 'NC' | 'GA' | 'FL' | 'ALL'

interface StateToggleProps {
  value: StateFilter
  onChange: (value: StateFilter) => void
}

export default function StateToggle({ value, onChange }: StateToggleProps) {
  const options: { id: StateFilter; label: string; bgColor: string; emoji: string }[] = [
    { id: 'ALL', label: 'All', bgColor: 'bg-white text-gray-800', emoji: '' },
    { id: 'NC', label: 'NC', bgColor: 'bg-blue-600 text-white', emoji: '🔵' },
    { id: 'GA', label: 'GA', bgColor: 'bg-red-600 text-white', emoji: '🔴' },
    { id: 'FL', label: 'FL', bgColor: 'bg-orange-500 text-white', emoji: '🟠' }
  ]

  return (
    <div className="flex items-center gap-1 bg-black bg-opacity-20 rounded-lg p-1">
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`px-3 py-2 rounded-md font-medium transition-all text-sm ${
            value === option.id
              ? option.bgColor
              : 'text-white hover:bg-white hover:bg-opacity-10'
          }`}
        >
          {option.emoji && <span className="mr-1">{option.emoji}</span>}
          {option.label}
        </button>
      ))}
    </div>
  )
}

export type { StateFilter }
