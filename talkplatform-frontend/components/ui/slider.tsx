"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number[]
  min: number
  max: number
  step?: number
  onValueChange?: (value: number[]) => void
}

export const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, min, max, step = 1, onValueChange, ...props }, ref) => {
    const trackRef = React.useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const currentValue = value[0]

    const percentage = ((currentValue - min) / (max - min)) * 100

    const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const position = (event.clientX - rect.left) / rect.width
      let newValue = min + position * (max - min)

      // Apply step
      newValue = Math.round(newValue / step) * step

      // Clamp value
      newValue = Math.max(min, Math.min(max, newValue))

      onValueChange?.([newValue])
    }

    const handleDragStart = () => {
      setIsDragging(true)
    }

    const handleDragEnd = () => {
      setIsDragging(false)
    }

    const handleDrag = (event: MouseEvent) => {
      if (!isDragging || !trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const position = (event.clientX - rect.left) / rect.width
      let newValue = min + position * (max - min)

      // Apply step
      newValue = Math.round(newValue / step) * step

      // Clamp value
      newValue = Math.max(min, Math.min(max, newValue))

      onValueChange?.([newValue])
    }

    React.useEffect(() => {
      if (isDragging) {
        window.addEventListener("mousemove", handleDrag)
        window.addEventListener("mouseup", handleDragEnd)
      }

      return () => {
        window.removeEventListener("mousemove", handleDrag)
        window.removeEventListener("mouseup", handleDragEnd)
      }
    }, [isDragging])

    return (
      <div ref={ref} className={cn("relative flex w-full touch-none select-none items-center group", className)} {...props}>
        <div
          ref={trackRef}
          className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-600 transition-all group-hover:h-1.5 cursor-pointer"
          onClick={handleClick}
        >
          <div 
            className="absolute h-full bg-red-600 transition-all" 
            style={{ width: `${percentage}%` }} 
          />
        </div>
        <div
          className="absolute h-3 w-3 rounded-full bg-red-600 shadow-lg cursor-grab active:cursor-grabbing transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
          style={{ left: `calc(${percentage}% - 6px)` }}
          onMouseDown={handleDragStart}
        />
      </div>
    )
  },
)

Slider.displayName = "Slider"
