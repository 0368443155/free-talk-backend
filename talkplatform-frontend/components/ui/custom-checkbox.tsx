"use client"

import * as React from "react"
import { Check } from 'lucide-react'

interface CustomCheckboxProps {
  id?: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  label?: string
}

export function CustomCheckbox({
  id,
  checked = false,
  onCheckedChange,
  disabled = false,
  className = "",
  label
}: CustomCheckboxProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        id={id}
        tabIndex={disabled ? -1 : 0}
        className={`h-4 w-4 rounded border border-primary ${
          checked ? "bg-primary" : "bg-background"
        } ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${className}`}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        {checked && <Check className="h-3 w-3 text-primary-foreground" />}
      </div>
      {label && (
        <label
          htmlFor={id}
          className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${
            disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
          }`}
          onClick={handleClick}
        >
          {label}
        </label>
      )}
    </div>
  )
}
