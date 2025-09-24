'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface VideoOperation {
  operationName: string
  segmentNumber: number
  prompt: string
  status: string
  videoUri?: string
  error?: string
}

interface Product {
  id: string
  product_title: string
  product_description: string
  product_image_urls: string[]
  amazon_url: string
}

export default function VideoGenerationPage({ params }: { params: { productId: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [product, setProduct] = useState<Product | null>(null)
  const [operations, setOperations] = useState<VideoOperation[]>([])
  const [scriptSegments, setScriptSegments] = useState<string[]>([])
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }

    if (user) {
      loadData()
    }
  }, [user, authLoading, params.productId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.productId)
        .eq('user_id', user?.id)
        .single()

      if (productError) {
        setError('Product not found')
        return
      }

      setProduct(productData)

      // Get data from URL params
      const operationsParam = searchParams.get('operations')
      const scriptsParam = searchParams.get('scripts')
      const imageUrlParam = searchParams.get('imageUrl')

      if (operationsParam && scriptsParam && imageUrlParam) {
        const parsedOperations = JSON.parse(operationsParam)
        const parsedScripts = JSON.parse(scriptsParam)
        
        setOperations(parsedOperations.map((op: any) => ({ ...op, status: 'generating' })))
        setScriptSegments(parsedScripts)
        setSelectedImageUrl(imageUrlParam)

        // Start polling for each operation
        parsedOperations.forEach((op: any) => {
          pollVideoStatus(op.operationName, op.segmentNumber)
        })
      } else {
        setError('Invalid video generation data')
      }

    } catch (err) {
      setError('Failed to load data')
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const pollVideoStatus = async (operationName: string, segmentNumber: number) => {
    try {
      const response = await fetch(`/api/check-operation?operation=${encodeURIComponent(operationName)}`)
      const data = await response.json()
      
      if (data.status === 'completed') {
        setOperations(prev => prev.map(op => 
          op.segmentNumber === segmentNumber 
            ? { ...op, status: 'completed', videoUri: data.videoUri }
            : op
        ))

        // Check if all videos are completed
        setOperations(prev => {
          const allCompleted = prev.every(op => 
            op.segmentNumber === segmentNumber || op.status === 'completed'
          )
          
          if (allCompleted) {
            setIsGenerating(false)
          }
          
          return prev
        })

      } else if (data.status === 'error') {
        setOperations(prev => prev.map(op => 
          op.segmentNumber === segmentNumber 
            ? { ...op, status: 'error', error: data.error }
            : op
        ))
      } else {
        // Still generating, poll again in 10 seconds
        setTimeout(() => pollVideoStatus(operationName, segmentNumber), 10000)
      }
    } catch (error) {
      console.error(`Error polling video ${segmentNumber}:`, error)
    }
  }

  const getVideoSrc = (videoUri: string) => {
    return `/api/download-video?uri=${encodeURIComponent(videoUri)}`
  }

  const downloadVideo = (videoUri: string, segmentNumber: number) => {
    window.open(`/api/download-video?uri=${encodeURIComponent(videoUri)}&download=true`, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'generating': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video generation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-8 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-purple-600 hover:text-purple-700 mb-2 text-sm font-medium"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                UGC Video Generation
              </h1>
              <p className="text-gray-600 mt-2">
                {isGenerating ? 'Generating your videos...' : 'Videos ready!'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Product Info */}
            {product && (
              <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Details</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Product Title:</h3>
                    <p className="text-gray-700">{product.product_title}</p>
                  </div>
                  
                  {selectedImageUrl && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Selected Image:</h3>
                      <div className="aspect-square max-w-xs rounded-xl overflow-hidden bg-gray-100">
                        <img 
                          src={selectedImageUrl} 
                          alt="Selected for UGC video"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Videos */}
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white text-sm">🎬</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">UGC Videos</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {operations.map((operation) => (
                  <div key={operation.segmentNumber} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Video {operation.segmentNumber}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(operation.status)}`}>
                        {operation.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      <strong>Script:</strong> {scriptSegments[operation.segmentNumber - 1]}
                    </p>
                    
                    {operation.status === 'completed' && operation.videoUri && (
                      <div className="space-y-3">
                        <video 
                          src={getVideoSrc(operation.videoUri)}
                          controls 
                          className="w-full rounded-lg shadow-sm"
                          style={{ maxHeight: '200px' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                        
                        <button
                          onClick={() => downloadVideo(operation.videoUri!, operation.segmentNumber)}
                          className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <span>📥</span>
                          Download
                        </button>
                      </div>
                    )}
                    
                    {operation.status === 'error' && operation.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Error: {operation.error}
                      </div>
                    )}
                    
                    {operation.status === 'generating' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        Generating video... This may take several minutes.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {isGenerating && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                    <p className="text-blue-700 font-medium">Generating your UGC videos... This may take several minutes.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Videos</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {operations.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {operations.filter(op => op.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">In Progress</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {operations.filter(op => op.status === 'generating').length}
                  </span>
                </div>
              </div>
            </div>

            {scriptSegments.length > 0 && (
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Script Segments</h3>
                <div className="space-y-3">
                  {scriptSegments.map((segment: string, index: number) => (
                    <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3">
                      <div className="flex items-start">
                        <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                          {index + 1}
                        </div>
                        <p className="text-gray-800 font-medium text-sm">"{segment}"</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}