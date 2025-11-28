'use client'

import { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion, useInView } from 'framer-motion'

interface DecadeData {
  decade: string
  decade_start: number
  count: number
  avg_rating: number | null
}

interface FavoriteDecade {
  decade: string
  count: number
  avg_rating: number
}

interface DecadeChartProps {
  decades: DecadeData[]
  favoriteDecade: FavoriteDecade | null
}

// Letterboxd gradient colors
const COLORS = [
  '#fe8000', // orange
  '#0ae053', // green
  '#41bcf4', // blue
]

export default function DecadeChart({ decades, favoriteDecade }: DecadeChartProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  const chartData = useMemo(() => {
    return decades.map((d, index) => ({
      ...d,
      color: COLORS[index % COLORS.length],
    }))
  }, [decades])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-letterboxd-dark-light p-2 border border-letterboxd-dark-lighter rounded-lg shadow-lg"
        >
          <p className="font-semibold text-white text-sm">{data.decade}</p>
          <p className="text-xs text-letterboxd-gray-lighter">
            <span className="font-medium">{data.count}</span> films watched
          </p>
          {data.avg_rating !== null && (
            <p className="text-xs text-letterboxd-gray-lighter">
              Avg rating: <span className="font-medium text-yellow-500">★ {data.avg_rating.toFixed(2)}</span>
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
        No decade data available
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5 }}
      className="w-full h-full flex flex-col"
    >
      {/* Chart area */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
            <XAxis
              dataKey="decade"
              tick={{ fill: '#99aabb', fontSize: 11 }}
              axisLine={{ stroke: '#2c3440' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fill: '#99aabb', fontSize: 10 }}
              axisLine={{ stroke: '#2c3440' }}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar 
              dataKey="count" 
              radius={[4, 4, 0, 0]}
              animationBegin={300}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Favorite Decade display */}
      {favoriteDecade && (
        <motion.div 
          className="mt-4 text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-letterboxd-orange/30"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          <div className="text-xs text-letterboxd-gray-light uppercase tracking-wide mb-1">
            Your Favorite Decade
          </div>
          <div className="text-3xl font-bold text-letterboxd-orange mb-1">
            {favoriteDecade.decade}
          </div>
          <div className="text-sm text-letterboxd-gray-lighter">
            <span className="text-yellow-500">★ {favoriteDecade.avg_rating.toFixed(2)}</span>
            {' · '}
            {favoriteDecade.count} films
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

