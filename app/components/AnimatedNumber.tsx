'use client'

import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

export default function AnimatedNumber({
  value,
  duration = 1.5,
  className = '',
  suffix = '',
  prefix = '',
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  })
  const isInView = useInView(ref, { once: true, margin: '-10%' })

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [isInView, value, motionValue])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Math.round(latest)}${suffix}`
      }
    })
    return unsubscribe
  }, [springValue, prefix, suffix])

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
    >
      {prefix}0{suffix}
    </motion.span>
  )
}

