'use client'

import { useMemo, useRef } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { motion, useInView } from 'framer-motion'

interface LanguageItem {
  name: string
  count: number
  avg_rating: number | null
}

interface LanguagePieChartProps {
  items: LanguageItem[]
  maxItems?: number
}

// Letterboxd-inspired color palette
const COLORS = [
  '#fe8000', // orange
  '#0ae053', // green
  '#41bcf4', // blue
  '#ff6b6b', // coral
  '#9b59b6', // purple
  '#f1c40f', // yellow
  '#1abc9c', // teal
  '#e74c3c', // red
  '#3498db', // light blue
  '#2ecc71', // emerald
  '#95a5a6', // gray (for "Other")
]

export default function LanguagePieChart({ items, maxItems = 8 }: LanguagePieChartProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  const chartData = useMemo(() => {
    if (!items || items.length === 0) return []
    
    // Sort by count and take top items
    const sorted = [...items].sort((a, b) => b.count - a.count)
    const top = sorted.slice(0, maxItems)
    
    // Group remaining into "Other" if there are more
    if (sorted.length > maxItems) {
      const otherCount = sorted.slice(maxItems).reduce((sum, item) => sum + item.count, 0)
      if (otherCount > 0) {
        top.push({ name: 'Other', count: otherCount, avg_rating: null })
      }
    }
    
    const total = top.reduce((sum, item) => sum + item.count, 0)
    
    return top.map((item, index) => ({
      name: item.name,
      value: item.count,
      percentage: ((item.count / total) * 100).toFixed(1),
      color: COLORS[index % COLORS.length],
      avg_rating: item.avg_rating,
    }))
  }, [items, maxItems])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-letterboxd-dark-lighter p-3 rounded-lg shadow-lg border border-letterboxd-dark-lighter"
        >
          <p className="font-semibold text-white">{data.name}</p>
          <p className="text-sm text-letterboxd-gray-lighter mt-1">
            <span className="font-medium" style={{ color: data.color }}>{data.value}</span> films ({data.percentage}%)
          </p>
          {data.avg_rating !== null && (
            <p className="text-sm text-letterboxd-gray-lighter">
              Avg rating: <span className="text-yellow-500">★</span> {data.avg_rating.toFixed(2)}
            </p>
          )}
        </motion.div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-letterboxd-gray-light">
        No language data available
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
      animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.8, rotate: -10 }}
      transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
      className="w-full h-full flex flex-col"
    >
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius="35%"
              outerRadius="70%"
              paddingAngle={2}
              dataKey="value"
              animationBegin={isInView ? 0 : undefined}
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend rendered outside Recharts to prevent re-render issues */}
      <motion.div 
        className="flex flex-wrap justify-center gap-4 mt-3 flex-shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        {chartData.map((entry, index) => (
          <motion.div 
            key={`legend-${index}`} 
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 + index * 0.05 }}
            whileHover={{ scale: 1.1 }}
          >
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-letterboxd-gray-lighter font-medium">
              {entry.name}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
