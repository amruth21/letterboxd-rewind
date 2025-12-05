'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

interface FilmScrollbarProps {
  scrollProgress: number
  scrollContainerRef: React.RefObject<HTMLDivElement>
  isVisible: boolean
}

export default function FilmScrollbar({ scrollProgress, scrollContainerRef, isVisible }: FilmScrollbarProps) {
  const [isDragging, setIsDragging] = useState(false)
  const scrollbarRef = useRef<HTMLDivElement>(null)
  const [scrollbarWidth, setScrollbarWidth] = useState(0)
  const dragStartX = useRef(0)
  const dragStartScroll = useRef(0)

  useEffect(() => {
    const updateWidth = () => {
      if (scrollbarRef.current) {
        setScrollbarWidth(scrollbarRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollbarRef.current || !scrollContainerRef.current) return
    e.preventDefault()
    
    const container = scrollContainerRef.current
    const scrollbar = scrollbarRef.current
    const rect = scrollbar.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const maxScroll = container.scrollWidth - container.clientWidth
    const currentWidth = scrollbar.offsetWidth
    
    // Check if clicking on thumb or track
    const thumbWidth = Math.max(60, currentWidth * 0.15)
    const thumbLeft = (currentWidth - thumbWidth) * scrollProgress
    
    if (clickX >= thumbLeft && clickX <= thumbLeft + thumbWidth) {
      // Clicked on thumb - start dragging
      dragStartX.current = e.clientX
      dragStartScroll.current = container.scrollLeft
      setIsDragging(true)
    } else {
      // Clicked on track - jump to position
      const targetProgress = Math.max(0, Math.min(1, clickX / currentWidth))
      container.scrollTo({
        left: targetProgress * maxScroll,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !scrollbarRef.current || !scrollContainerRef.current) return
      
      const container = scrollContainerRef.current
      const scrollbar = scrollbarRef.current
      const maxScroll = container.scrollWidth - container.clientWidth
      const currentWidth = scrollbar.offsetWidth
      
      // Calculate drag delta
      const deltaX = e.clientX - dragStartX.current
      const scrollRatio = maxScroll / (currentWidth - Math.max(60, currentWidth * 0.15))
      const newScrollLeft = dragStartScroll.current + (deltaX * scrollRatio)
      
      container.scrollLeft = Math.max(0, Math.min(maxScroll, newScrollLeft))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, scrollContainerRef])

  if (!isVisible) return null

  const thumbWidth = Math.max(60, scrollbarWidth * 0.15) // Minimum 60px, or 15% of scrollbar
  const thumbLeft = (scrollbarWidth - thumbWidth) * scrollProgress

  return (
    <motion.div
      ref={scrollbarRef}
      className="film-scrollbar"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Scrollbar Track */}
      <div 
        className="scrollbar-track"
        onMouseDown={handleMouseDown}
      >
        {/* Progress fill that matches the progress bar */}
        <div 
          className="scrollbar-progress-fill"
          style={{
            width: `${scrollProgress * 100}%`,
          }}
        />
        
        {/* Scrollbar Thumb */}
        <motion.div
          className="scrollbar-thumb"
          style={{
            width: `${thumbWidth}px`,
            left: `${thumbLeft}px`,
          }}
          animate={{
            scale: isDragging ? 1.05 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onMouseDown={(e) => {
            e.stopPropagation()
            if (!scrollbarRef.current || !scrollContainerRef.current) return
            const container = scrollContainerRef.current
            dragStartX.current = e.clientX
            dragStartScroll.current = container.scrollLeft
            setIsDragging(true)
          }}
        />
      </div>
    </motion.div>
  )
}

