'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const [amazonUrl, setAmazonUrl] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [scrapedProduct, setScrapedProduct] = useState<any>(null)
  const [error, setError] = useState('')
  const [isGeneratingScripts, setIsGeneratingScripts] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<any>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleScrapeProduct = async () => {
    if (!amazonUrl.trim()) {
      setError('Please enter a valid Amazon product URL')
      return
    }

    setIsProcessing(true)
    setError('')
    setScrapedProduct(null)

    try {
      const response = await fetch('/api/scrape-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ amazonUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process product')
      }

      setScrapedProduct(data.product)
      setAmazonUrl('') // Clear the input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateScripts = async () => {
    if (!scrapedProduct?.id) return

    setIsGeneratingScripts(true)
    setError('')

    try {
      const response = await fetch('/api/generate-scripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ productId: scrapedProduct.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate scripts')
      }

      setGeneratedContent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate scripts')
    } finally {
      setIsGeneratingScripts(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{user.user_metadata?.first_name || 'User'}!</span>
              </h1>
              <p className="text-gray-600 mt-2">Ready to create some amazing UGC content?</p>
            </div>
            <button
              onClick={signOut}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-2xl hover:bg-gray-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Add Your Amazon Product</h2>
              <p className="text-gray-600 mb-6">
                Paste your Amazon product URL below and we'll help you create engaging UGC content.
              </p>
              
              <div className="space-y-4">
                <input
                  type="url"
                  placeholder="https://amazon.com/dp/..."
                  value={amazonUrl}
                  onChange={(e) => setAmazonUrl(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  disabled={isProcessing}
                />
                {error && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                    {error}
                  </div>
                )}
                <button 
                  onClick={handleScrapeProduct}
                  disabled={isProcessing || !amazonUrl.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 px-6 rounded-2xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing Product...
                    </div>
                  ) : (
                    'Generate UGC Content'
                  )}
                </button>
              </div>
            </div>

            {scrapedProduct && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Added Successfully!</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Product Title:</h3>
                    <p className="text-gray-700">{scrapedProduct.title}</p>
                  </div>
                  
                  {scrapedProduct.description && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Description:</h3>
                      <p className="text-gray-700 text-sm">{scrapedProduct.description.substring(0, 300)}...</p>
                    </div>
                  )}

                  {scrapedProduct.imageUrls && scrapedProduct.imageUrls.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Product Images ({scrapedProduct.imageUrls.length}):</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {scrapedProduct.imageUrls.slice(0, 8).map((imageUrl: string, index: number) => (
                          <div key={index} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                            <img 
                              src={imageUrl} 
                              alt={`Product image ${index + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">Product saved to your library</p>
                      <button
                        onClick={() => {
                          setScrapedProduct(null)
                          setGeneratedContent(null)
                        }}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        Add Another Product
                      </button>
                    </div>
                    
                    {!generatedContent && (
                      <button
                        onClick={handleGenerateScripts}
                        disabled={isGeneratingScripts}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2 px-4 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGeneratingScripts ? (
                          <div className="flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Generating UGC Scripts...
                          </div>
                        ) : (
                          '🎬 Generate UGC Scripts'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {generatedContent && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
                <div className="flex items-center mb-6">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">🎬</span>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">UGC Content Generated!</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Selected Image */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">📸 Selected Image</h3>
                    <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-3">
                      <img 
                        src={generatedContent.selectedImage.url} 
                        alt="Selected for UGC video"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      <strong>Why this image:</strong> {generatedContent.selectedImage.reasoning}
                    </p>
                  </div>

                  {/* Generated Scripts */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">📝 UGC Script Segments</h3>
                    <div className="space-y-4">
                      {generatedContent.scriptSegments.map((segment: string, index: number) => (
                        <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                          <div className="flex items-start">
                            <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-800 font-medium">"{segment}"</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {index === 0 && "Hook/Introduction (8 seconds)"}
                                {index === 1 && "Benefits/Features (8 seconds)"}
                                {index === 2 && "Call to Action (8 seconds)"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <h4 className="font-medium text-blue-900 mb-2">🎥 Ready for Video Creation!</h4>
                      <p className="text-sm text-blue-700">
                        Use the selected image and these script segments to create your UGC video. 
                        Each segment is designed to be about 8 seconds when spoken naturally.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Recent Projects</h2>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center opacity-20">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-gray-500">No projects yet. Add your first Amazon product to get started!</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Projects</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Content Generated</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">This Month</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">0</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tips & Tricks</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>• Use high-quality Amazon product URLs for best results</p>
                <p>• Check product availability before generating content</p>
                <p>• Review and customize generated content to match your brand</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}