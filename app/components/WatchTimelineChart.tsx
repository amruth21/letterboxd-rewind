'use client'

import { useMemo } from 'react'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { motion } from 'framer-motion'

interface TimelineDataPoint {
  date: string
  cumulative_count: number
  films_on_day: number
}

interface WatchTimelineChartProps {
  data: TimelineDataPoint[]
  year: string | number
}

export default function WatchTimelineChart({ data, year }: WatchTimelineChartProps) {
  const isAllYears = typeof year === 'string' && year.toString().toUpperCase().includes('ALL')
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    
    return data.map((point) => {
      const date = new Date(point.date)
      
      return {
        // Use timestamp for proper time scaling on x-axis
        timestamp: date.getTime(),
        date: point.date,
        displayDate: isAllYears 
          ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        cumulative: point.cumulative_count,
        filmsOnDay: point.films_on_day,
      }
    }).sort((a, b) => a.timestamp - b.timestamp) // Ensure chronological order
  }, [data, isAllYears])

  // Calculate domain for x-axis (min and max timestamps with padding)
  const xDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 0]
    
    const minTime = chartData[0].timestamp
    const maxTime = chartData[chartData.length - 1].timestamp
    const range = maxTime - minTime
    const padding = range * 0.02 // 2% padding on each side
    
    return [minTime - padding, maxTime + padding]
  }, [chartData])

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null
    
    const maxFilmsInDay = Math.max(...chartData.map(d => d.filmsOnDay))
    
    return {
      maxFilmsInDay,
      watchingDays: chartData.length,
    }
  }, [chartData])

  // Format timestamp to readable date for x-axis ticks
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp)
    if (isAllYears) {
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Generate tick values that are evenly distributed across time
  const xTicks = useMemo(() => {
    if (chartData.length === 0) return []
    
    const minTime = chartData[0].timestamp
    const maxTime = chartData[chartData.length - 1].timestamp
    const range = maxTime - minTime
    
    // Generate ~6-8 ticks evenly distributed
    const numTicks = Math.min(8, chartData.length)
    const ticks: number[] = []
    
    for (let i = 0; i < numTicks; i++) {
      ticks.push(minTime + (range * i) / (numTicks - 1))
    }
    
    return ticks
  }, [chartData])

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-letterboxd-dark-light p-2 border border-letterboxd-dark-lighter rounded-lg shadow-lg">
          <p className="font-semibold text-white text-xs">{data.fullDate}</p>
          <p className="text-xs text-letterboxd-orange">
            Total: <span className="font-bold">{data.cumulative}</span>
          </p>
          <p className="text-xs text-letterboxd-green">
            +{data.filmsOnDay} film{data.filmsOnDay !== 1 ? 's' : ''}
          </p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-letterboxd-gray-light">
        No timeline data available
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full h-full flex flex-col"
    >
      {/* Chart - uses stepAfter for true stair-step appearance */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
            <defs>
              <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fe8000" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#fe8000" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={xDomain}
              ticks={xTicks}
              tickFormatter={formatXAxis}
              tick={{ fill: '#778899', fontSize: 9 }}
              axisLine={{ stroke: '#2c3440' }}
              tickLine={{ stroke: '#2c3440' }}
              angle={-45}
              textAnchor="end"
              height={45}
            />
            <YAxis
              tick={{ fill: '#99aabb', fontSize: 9 }}
              axisLine={{ stroke: '#2c3440' }}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="stepAfter"
              dataKey="cumulative"
              stroke="#fe8000"
              strokeWidth={2}
              fill="url(#colorCumulative)"
              dot={false}
              activeDot={{ r: 4, fill: '#fe8000', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Compact Statistics */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="text-center p-2 bg-letterboxd-dark-lighter rounded-lg">
            <div className="text-xl font-bold text-letterboxd-orange">
              {stats.watchingDays}
            </div>
            <div className="text-[10px] text-letterboxd-gray-lighter">Watch Days</div>
          </div>
          <div className="text-center p-2 bg-letterboxd-dark-lighter rounded-lg">
            <div className="text-xl font-bold text-letterboxd-green">
              {stats.maxFilmsInDay}
            </div>
            <div className="text-[10px] text-letterboxd-gray-lighter">Max in Day</div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
