'use client'
import React from 'react'
import { Button } from './button'
import { useRouter } from 'next/navigation'

type Props = {
  href: string
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg'
}

const ButtonLink = ({
  href,
  children,
  className,
  variant,
  size,
  ...props
}: Props) => {
  const router = useRouter()
  return (
    <Button variant={variant} size={size} onClick={() => router.push(href)} className={className} {...props}>
      {children}
    </Button>
  )
}

export default ButtonLink