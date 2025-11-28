'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface StatSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export default function StatSection({ title, description, children, className = '' }: StatSectionProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`mb-16 ${className}`}
    >
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
        {description && <p className="text-letterboxd-gray-lighter">{description}</p>}
      </div>
      <div className="bg-letterboxd-dark-light rounded-xl shadow-lg p-6 md:p-8 border border-letterboxd-dark-lighter">
        {children}
      </div>
    </motion.section>
  )
}

