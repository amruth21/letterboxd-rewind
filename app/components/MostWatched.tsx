'use client'

import { motion } from 'framer-motion'

interface MostWatchedItem {
  name: string
  count: number
  avg_rating: number | null
}

interface MostWatchedProps {
  title: string
  items: MostWatchedItem[]
  icon?: string
  color: string
}

export default function MostWatched({ title, items, icon = '🎬', color }: MostWatchedProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-letterboxd-gray-light">
        No data available for {title}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
          whileHover={{ scale: 1.02, y: -4 }}
          className="bg-letterboxd-dark-lighter p-5 rounded-lg border border-letterboxd-dark-lighter shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <h3 className="font-semibold text-white text-lg break-words">{item.name}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold" style={{ color }}>
                {item.count}
              </span>
              <span className="text-sm text-letterboxd-gray-lighter">films</span>
            </div>
            {item.avg_rating !== null && item.avg_rating > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm font-medium text-letterboxd-gray-lighter">
                  {item.avg_rating.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

