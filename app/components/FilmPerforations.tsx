'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface FilmPerforationsProps {
  position: 'top' | 'bottom'
  scrollProgress: number
}

export default function FilmPerforations({ position, scrollProgress }: FilmPerforationsProps) {
  const [perforationCount, setPerforationCount] = useState(30)

  useEffect(() => {
    // Calculate number of perforations based on screen width
    const updateCount = () => {
      const screenWidth = window.innerWidth
      const perfsNeeded = Math.ceil(screenWidth / 60) + 10 // 60px gap + buffer
      setPerforationCount(perfsNeeded)
    }
    
    updateCount()
    window.addEventListener('resize', updateCount)
    return () => window.removeEventListener('resize', updateCount)
  }, [])

  // Offset based on scroll for parallax effect
  const offset = scrollProgress * 30

  return (
    <div
      className={`film-perforations ${position === 'top' ? 'film-perforations-top' : 'film-perforations-bottom'}`}
      style={{
        transform: `translateX(${-offset}px)`,
      }}
    >
      {Array.from({ length: perforationCount }).map((_, i) => (
        <motion.div
          key={i}
          className="perforation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.01, duration: 0.2 }}
        />
      ))}
    </div>
  )
}

