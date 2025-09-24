'use client'

import { useState, useEffect } from 'react'

const words = [
  'AI-powered',
  'clothing',
  'skincare', 
  'makeup',
  'gadgets',
  'furniture',
  'jewelry',
  'food',
  'shoes',
  'games',
  'accessories'
]

export default function AnimatedText() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentText, setCurrentText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [typingSpeed, setTypingSpeed] = useState(80)

  useEffect(() => {
    const handleType = () => {
      const currentWord = words[currentWordIndex]
      
      if (isDeleting) {
        setCurrentText(currentWord.substring(0, currentText.length - 1))
        setTypingSpeed(40)
      } else {
        setCurrentText(currentWord.substring(0, currentText.length + 1))
        setTypingSpeed(80)
      }

      if (!isDeleting && currentText === currentWord) {
        setTimeout(() => setIsDeleting(true), 800)
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false)
        setCurrentWordIndex((prev) => (prev + 1) % words.length)
      }
    }

    const timer = setTimeout(handleType, typingSpeed)
    return () => clearTimeout(timer)
  }, [currentText, isDeleting, currentWordIndex, typingSpeed])

  return (
    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
      {currentText}
      <span className="animate-pulse">|</span>
    </span>
  )
}