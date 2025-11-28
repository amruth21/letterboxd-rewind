'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface LoadingAnimationProps {
  onComplete?: () => void
  isComplete?: boolean
}

export default function LoadingAnimation({ onComplete, isComplete = false }: LoadingAnimationProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isComplete) {
      setProgress(100)
      return
    }
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 60) {
          return prev + Math.random() * 1.2
        } else if (prev < 85) {
          return prev + Math.random() * 0.8
        } else if (prev < 92) {
          return prev + Math.random() * 0.4
        } else {
          return Math.min(prev + Math.random() * 0.2, 95)
        }
      })
    }, 300)

    return () => clearInterval(interval)
  }, [isComplete])

  const dots = [
    { color: '#fe8000', delay: 0 },
    { color: '#0ae053', delay: 0.15 },
    { color: '#41bcf4', delay: 0.3 },
  ]

  return (
    <motion.div 
      className="flex flex-col items-center justify-center py-8"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, x: 200, transition: { duration: 0.5 } }}
    >
      {/* Bouncing Letterboxd Dots */}
      <div className="flex items-end gap-3 mb-8">
        {dots.map((dot, index) => (
          <motion.div
            key={index}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: dot.color,
              boxShadow: `0 0 15px ${dot.color}50`,
            }}
            animate={{
              y: [-3, -25, -3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.2,
              delay: dot.delay,
              repeat: Infinity,
              repeatType: 'loop',
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Progress Bar - Wider and taller */}
      <div className="w-full max-w-2xl mb-4 px-4">
        <div className="h-3 bg-letterboxd-dark-lighter rounded-full overflow-hidden border border-letterboxd-dark-lighter">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, #fe8000 0%, #0ae053 50%, #41bcf4 100%)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 0.3,
              ease: 'easeOut',
            }}
          />
        </div>
      </div>

      {/* Status Text with Film Theme */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-letterboxd-gray-lighter text-base font-medium mb-1">
          {progress < 30 ? 'Rolling film...' : 
           progress < 60 ? 'Scanning frames...' :
           progress < 85 ? 'Processing credits...' :
           'Almost ready for premiere...'}
        </p>
        <p className="text-letterboxd-gray text-xs">
          {Math.round(progress)}% complete
        </p>
      </motion.div>
    </motion.div>
  )
}
