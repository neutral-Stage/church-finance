'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function BillsSummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconClassName,
  delay,
  displayValue,
}: {
  title: string
  value: number
  subtitle: string
  icon: React.ReactNode
  iconClassName: string
  delay: string
  displayValue?: string
}) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) setIsVisible(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible || displayValue) return
    let startTime: number
    const startValue = count
    const endValue = value
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / 2000, 1)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(startValue + (endValue - startValue) * easeOutCubic))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isVisible, value, count, displayValue])

  return (
    <Card
      className="animate-fade-in animate-slide-in-from-bottom-4 transition-transform hover:scale-105"
      style={{ animationDelay: delay }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">{title}</CardTitle>
        <div className={`rounded-lg p-2 ${iconClassName}`}>{icon}</div>
      </CardHeader>
      <CardContent>
        <span ref={ref} className="text-2xl font-bold">
          {displayValue ?? count}
        </span>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
