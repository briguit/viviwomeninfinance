'use client'
import { useEffect } from 'react'
import confetti from 'canvas-confetti'

export default function ConfettiBlast({ trigger }: { trigger: boolean }) {
  useEffect(() => {
    if (!trigger) return
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#FBBF24', '#7C3AED', '#10B981', '#A855F7', '#F59E0B'],
    })
  }, [trigger])
  return null
}
