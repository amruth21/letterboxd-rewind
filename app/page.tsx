'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FilmFrame from './components/FilmFrame'
import FilmPerforations from './components/FilmPerforations'
import DayOfWeekChart from './components/DayOfWeekChart'
import TopItemsChart from './components/TopItemsChart'
import TopRatedList from './components/TopRatedList'
import LanguagePieChart from './components/LanguagePieChart'
import PolarizingTakes from './components/PolarizingTakes'
import LoadingAnimation from './components/LoadingAnimation'
import YearSelector from './components/YearSelector'
import WatchTimelineChart from './components/WatchTimelineChart'
import AnimatedNumber from './components/AnimatedNumber'
import HandwritingText from './components/HandwritingText'
import DecadeChart from './components/DecadeChart'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [year, setYear] = useState('')
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const [showClapperboard, setShowClapperboard] = useState(false)
  const [transitionToStats, setTransitionToStats] = useState(false)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Use aggregate counts from backend
  const aggregateStats = useMemo(() => {
    if (!response?.success) return null
    
    return {
      totalActors: response.aggregate_counts?.total_actors || 0,
      totalDirectors: response.aggregate_counts?.total_directors || 0,
      totalLanguages: response.aggregate_counts?.total_languages || 0,
      totalGenres: response.aggregate_counts?.total_genres || 0,
      totalRuntime: response.runtime_stats?.total_minutes || 0,
    }
  }, [response])

  // Native horizontal scroll - just track progress
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const maxScroll = container.scrollWidth - container.clientWidth
      const progress = maxScroll > 0 ? container.scrollLeft / maxScroll : 0
      setScrollProgress(progress)
      
      // Hide scroll hint after scrolling
      if (showScrollHint && container.scrollLeft > 50) {
        setShowScrollHint(false)
      }
    }

    // Convert vertical scroll to horizontal scroll
    const handleWheel = (e: WheelEvent) => {
      // Only intercept vertical scrolling
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        container.scrollLeft += e.deltaY
      }
    }

    container.addEventListener('scroll', handleScroll)
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      container.removeEventListener('wheel', handleWheel)
    }
  }, [showScrollHint])

  const handleScrape = async () => {
    if (!username.trim()) {
      setError('Please enter a username')
      return
    }

    if (!year.trim()) {
      setError('Please enter a year')
      return
    }

    // Play clapperboard animation
    setShowClapperboard(true)
    await new Promise(resolve => setTimeout(resolve, 1200))
    setShowClapperboard(false)

    setLoading(true)
    setError(null)
    setResponse(null)
    setTransitionToStats(false)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          year: year.trim().toUpperCase() === 'ALL' ? 'ALL' : parseInt(year),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to scrape Letterboxd profile')
      }

      // Trigger transition animation
      setTransitionToStats(true)
      await new Promise(resolve => setTimeout(resolve, 800))

      setResponse(data)
      
      // Scroll to stats after a brief delay
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: scrollContainerRef.current.clientWidth,
            behavior: 'smooth'
          })
        }
      }, 500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setTransitionToStats(false)
    }
  }

  // Calculate total frames for numbering
  let frameCount = 1 // Input frame
  if (response?.success) {
    frameCount += 1 // Overview
    if (response.milestones?.length > 0) frameCount += 1 // Milestones
    if (response.watch_timeline?.length > 0) frameCount += 1
    if (response.day_of_week) frameCount += 1
    if (response.decade_stats?.decades?.length > 0) frameCount += 1
    if (response.genres?.weighted?.length > 0) frameCount += 1
    if (response.actors?.weighted?.length > 0) frameCount += 1
    if (response.directors?.weighted?.length > 0) frameCount += 1
    if (response.languages?.weighted?.length > 0) frameCount += 1
    if (response.most_watched) frameCount += 1
    if (response.polarizing_takes) frameCount += 1
    if (response.top_rewatched?.length > 0) frameCount += 1
    frameCount += 1 // End frame
  }

  return (
    <div className="relative overflow-hidden">
      {/* Film Grain Overlay */}
      <div className="film-grain" />
      
      {/* Clapperboard Animation Overlay */}
      <AnimatePresence>
        {showClapperboard && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.5, rotateX: -30 }}
              animate={{ scale: 1, rotateX: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <motion.div
                className="text-8xl mb-4"
                animate={{ rotate: [0, -15, 0] }}
                transition={{ duration: 0.3, times: [0, 0.5, 1] }}
              >
                🎬
              </motion.div>
              <motion.p
                className="text-white text-2xl font-bold"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                ACTION!
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Perforations */}
      <FilmPerforations position="top" scrollProgress={scrollProgress} />
      <FilmPerforations position="bottom" scrollProgress={scrollProgress} />

      {/* Progress Bar */}
      {response?.success && (
        <div className="film-progress">
          <div 
            className="film-progress-bar" 
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      )}

      {/* Scroll Indicator */}
      <AnimatePresence>
        {showScrollHint && !loading && response?.success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="scroll-indicator"
          >
            <span>← Scroll horizontally →</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Horizontal Scroll Container */}
      <div
        ref={scrollContainerRef}
        className="horizontal-scroll-container"
      >
        <div className="film-reel-container">
          {/* Frame 1: Input Form / Loading State */}
          <FilmFrame frameNumber={1} variant="input">
            <AnimatePresence mode="wait">
              {!loading && !response?.success && (
            <motion.div
                  key="input-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                  className="w-full max-w-md"
            >
                  <div className="bg-letterboxd-dark/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-letterboxd-dark-lighter">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center gap-3 mb-2"
                >
                  <img src="/icon.png" alt="" className="w-10 h-10 object-contain" />
                  <h1 className="text-3xl font-bold text-white">Letterboxd Rewind</h1>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                      className="text-letterboxd-gray-lighter text-center mb-5 text-sm"
                >
                      Analyze your viewing stats
                </motion.p>

                    <div className="space-y-3">
                  <div>
                        <label className="block mb-1 text-white font-medium text-sm">
                          Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      disabled={loading}
                          className="w-full px-3 py-2 border-2 border-letterboxd-dark-lighter rounded-lg focus:border-letterboxd-orange focus:outline-none transition-colors bg-letterboxd-dark text-white placeholder-letterboxd-gray disabled:bg-letterboxd-dark-lighter text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && !loading && handleScrape()}
                    />
                  </div>

                  <div>
                        <label className="block mb-1 text-white font-medium text-sm">
                      Year
                    </label>
                    <YearSelector
                      value={year}
                      onChange={setYear}
                      disabled={loading}
                    />
                  </div>

                  <motion.button
                    onClick={handleScrape}
                    disabled={loading || !username.trim() || !year.trim()}
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                        className="w-full py-2.5 bg-gradient-to-r from-letterboxd-orange to-letterboxd-green text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                        Start Rewind
                  </motion.button>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                          className="mt-3 p-2 bg-letterboxd-dark-light border-2 border-letterboxd-orange rounded-lg text-letterboxd-orange text-xs"
                    >
                      <strong>Error:</strong> {error}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
              )}

              {/* Loading State - Full Center */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ 
                    opacity: 0,
                    x: 300,
                    scale: 0.5,
                    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
                  }}
                  className="w-full max-w-2xl"
                >
                  <LoadingAnimation isComplete={transitionToStats} />
                </motion.div>
              )}

              {/* Success indicator for returning to start */}
              {response?.success && !loading && (
                <motion.div
                  key="success-indicator"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center flex flex-col items-center"
                >
                  <h2 className="text-2xl font-bold text-white mb-3">
                    {response.username}'s Rewind
                  </h2>
                  <img src="/icon.png" alt="" className="w-20 h-20 object-contain mb-4" />
                  <p className="text-letterboxd-gray-lighter mb-4">
                    Scroll right to view your stats →
                  </p>
                  <motion.button
                    onClick={() => {
                      setResponse(null)
                      setError(null)
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 bg-letterboxd-dark-lighter text-white rounded-lg text-sm border border-letterboxd-gray hover:border-letterboxd-orange transition-colors"
                  >
                    New Search
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </FilmFrame>

          {/* Results Frames */}
          <AnimatePresence>
            {response?.success && (
              <>
                {/* Frame 2: Overview Stats - Enhanced */}
                <FilmFrame frameNumber={2} title="Your Letterboxd Breakdown" variant="stats">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl">
                    {/* Diary Entries */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-letterboxd-orange/30"
                    >
                      <AnimatedNumber
                        value={response.total_films}
                        className="text-4xl font-bold text-letterboxd-orange mb-1 block"
                      />
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Diary Entries</div>
                    </motion.div>
                    
                    {/* Films Watched */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-letterboxd-green/30"
                    >
                      <AnimatedNumber
                        value={response.unique_films}
                        className="text-4xl font-bold text-letterboxd-green mb-1 block"
                      />
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Films Watched</div>
                    </motion.div>
                    
                    {/* Total Actors */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-letterboxd-blue/30"
                    >
                      <AnimatedNumber
                        value={aggregateStats?.totalActors || 0}
                        className="text-4xl font-bold text-letterboxd-blue mb-1 block"
                      />
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Actors Seen</div>
                    </motion.div>
                    
                    {/* Total Directors */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-purple-500/30"
                    >
                      <AnimatedNumber
                        value={aggregateStats?.totalDirectors || 0}
                        className="text-4xl font-bold text-purple-400 mb-1 block"
                      />
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Directors</div>
                    </motion.div>
                    
                    {/* Total Languages */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-yellow-500/30"
                    >
                      <AnimatedNumber
                        value={aggregateStats?.totalLanguages || 0}
                        className="text-4xl font-bold text-yellow-400 mb-1 block"
                      />
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Languages</div>
                    </motion.div>
                    
                    {/* Total Genres */}
                  <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.7, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-cyan-500/30"
                    >
                      <AnimatedNumber
                        value={aggregateStats?.totalGenres || 0}
                        className="text-4xl font-bold text-cyan-400 mb-1 block"
                      />
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Genres</div>
                    </motion.div>
                    
                    {/* Total Runtime */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.8, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-rose-500/30"
                    >
                      <div className="text-4xl font-bold text-rose-400 mb-1">
                        {Math.floor((aggregateStats?.totalRuntime || 0) / 60)}
                        <span className="text-lg font-normal text-rose-300">h</span>
                        {' '}
                        {(aggregateStats?.totalRuntime || 0) % 60}
                        <span className="text-lg font-normal text-rose-300">m</span>
                      </div>
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Total Runtime</div>
                    </motion.div>
                    
                    {/* Average Film Age */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 0.9, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-amber-500/30"
                    >
                      <div className="text-4xl font-bold text-amber-400 mb-1">
                        {response.average_film_age || 0}
                        <span className="text-lg font-normal text-amber-300"> yrs</span>
                      </div>
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Avg Film Age</div>
                    </motion.div>
                    
                    {/* Average Rating */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0, y: 50 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: 1.0, type: 'spring', bounce: 0.4 }}
                      className="text-center p-5 bg-letterboxd-dark/60 backdrop-blur-sm rounded-xl border border-yellow-500/30"
                    >
                      <div className="text-4xl font-bold text-yellow-400 mb-1">
                        {response.average_rating?.toFixed(1) || '—'}
                        <span className="text-lg font-normal text-yellow-300"> ★</span>
                      </div>
                      <div className="text-letterboxd-gray-lighter font-medium text-xs">Avg Rating</div>
                  </motion.div>
                  </div>
                </FilmFrame>

                {/* Frame 3: Milestones */}
                {response.milestones && response.milestones.length > 0 && (
                  <FilmFrame frameNumber={3} title="Milestones">
                    <div className="flex flex-wrap justify-center gap-6 max-w-5xl">
                      {response.milestones.map((milestone: any, index: number) => (
                        <motion.div
                          key={milestone.milestone}
                          initial={{ opacity: 0, y: 40, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.15, type: 'spring', bounce: 0.4 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="flex flex-col items-center"
                        >
                          {/* Milestone Badge */}
                          <div className="relative mb-4">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-letterboxd-orange to-yellow-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg z-10 whitespace-nowrap">
                              #{milestone.milestone}
                            </div>
                            {/* Poster or Placeholder */}
                            {milestone.poster_url ? (
                              <img
                                src={milestone.poster_url}
                                alt={milestone.film_name}
                                className="w-36 h-52 object-cover rounded-lg shadow-xl border-2 border-letterboxd-orange/40 mt-2"
                              />
                            ) : (
                              <div className="w-36 h-52 bg-letterboxd-dark-lighter rounded-lg border-2 border-letterboxd-orange/40 flex items-center justify-center mt-2">
                                <div className="text-5xl">🎬</div>
                              </div>
                            )}
                          </div>
                          {/* Film Title */}
                          <span className="font-semibold text-white text-base text-center max-w-[160px] line-clamp-2 mb-1">
                            {milestone.film_name}
                          </span>
                          {/* Watch Date */}
                          {milestone.watch_date && (
                            <span className="text-letterboxd-gray-lighter text-sm">
                              {milestone.watch_date}
                            </span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 4: Watch Timeline */}
                {response.watch_timeline && response.watch_timeline.length > 0 && (
                  <FilmFrame frameNumber={4} title="Your Watching Journey">
                    <div className="w-full h-full max-w-4xl">
                      <WatchTimelineChart data={response.watch_timeline} year={response.year} />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 5: Day of Week Chart */}
                {response.day_of_week && (
                  <FilmFrame frameNumber={5} title="Days of the Week">
                    <div className="w-full h-full max-w-4xl">
                      <DayOfWeekChart data={response.day_of_week} totalFilms={response.total_films} />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 6: Decade Distribution */}
                {response.decade_stats?.decades && response.decade_stats.decades.length > 0 && (
                  <FilmFrame frameNumber={6} title="Your Favorite Eras">
                    <div className="w-full h-full max-w-3xl">
                      <DecadeChart 
                        decades={response.decade_stats.decades} 
                        favoriteDecade={response.decade_stats.favorite_decade} 
                      />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 7: Top Genres */}
                {response.genres?.weighted && response.genres.weighted.length > 0 && (
                  <FilmFrame frameNumber={7} title="Top Genres">
                    <div className="w-full h-full max-w-3xl">
                      <TopItemsChart
                        title="Genres"
                        items={response.genres.weighted.slice(0, 8).map((g: any) => ({
                          name: g.name,
                          count: g.count,
                          avg_rating: g.avg_rating,
                        }))}
                        color="#fe8000"
                      />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 8: Top Actors by Rating */}
                {response.actors?.weighted && response.actors.weighted.length > 0 && (
                  <FilmFrame frameNumber={8} title="Your Favorite Actors">
                    <div className="w-full max-w-2xl">
                      <TopRatedList
                        title="Actors"
                        items={response.actors.weighted.slice(0, 5)}
                        topImageUrl={response.top_actor_image_url}
                        color="#0ae053"
                        icon="⭐"
                      />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 9: Top Directors by Rating */}
                {response.directors?.weighted && response.directors.weighted.length > 0 && (
                  <FilmFrame frameNumber={9} title="Your Favorite Directors">
                    <div className="w-full max-w-2xl">
                      <TopRatedList
                        title="Directors"
                        items={response.directors.weighted.slice(0, 5)}
                        topImageUrl={response.top_director_image_url}
                        color="#41bcf4"
                        icon="🎬"
                      />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 10: Language Breakdown */}
                {response.languages?.weighted && response.languages.weighted.length > 0 && (
                  <FilmFrame frameNumber={10} title="Languages">
                    <div className="w-full h-full max-w-xl">
                      <LanguagePieChart
                        items={response.languages.weighted.map((l: any) => ({
                          name: l.name,
                          count: l.count,
                          avg_rating: l.avg_rating,
                        }))}
                      />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 11: Most Watched - 1 of each */}
                {response.most_watched && (
                  <FilmFrame frameNumber={11} title="Your #1s">
                    <div className="grid grid-cols-3 gap-4 max-w-4xl">
                      {/* Row 1: Director, Actor, Genre */}
                      {response.most_watched.directors?.[0] && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2, type: 'spring' }}
                          whileHover={{ scale: 1.03 }}
                          className="text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-letterboxd-orange/30"
                        >
                          <div className="text-2xl mb-1">🎬</div>
                          <div className="text-[9px] text-letterboxd-gray-light uppercase tracking-wide mb-1">Director</div>
                          <div className="text-sm font-bold text-white mb-1 truncate">{response.most_watched.directors[0].name}</div>
                          <div className="text-xl font-bold text-letterboxd-orange">{response.most_watched.directors[0].count}</div>
                          <div className="text-[9px] text-letterboxd-gray-lighter">films</div>
                        </motion.div>
                      )}
                      {response.most_watched.actors?.[0] && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, type: 'spring' }}
                          whileHover={{ scale: 1.03 }}
                          className="text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-letterboxd-green/30"
                        >
                          <div className="text-2xl mb-1">⭐</div>
                          <div className="text-[9px] text-letterboxd-gray-light uppercase tracking-wide mb-1">Actor</div>
                          <div className="text-sm font-bold text-white mb-1 truncate">{response.most_watched.actors[0].name}</div>
                          <div className="text-xl font-bold text-letterboxd-green">{response.most_watched.actors[0].count}</div>
                          <div className="text-[9px] text-letterboxd-gray-lighter">films</div>
                        </motion.div>
                      )}
                      {response.most_watched.genres?.[0] && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4, type: 'spring' }}
                          whileHover={{ scale: 1.03 }}
                          className="text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-letterboxd-blue/30"
                        >
                          <div className="text-2xl mb-1">🎭</div>
                          <div className="text-[9px] text-letterboxd-gray-light uppercase tracking-wide mb-1">Genre</div>
                          <div className="text-sm font-bold text-white mb-1 truncate">{response.most_watched.genres[0].name}</div>
                          <div className="text-xl font-bold text-letterboxd-blue">{response.most_watched.genres[0].count}</div>
                          <div className="text-[9px] text-letterboxd-gray-lighter">films</div>
                        </motion.div>
                      )}
                      {/* Row 2: Studio, Language, Cinematographer */}
                      {response.most_watched.studios?.[0] && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5, type: 'spring' }}
                          whileHover={{ scale: 1.03 }}
                          className="text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-purple-500/30"
                        >
                          <div className="text-2xl mb-1">🏛️</div>
                          <div className="text-[9px] text-letterboxd-gray-light uppercase tracking-wide mb-1">Studio</div>
                          <div className="text-sm font-bold text-white mb-1 truncate">{response.most_watched.studios[0].name}</div>
                          <div className="text-xl font-bold text-purple-400">{response.most_watched.studios[0].count}</div>
                          <div className="text-[9px] text-letterboxd-gray-lighter">films</div>
                        </motion.div>
                      )}
                      {response.most_watched.languages?.[0] && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6, type: 'spring' }}
                          whileHover={{ scale: 1.03 }}
                          className="text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-yellow-500/30"
                        >
                          <div className="text-2xl mb-1">🌍</div>
                          <div className="text-[9px] text-letterboxd-gray-light uppercase tracking-wide mb-1">Language</div>
                          <div className="text-sm font-bold text-white mb-1 truncate">{response.most_watched.languages[0].name}</div>
                          <div className="text-xl font-bold text-yellow-400">{response.most_watched.languages[0].count}</div>
                          <div className="text-[9px] text-letterboxd-gray-lighter">films</div>
                        </motion.div>
                      )}
                      {response.most_watched.cinematographers?.[0] && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7, type: 'spring' }}
                          whileHover={{ scale: 1.03 }}
                          className="text-center p-4 bg-letterboxd-dark/60 rounded-xl border border-cyan-500/30"
                        >
                          <div className="text-2xl mb-1">📷</div>
                          <div className="text-[9px] text-letterboxd-gray-light uppercase tracking-wide mb-1">Cinematographer</div>
                          <div className="text-sm font-bold text-white mb-1 truncate">{response.most_watched.cinematographers[0].name}</div>
                          <div className="text-xl font-bold text-cyan-400">{response.most_watched.cinematographers[0].count}</div>
                          <div className="text-[9px] text-letterboxd-gray-lighter">films</div>
                        </motion.div>
                      )}
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 12: Polarizing Takes */}
                {response.polarizing_takes && (
                  <FilmFrame frameNumber={12} title="Polarizing Takes">
                    <div className="w-full max-w-4xl">
                      <PolarizingTakes
                        topVarianceMovies={response.polarizing_takes.top_variance_movies || []}
                        topOverhypedDirectors={response.polarizing_takes.top_overhyped_directors || []}
                        topUnderhypedDirectors={response.polarizing_takes.top_underhyped_directors || []}
                      />
                    </div>
                  </FilmFrame>
                )}

                {/* Frame 13: Top Rewatched */}
                {response.top_rewatched && response.top_rewatched.length > 0 && (
                  <FilmFrame frameNumber={13} title="Most Rewatched">
                    <div className="flex justify-center gap-8">
                      {response.top_rewatched.slice(0, 3).map((movie: any, index: number) => (
                          <motion.div
                            key={movie.movie}
                          initial={{ opacity: 0, y: 30, rotateY: -15 }}
                          animate={{ opacity: 1, y: 0, rotateY: 0 }}
                          transition={{ delay: index * 0.2, type: 'spring', bounce: 0.3 }}
                          whileHover={{ scale: 1.05, y: -5 }}
                          className="flex flex-col items-center"
                        >
                          {/* Movie Poster */}
                          <div className="relative mb-4">
                            {movie.poster_url ? (
                              <div className="relative">
                                <img
                                  src={movie.poster_url}
                                  alt={movie.movie}
                                  className="w-40 h-60 object-cover rounded-lg shadow-xl border-2 border-letterboxd-orange/50"
                                />
                                {/* Rewatch count badge */}
                                <div className="absolute -top-3 -right-3 bg-letterboxd-orange text-white text-base font-bold px-3 py-1.5 rounded-full shadow-lg">
                                  {movie.count}×
                                </div>
                              </div>
                            ) : (
                              <div className="w-40 h-60 bg-letterboxd-dark-lighter rounded-lg border-2 border-letterboxd-orange/50 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="text-5xl mb-2">🎬</div>
                                  <div className="text-letterboxd-orange font-bold text-xl">{movie.count}×</div>
                                </div>
                              </div>
                            )}
                            </div>
                          {/* Movie Title */}
                          <span className="font-semibold text-white text-base text-center max-w-[170px] line-clamp-2">
                            {movie.movie}
                          </span>
                          </motion.div>
                        ))}
                    </div>
                  </FilmFrame>
                )}

                {/* Final Frame: End Credits */}
                <FilmFrame frameNumber={frameCount} title="">
                  <div className="flex flex-col items-center justify-center h-full relative">
                    {/* Handwriting "The End" animation */}
                    <div className="flex-1 flex items-center justify-center w-full">
                      <HandwritingText duration={2.5} delay={0.5} />
                    </div>
                    
                    {/* Small rewind button at bottom */}
                    <motion.button
                      onClick={() => {
                        scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 4, duration: 0.5 }}
                      className="mb-8 px-4 py-2 text-letterboxd-gray-lighter text-sm hover:text-white transition-colors"
                    >
                      ← Rewind to Start
                    </motion.button>
                  </div>
                </FilmFrame>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
