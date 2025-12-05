'use client'

import { motion, useMotionValue } from 'framer-motion'
import { useRef, useState } from 'react'

interface FilmReelWheelProps {
  scrollProgress: number
  scrollContainerRef: React.RefObject<HTMLDivElement>
  isVisible: boolean
}

export default function FilmReelWheel({ scrollProgress, scrollContainerRef, isVisible }: FilmReelWheelProps) {
  const [isDragging, setIsDragging] = useState(false)
  const reelRef = useRef<HTMLDivElement>(null)
  const lastDragX = useRef(0)
  
  // Motion value for drag position
  const dragX = useMotionValue(0)
  
  // Calculate rotation based on scroll progress (0 to 360 degrees)
  const rotation = scrollProgress * 360
  
  // Calculate film strip unwinding length
  const stripLength = scrollProgress * 40 // Max 40px unwound

  const handleDrag = (event: MouseEvent | TouchEvent, info: { delta: { x: number }, offset: { x: number } }) => {
    const container = scrollContainerRef.current
    if (!container) return

    const maxScroll = container.scrollWidth - container.clientWidth
    // Use delta for smooth scrolling
    const scrollDelta = info.delta.x * 3 // Sensitivity multiplier
    const newScrollLeft = Math.max(0, Math.min(maxScroll, container.scrollLeft - scrollDelta))
    container.scrollLeft = newScrollLeft
    
    lastDragX.current = info.offset.x
  }

  const handleDragStart = () => {
    setIsDragging(true)
    lastDragX.current = 0
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    dragX.set(0) // Reset drag position
  }

  if (!isVisible) return null

  return (
    <motion.div
      ref={reelRef}
      className="film-reel-wheel"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
      dragElastic={0.2}
      onDrag={handleDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ x: dragX }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Film Reel Spool */}
      <div className="reel-spool">
        {/* Outer Rim */}
        <div className="reel-rim" />
        
        {/* Center Hub */}
        <div className="reel-hub">
          <div className="hub-center" />
        </div>
        
        {/* Spokes */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="reel-spoke"
            style={{
              transform: `rotate(${i * 45}deg)`,
            }}
          />
        ))}
        
        {/* Rotating Reel (based on scroll progress) */}
        <motion.div
          className="reel-rotating"
          animate={{
            rotate: rotation,
          }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {/* Inner decorative circles */}
          <div className="reel-inner-ring" />
          <div className="reel-inner-ring-2" />
        </motion.div>
      </div>
      
      {/* Unwinding Film Strip */}
      <motion.div
        className="film-strip-unwinding"
        animate={{
          width: stripLength,
        }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <div className="film-strip-perforations">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="strip-perf" />
          ))}
        </div>
      </motion.div>
      
      {/* Drag hint indicator */}
      {!isDragging && (
        <motion.div
          className="reel-drag-hint"
          animate={{
            x: [-3, 3, -3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ↔
        </motion.div>
      )}
    </motion.div>
  )
}

