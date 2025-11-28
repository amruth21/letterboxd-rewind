'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface YearSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export default function YearSelector({ value, onChange, disabled }: YearSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Generate years from 2000 to current year + 1
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1999 }, (_, i) => currentYear - i)
  const allYears = ['ALL', ...years.map(String)]

  // Filter years based on search term
  const filteredYears = allYears.filter((year) =>
    year.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue)
    setIsOpen(false)
    setSearchTerm('')
    inputRef.current?.blur()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchTerm(newValue)
    onChange(newValue)
    setIsOpen(true)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setSearchTerm(value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filteredYears.length > 0) {
      handleSelect(filteredYears[0])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleInputKeyDown}
        placeholder="2025 or ALL"
        disabled={disabled}
        className="w-full px-4 py-3 border-2 border-letterboxd-dark-lighter rounded-lg focus:border-letterboxd-orange focus:outline-none transition-colors bg-letterboxd-dark text-white placeholder-letterboxd-gray disabled:bg-letterboxd-dark-lighter cursor-pointer"
      />
      
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-letterboxd-dark-light border border-letterboxd-dark-lighter rounded-lg shadow-xl max-h-60 overflow-y-auto"
          >
            {filteredYears.length > 0 ? (
              filteredYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => handleSelect(year)}
                  className={`w-full text-left px-4 py-3 hover:bg-letterboxd-dark-lighter transition-colors ${
                    value === year
                      ? 'bg-letterboxd-dark-lighter text-letterboxd-orange font-semibold'
                      : 'text-white'
                  } ${
                    year === 'ALL' ? 'border-b border-letterboxd-dark-lighter' : ''
                  }`}
                >
                  {year === 'ALL' ? (
                    <span className="flex items-center gap-2">
                      <span className="font-bold">ALL</span>
                      <span className="text-xs text-letterboxd-gray-lighter">(All years)</span>
                    </span>
                  ) : (
                    year
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-letterboxd-gray-lighter text-center">
                No years found
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

