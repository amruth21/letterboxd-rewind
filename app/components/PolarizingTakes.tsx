'use client'

import { motion, useInView } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useRef } from 'react'

interface VarianceMovie {
  movie: string
  your_rating: number
  avg_rating: number
  variance: number
  direction: 'overrated' | 'underrated'
}

interface VarianceDirector {
  director: string
  avg_variance: number
  num_films: number
  weighted_score: number
}

interface PolarizingTakesProps {
  topVarianceMovies: VarianceMovie[]
  topOverhypedDirectors: VarianceDirector[]
  topUnderhypedDirectors: VarianceDirector[]
}

export default function PolarizingTakes({
  topVarianceMovies,
  topOverhypedDirectors,
  topUnderhypedDirectors,
}: PolarizingTakesProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  // Limit to 5 movies and 3 directors each
  const limitedMovies = topVarianceMovies.slice(0, 5)
  const limitedOverhyped = topOverhypedDirectors.slice(0, 3)
  const limitedUnderhyped = topUnderhypedDirectors.slice(0, 3)


  return (
    <div ref={ref} className="flex flex-col gap-6" style={{ perspective: 1000 }}>
      {/* Top Variance Movies - Horizontal layout with flip animation */}
      <div>
        <motion.h3 
          className="text-lg font-bold text-white mb-3 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          🎭 Movies with Biggest Rating Differences
        </motion.h3>
        <div className="flex flex-wrap justify-center gap-3">
          {limitedMovies.map((movie, index) => {
            const isPositive = movie.variance > 0
            return (
              <motion.div
                key={movie.movie}
                initial={{ opacity: 0, rotateY: -90, scale: 0.8 }}
                animate={isInView ? { opacity: 1, rotateY: 0, scale: 1 } : { opacity: 0, rotateY: -90, scale: 0.8 }}
                transition={{ 
                  type: 'spring',
                  damping: 15,
                  stiffness: 100,
                  delay: index * 0.1,
                }}
                whileHover={{ scale: 1.02 }}
                className={`p-3 rounded-lg border-2 min-w-[200px] max-w-[220px] ${
                  isPositive
                    ? 'bg-blue-900/30 border-blue-500'
                    : 'bg-red-900/30 border-red-500'
                }`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <h4 className="font-semibold text-white text-sm mb-2 truncate" title={movie.movie}>
                  {movie.movie}
                </h4>
                <div className="flex items-center justify-between text-xs">
                  <div className="text-letterboxd-gray-lighter">
                    You: <span className="font-bold text-white">{movie.your_rating.toFixed(1)}</span>
                  </div>
                  <div className="text-letterboxd-gray-lighter">
                    Avg: <span className="font-bold text-white">{movie.avg_rating.toFixed(1)}</span>
                  </div>
                  <motion.div 
                    className={`font-bold flex items-center gap-1 ${isPositive ? 'text-blue-400' : 'text-red-400'}`}
                    initial={{ scale: 0 }}
                    animate={isInView ? { scale: 1 } : { scale: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, type: 'spring', bounce: 0.5 }}
                  >
                    {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {isPositive ? '+' : ''}{movie.variance.toFixed(1)}
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Directors - Side by side with slide animations */}
      <div className="grid grid-cols-2 gap-6">
        {/* Overhyped Directors (positive = you rated higher) */}
        <div>
          <motion.h3 
            className="text-base font-bold text-blue-400 mb-3 flex items-center justify-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <TrendingUp size={16} /> You Rated Higher
          </motion.h3>
          <div className="space-y-2">
            {limitedOverhyped.map((director, index) => (
              <motion.div
                key={director.director}
                custom={index}
                initial={{ opacity: 0, x: -50, rotateY: 30 }}
                animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: -50, rotateY: 30 }}
                transition={{ 
                  type: 'spring',
                  damping: 20,
                  stiffness: 150,
                  delay: 0.3 + index * 0.1,
                }}
                whileHover={{ scale: 1.02 }}
                className="p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{director.director}</span>
                  <motion.span 
                    className="text-sm text-blue-400 font-semibold"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, type: 'spring', bounce: 0.5 }}
                  >
                    +{director.avg_variance.toFixed(2)}
                  </motion.span>
                </div>
                <div className="text-xs text-letterboxd-gray-lighter mt-1">
                  {director.num_films} film{director.num_films !== 1 ? 's' : ''}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Underhyped Directors (negative = you rated lower) */}
        <div>
          <motion.h3 
            className="text-base font-bold text-red-400 mb-3 flex items-center justify-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <TrendingDown size={16} /> You Rated Lower
          </motion.h3>
          <div className="space-y-2">
            {limitedUnderhyped.map((director, index) => (
              <motion.div
                key={director.director}
                custom={index}
                initial={{ opacity: 0, x: 50, rotateY: -30 }}
                animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 50, rotateY: -30 }}
                transition={{ 
                  type: 'spring',
                  damping: 20,
                  stiffness: 150,
                  delay: 0.3 + index * 0.1,
                }}
                whileHover={{ scale: 1.02 }}
                className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{director.director}</span>
                  <motion.span 
                    className="text-sm text-red-400 font-semibold"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, type: 'spring', bounce: 0.5 }}
                  >
                    {director.avg_variance.toFixed(2)}
                  </motion.span>
                </div>
                <div className="text-xs text-letterboxd-gray-lighter mt-1">
                  {director.num_films} film{director.num_films !== 1 ? 's' : ''}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
