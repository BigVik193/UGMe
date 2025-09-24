'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface VideoProject {
  id: string
  product_id: string
  script_segments: string[]
  selected_image_url: string
  status: string
  created_at: string
}

interface Product {
  id: string
  product_title: string
  product_description: string
  product_image_urls: string[]
  amazon_url: string
}

interface Video {
  id: string
  segment_number: number
  script_text: string
  status: string
  operation_name: string
  video_uri?: string
  error_message?: string
}

export default function VideoProjectPage({ params }: { params: { productId: string, videoProjectId: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [videoProject, setVideoProject] = useState<VideoProject | null>(null)
  const [product, setProduct] = useState<Product | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
      return
    }

    if (user) {
      loadProjectData()
    }
  }, [user, authLoading, params.productId, params.videoProjectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)

      // Load video project
      const { data: projectData, error: projectError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', params.videoProjectId)
        .eq('user_id', user?.id)
        .single()

      if (projectError) {
        setError('Video project not found')
        return
      }

      setVideoProject(projectData)

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

      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('video_project_id', params.videoProjectId)
        .order('segment_number')

      if (videosError) {
        console.error('Error loading videos:', videosError)
      } else {
        setVideos(videosData || [])
        
        // Start polling for videos that are still generating
        videosData?.forEach(video => {
          if (video.status === 'generating' && video.operation_name) {
            pollVideoStatus(video.operation_name, video.segment_number)
          }
        })
      }

    } catch (err) {
      setError('Failed to load project data')
      console.error('Load project error:', err)
    } finally {
      setLoading(false)
    }
  }

  const pollVideoStatus = async (operationName: string, segmentNumber: number) => {
    try {
      const response = await fetch(`/api/check-operation?operation=${encodeURIComponent(operationName)}`)
      const data = await response.json()
      
      if (data.status === 'completed') {
        // Update video record in database and local state
        await supabase
          .from('videos')
          .update({
            status: 'completed',
            video_uri: data.videoUri
          })
          .eq('video_project_id', params.videoProjectId)
          .eq('segment_number', segmentNumber)

        setVideos(prev => prev.map(video => 
          video.segment_number === segmentNumber 
            ? { ...video, status: 'completed', video_uri: data.videoUri }
            : video
        ))

        // Check if all videos are completed
        const allCompleted = videos.every(v => 
          v.segment_number === segmentNumber || v.status === 'completed'
        )
        
        if (allCompleted) {
          await supabase
            .from('videos')
            .update({ status: 'completed' })
            .eq('id', params.videoProjectId)
          
          setVideoProject(prev => prev ? { ...prev, status: 'completed' } : null)
        }

      } else if (data.status === 'error') {
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: data.error
          })
          .eq('video_project_id', params.videoProjectId)
          .eq('segment_number', segmentNumber)

        setVideos(prev => prev.map(video => 
          video.segment_number === segmentNumber 
            ? { ...video, status: 'failed', error_message: data.error }
            : video
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
      case 'failed': return 'bg-red-100 text-red-800'
      case 'generating': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
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
                UGC Video Project
              </h1>
              <p className="text-gray-600 mt-2">
                Status: <span className={`px-2 py-1 rounded text-xs ${getStatusColor(videoProject?.status || '')}`}>
                  {videoProject?.status || 'Unknown'}
                </span>
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
                  
                  {videoProject?.selected_image_url && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">Selected Image:</h3>
                      <div className="aspect-square max-w-xs rounded-xl overflow-hidden bg-gray-100">
                        <img 
                          src={videoProject.selected_image_url} 
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
                {videos.map((video) => (
                  <div key={video.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Video {video.segment_number}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(video.status)}`}>
                        {video.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      <strong>Script:</strong> {video.script_text}
                    </p>
                    
                    {video.status === 'completed' && video.video_uri && (
                      <div className="space-y-3">
                        <video 
                          src={getVideoSrc(video.video_uri)}
                          controls 
                          className="w-full rounded-lg shadow-sm"
                          style={{ maxHeight: '200px' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                        
                        <button
                          onClick={() => downloadVideo(video.video_uri!, video.segment_number)}
                          className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <span>📥</span>
                          Download
                        </button>
                      </div>
                    )}
                    
                    {video.status === 'failed' && video.error_message && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        Error: {video.error_message}
                      </div>
                    )}
                    
                    {video.status === 'generating' && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                        Generating video... This may take several minutes.
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {videoProject?.status === 'generating' && (
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Videos</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {videos.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {videos.filter(v => v.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">In Progress</span>
                  <span className="font-bold text-2xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                    {videos.filter(v => v.status === 'generating').length}
                  </span>
                </div>
              </div>
            </div>

            {videoProject?.script_segments && (
              <div className="bg-white rounded-3xl shadow-xl p-6 border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Script Segments</h3>
                <div className="space-y-3">
                  {videoProject.script_segments.map((segment: string, index: number) => (
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