'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface TopRatedItem {
  name: string
  score: number
  count: number
  avg_rating: number
  image_url?: string | null
}

interface TopRatedListProps {
  title: string
  items: TopRatedItem[]
  itemsWithImages?: TopRatedItem[]
  topImageUrl?: string | null
  maxItems?: number
  color: string
  icon?: string
  moviesMap?: Record<string, string[]> // Map of person name to list of movie titles
}

export default function TopRatedList({ title, items, itemsWithImages, topImageUrl, maxItems = 5, color, icon = '🎬', moviesMap }: TopRatedListProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[TopRatedList] ${title} - topImageUrl:`, topImageUrl)
    console.log(`[TopRatedList] ${title} - items:`, items.slice(0, 3))
    console.log(`[TopRatedList] ${title} - moviesMap:`, moviesMap)
    if (moviesMap && items.length > 0) {
      console.log(`[TopRatedList] ${title} - First item name:`, items[0].name)
      console.log(`[TopRatedList] ${title} - Has movies for first item:`, moviesMap[items[0].name])
    }
  }
  
  const displayItems = items.slice(0, maxItems)

  if (displayItems.length === 0) {
    return (
      <div className="text-center py-4 text-letterboxd-gray-light">
        No data available
      </div>
    )
  }

  // Convert rating to stars display
  const ratingToStars = (rating: number): string => {
    const fullStars = Math.floor(rating)
    const hasHalf = rating % 1 >= 0.5
    return '★'.repeat(fullStars) + (hasHalf ? '½' : '')
  }

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      }
    }
  }

  // Item animation with spring physics
  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -30,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 200,
      }
    }
  }

  return (
    <div className="flex gap-8 items-center">
      {/* Large image for #1 - positioned to the left and centered */}
      {topImageUrl && displayItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, x: -30 }}
          animate={isInView ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: -30 }}
          transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
          className="shrink-0 self-center"
        >
          <img
            src={topImageUrl}
            alt={displayItems[0].name}
            className="w-48 h-48 rounded-full object-cover border-4 shadow-2xl"
            style={{ borderColor: `${color}60` }}
          />
        </motion.div>
      )}
      
      {/* Rankings list */}
      <motion.div 
        ref={ref}
        className="flex-1 space-y-3"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
      >
        {displayItems.map((item, index) => {
          const hasMovies = moviesMap && moviesMap[item.name] && moviesMap[item.name].length > 0
          const isHovered = hoveredItem === item.name
          
          const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
            setHoveredItem(item.name)
            const rect = e.currentTarget.getBoundingClientRect()
            const tooltipWidth = 320 // max-w-xs is ~320px
            const spaceOnRight = window.innerWidth - rect.right
            const spaceOnLeft = rect.left
            
            // Position to the right if there's space, otherwise to the left
            let x = rect.right + 8
            if (spaceOnRight < tooltipWidth && spaceOnLeft > tooltipWidth) {
              x = rect.left - tooltipWidth - 8
            }
            
            setTooltipPosition({
              x,
              y: rect.top + rect.height / 2
            })
          }
          
          const handleMouseLeave = () => {
            setHoveredItem(null)
            setTooltipPosition(null)
          }
          
          return (
          <motion.div
            key={item.name}
            ref={(el) => { itemRefs.current[item.name] = el }}
            variants={itemVariants}
            whileHover={{ 
              scale: 1.02, 
              x: 5,
              transition: { type: 'spring', stiffness: 300 }
            }}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div 
              className="flex items-center gap-3 p-3 rounded-lg bg-letterboxd-dark/40 border border-transparent hover:border-letterboxd-dark-lighter transition-all cursor-default"
            >
            {/* Rank with animation */}
            <motion.div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ backgroundColor: `${color}20`, color: color }}
              initial={{ scale: 0, rotate: -180 }}
              animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
              transition={{ delay: 0.2 + index * 0.1, type: 'spring', bounce: 0.5 }}
            >
              {index + 1}
            </motion.div>
            
            {/* Name */}
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium truncate">{item.name}</div>
              <div className="text-letterboxd-gray-light text-xs">
                {item.count} film{item.count !== 1 ? 's' : ''}
              </div>
            </div>
            
            {/* Rating with star animation */}
            <div className="text-right">
              <motion.div 
                className="text-yellow-500 text-sm"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                {ratingToStars(item.avg_rating)}
              </motion.div>
              <div className="text-letterboxd-gray-lighter text-xs">
                {item.avg_rating.toFixed(1)}
              </div>
            </div>
          </div>
          
        </motion.div>
        )
        })}
      </motion.div>
      
      {/* Tooltip Portal - rendered outside overflow container */}
      {hoveredItem && tooltipPosition && moviesMap && moviesMap[hoveredItem] && moviesMap[hoveredItem].length > 0 && typeof window !== 'undefined' && createPortal(
        <motion.div 
          initial={{ opacity: 0, x: -10, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed pointer-events-none z-50"
          style={{ 
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
          <div className="bg-letterboxd-dark-lighter px-4 py-3 rounded-lg shadow-xl border border-letterboxd-dark-lighter max-w-xs">
            <p className="text-white font-medium text-sm mb-2">{hoveredItem}</p>
            {displayItems.find(i => i.name === hoveredItem) && (
              <>
                <p className="text-letterboxd-gray-lighter text-xs mb-2">
                  <span className="text-yellow-500">{ratingToStars(displayItems.find(i => i.name === hoveredItem)!.avg_rating)}</span> ({displayItems.find(i => i.name === hoveredItem)!.avg_rating.toFixed(2)}) · {displayItems.find(i => i.name === hoveredItem)!.count} film{displayItems.find(i => i.name === hoveredItem)!.count !== 1 ? 's' : ''}
                </p>
                <div className="border-t border-letterboxd-dark pt-2 mt-2">
                  <p className="text-letterboxd-gray-light text-xs font-semibold mb-1.5 uppercase tracking-wide">
                    {title === 'Actors' ? 'Appeared in:' : 'Directed:'}
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {moviesMap[hoveredItem].slice(0, 10).map((movie, idx) => (
                      <p key={idx} className="text-white text-xs truncate">
                        • {movie}
                      </p>
                    ))}
                    {moviesMap[hoveredItem].length > 10 && (
                      <p className="text-letterboxd-gray-lighter text-xs italic">
                        +{moviesMap[hoveredItem].length - 10} more
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>,
        document.body
      )}
    </div>
  )
}
