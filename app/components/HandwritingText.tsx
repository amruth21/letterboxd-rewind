'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

interface HandwritingTextProps {
  duration?: number
  delay?: number
}

export default function HandwritingText({
  duration = 3,
  delay = 0.5,
}: HandwritingTextProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  // Use a large dasharray value that covers the entire text stroke
  const strokeLength = 1500

  return (
    <div ref={ref} className="flex justify-center items-center w-full">
      <svg
        viewBox="0 0 700 250"
        className="w-full max-w-3xl h-auto"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="handwritingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fe8000" />
            <stop offset="50%" stopColor="#0ae053" />
            <stop offset="100%" stopColor="#41bcf4" />
          </linearGradient>
        </defs>
        
        {/* Stroke animation text */}
        <motion.text
          x="350"
          y="140"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="none"
          stroke="url(#handwritingGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            fontFamily: "'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive",
            fontSize: '160px',
            fontWeight: 400,
          }}
          initial={{ 
            strokeDasharray: strokeLength,
            strokeDashoffset: strokeLength,
          }}
          animate={isInView ? { 
            strokeDashoffset: 0,
          } : {
            strokeDashoffset: strokeLength,
          }}
          transition={{ 
            duration: duration,
            ease: "easeInOut",
            delay: delay,
          }}
        >
          The End
        </motion.text>

        {/* Fill text that fades in after stroke animation */}
        <motion.text
          x="350"
          y="140"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="url(#handwritingGradient)"
          style={{
            fontFamily: "'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive",
            fontSize: '160px',
            fontWeight: 400,
          }}
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8, delay: delay + duration }}
        >
          The End
        </motion.text>
      </svg>
    </div>
  )
}
