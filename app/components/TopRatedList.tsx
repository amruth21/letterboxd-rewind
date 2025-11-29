'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

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
  maxItems?: number
  color: string
  icon?: string
}

export default function TopRatedList({ title, items, itemsWithImages, maxItems = 5, color, icon = '🎬' }: TopRatedListProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })
  
  // Merge image data with items
  const displayItems = items.slice(0, maxItems).map((item, idx) => {
    const imageData = itemsWithImages?.find(img => img.name === item.name)
    const merged = {
      ...item,
      image_url: imageData?.image_url || null
    }
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      if (imageData) {
        console.log(`[TopRatedList] Found image for ${item.name}:`, imageData.image_url)
      } else {
        console.log(`[TopRatedList] No image data found for ${item.name}`, { itemsWithImages: itemsWithImages?.map(i => i.name) })
      }
    }
    return merged
  })

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
    <motion.div 
      ref={ref}
      className="space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {displayItems.map((item, index) => (
        <motion.div
          key={item.name}
          variants={itemVariants}
          whileHover={{ 
            scale: 1.02, 
            x: 5,
            transition: { type: 'spring', stiffness: 300 }
          }}
          className="group relative"
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
            
            {/* Profile Image */}
            {item.image_url ? (
              <motion.div
                className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2"
                style={{ borderColor: `${color}50` }}
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{ delay: 0.25 + index * 0.1, type: 'spring', bounce: 0.4 }}
              >
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            ) : (
              <div 
                className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                {icon}
              </div>
            )}
            
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
          
          {/* Hover Tooltip */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="bg-letterboxd-dark-lighter px-3 py-2 rounded-lg shadow-lg border border-letterboxd-dark-lighter whitespace-nowrap"
            >
              <p className="text-white font-medium text-sm">{item.name}</p>
              <p className="text-letterboxd-gray-lighter text-xs mt-1">
                <span className="text-yellow-500">{ratingToStars(item.avg_rating)}</span> ({item.avg_rating.toFixed(2)})
              </p>
              <p className="text-letterboxd-gray-lighter text-xs">
                {item.count} film{item.count !== 1 ? 's' : ''} watched
              </p>
            </motion.div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
