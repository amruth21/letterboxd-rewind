'use client'

import { useMemo, useRef } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { motion, useInView } from 'framer-motion'

interface DayOfWeekData {
  [key: string]: {
    count: number
    avg_rating: number | null
  }
}

interface DayOfWeekChartProps {
  data: DayOfWeekData
  totalFilms: number
}

const dayColors = {
  Monday: '#fe8000',
  Tuesday: '#0ae053',
  Wednesday: '#41bcf4',
  Thursday: '#fe8000',
  Friday: '#0ae053',
  Saturday: '#41bcf4',
  Sunday: '#fe8000',
}

const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function DayOfWeekChart({ data, totalFilms }: DayOfWeekChartProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  const chartData = useMemo(() => {
    return dayOrder.map(day => {
      const dayData = data[day] || { count: 0, avg_rating: null }
      const percentage = totalFilms > 0 ? (dayData.count / totalFilms) * 100 : 0
      return {
        day: day.substring(0, 3),
        fullDay: day,
        count: dayData.count,
        percentage: Math.round(percentage * 10) / 10,
        avg_rating: dayData.avg_rating,
        color: dayColors[day as keyof typeof dayColors],
      }
    })
  }, [data, totalFilms])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-letterboxd-dark-light p-2 border border-letterboxd-dark-lighter rounded-lg shadow-lg"
        >
          <p className="font-semibold text-white text-sm">{data.fullDay}</p>
          <p className="text-xs text-letterboxd-gray-lighter">
            <span className="font-medium">{data.count}</span> films ({data.percentage}%)
          </p>
          {data.avg_rating !== null && (
            <p className="text-xs text-letterboxd-gray-lighter">
              Avg: <span className="font-medium">{data.avg_rating.toFixed(2)}</span> ⭐
            </p>
          )}
        </motion.div>
      )
    }
    return null
  }

  // Container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      }
    }
  }

  // Stats card animation
  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 200,
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className="w-full h-full flex flex-col"
    >
      {/* Chart area - fills available space */}
      <motion.div 
        className="flex-1 min-h-0"
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.5, delay: 0.2, type: 'spring' }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
            <XAxis
              dataKey="day"
              tick={{ fill: '#99aabb', fontSize: 11 }}
              axisLine={{ stroke: '#2c3440' }}
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
      </motion.div>
      
      {/* Stats row - fixed height at bottom with staggered animation */}
      <motion.div 
        className="grid grid-cols-7 gap-1 pt-2 flex-shrink-0"
        variants={containerVariants}
      >
        {chartData.map((day, index) => (
          <motion.div
            key={day.fullDay}
            variants={cardVariants}
            whileHover={{ scale: 1.05, y: -2 }}
            className="text-center p-1.5 bg-letterboxd-dark-lighter/50 rounded cursor-default"
          >
            <motion.div 
              className="text-base font-bold" 
              style={{ color: day.color }}
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : { scale: 0 }}
              transition={{ delay: 0.4 + index * 0.05, type: 'spring', bounce: 0.5 }}
            >
              {day.count}
            </motion.div>
            <div className="text-[9px] text-letterboxd-gray-lighter">{day.day}</div>
            <div className="text-[9px] text-letterboxd-gray-light">{day.percentage}%</div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
