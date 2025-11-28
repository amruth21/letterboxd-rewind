'use client'

import { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion, useInView } from 'framer-motion'

interface TopItem {
  name: string
  count: number
  avg_rating: number | null
}

interface TopItemsChartProps {
  title: string
  items: TopItem[]
  maxItems?: number
  color: string
}

export default function TopItemsChart({ title, items, maxItems = 8, color }: TopItemsChartProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  const chartData = useMemo(() => {
    return items.slice(0, maxItems).map((item) => ({
      name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
      fullName: item.name,
      count: item.count,
      avg_rating: item.avg_rating || 0,
      color: color,
    }))
  }, [items, maxItems, color])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-letterboxd-dark-light p-2 border border-letterboxd-dark-lighter rounded-lg shadow-lg"
        >
          <p className="font-semibold text-white text-sm">{data.fullName}</p>
          <p className="text-xs text-letterboxd-gray-lighter">
            <span className="font-medium">{data.count}</span> films
          </p>
          {data.avg_rating > 0 && (
            <p className="text-xs text-letterboxd-gray-lighter">
              Avg: <span className="font-medium">{data.avg_rating.toFixed(2)}</span> ⭐
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
        No data available for {title}
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
      className="w-full h-full flex flex-col"
    >
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
          >
            <XAxis 
              type="number" 
              tick={{ fill: '#99aabb', fontSize: 10 }} 
              axisLine={{ stroke: '#2c3440' }} 
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#99aabb', fontSize: 10 }}
              axisLine={{ stroke: '#2c3440' }}
              width={75}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar 
              dataKey="count" 
              radius={[0, 4, 4, 0]}
              animationBegin={200}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={color} fillOpacity={1 - index * 0.08} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  )
}
