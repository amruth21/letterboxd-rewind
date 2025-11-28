'use client'

import { motion, useInView } from 'framer-motion'
import { ReactNode, useRef } from 'react'

interface FilmFrameProps {
  children: ReactNode
  frameNumber: number
  title?: string
  subtitle?: string
  className?: string
  variant?: 'input' | 'stats' | 'default'
}

export default function FilmFrame({
  children,
  frameNumber,
  title,
  subtitle,
  className = '',
  variant = 'default',
}: FilmFrameProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  const variantClasses = {
    input: 'input-frame',
    stats: 'stats-frame',
    default: '',
  }

  // Different entrance animations based on frame position
  const frameVariants = {
    hidden: {
      opacity: 0,
      x: 100,
      rotateY: -5,
      scale: 0.95,
    },
    visible: {
      opacity: 1,
      x: 0,
      rotateY: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 100,
        duration: 0.6,
      }
    }
  }

  // Title animation - slides up like film credits
  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 100,
        delay: 0.2,
      }
    }
  }

  // Subtitle animation
  const subtitleVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 15,
        stiffness: 100,
        delay: 0.3,
      }
    }
  }

  // Frame number animation - typewriter effect
  const frameNumberVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        damping: 10,
        stiffness: 200,
        delay: 0.4,
      }
    }
  }

  return (
    <motion.div
      ref={ref}
      className={`film-frame ${variantClasses[variant]} ${className}`}
      variants={frameVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      style={{ perspective: 1000 }}
    >
      <div className="frame-content">
        {/* Title Section - fixed height */}
        {title && (
          <div className="frame-title text-center">
            <motion.h2
              variants={titleVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="text-2xl md:text-3xl font-bold text-white"
            >
              {title}
            </motion.h2>
            {subtitle && (
              <motion.p
                variants={subtitleVariants}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                className="text-letterboxd-gray-lighter text-sm mt-1"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        )}
        
        {/* Body Section - fills remaining space */}
        <motion.div 
          className="frame-body"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {children}
        </motion.div>
      </div>
      
      {/* Frame number with film-style appearance */}
      <motion.div
        variants={frameNumberVariants}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="frame-number"
      >
        <span className="font-mono tracking-wider">
          FRAME {String(frameNumber).padStart(3, '0')}
        </span>
      </motion.div>
    </motion.div>
  )
}
