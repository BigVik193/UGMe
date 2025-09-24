'use client'

import { useState } from 'react'
import SignUpForm from './auth/SignUpForm'
import SignInForm from './auth/SignInForm'
import AnimatedText from './AnimatedText'

export default function LandingPage() {
  const [isSignUp, setIsSignUp] = useState(true)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen">
          {/* Left side - Hero content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Create <AnimatedText />
                <br />
                UGC Content
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Transform your Amazon products into engaging user-generated content with the power of AI. 
                Simply provide your product URL and watch the magic happen.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700">AI-powered content generation</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700">Easy Amazon product integration</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700">Professional quality results</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-700">Scale your content creation</span>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="relative mt-12">
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl opacity-20 rotate-12"></div>
              <div className="absolute -bottom-6 -right-8 w-16 h-16 bg-yellow-400 rounded-2xl opacity-60 -rotate-12"></div>
              <div className="absolute top-8 right-4 w-8 h-8 bg-green-400 rounded-full opacity-40"></div>
            </div>
          </div>

          {/* Right side - Auth forms */}
          <div className="flex justify-center lg:justify-end">
            {isSignUp ? (
              <SignUpForm onToggleMode={() => setIsSignUp(false)} />
            ) : (
              <SignInForm onToggleMode={() => setIsSignUp(true)} />
            )}
          </div>
        </div>

        {/* Bottom decorative section */}
        <div className="mt-20 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm border border-purple-100">
            <span className="text-sm text-gray-600">Trusted by content creators worldwide</span>
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}