import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATE VIDEO PROJECT API CALLED ===')
    const body = await request.json()
    console.log('Request body:', body)
    
    const { productId, userId } = body

    if (!productId || !userId) {
      console.log('Missing required fields - productId:', productId, 'userId:', userId)
      return NextResponse.json(
        { error: 'Product ID and User ID are required' },
        { status: 400 }
      )
    }

    // Get product from database to validate and get script data
    console.log('Querying product with productId:', productId, 'userId:', userId)
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', userId)
      .single()

    console.log('Product query result - data:', product, 'error:', productError)

    if (productError || !product) {
      console.log('Product not found or error:', productError)
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    console.log('Product script_segments:', product.script_segments)
    console.log('Product selected_image_url:', product.selected_image_url)

    if (!product.script_segments || !product.selected_image_url) {
      console.log('Missing script segments or selected image URL')
      return NextResponse.json(
        { error: 'Product must have scripts generated first' },
        { status: 400 }
      )
    }

    // Start video generation with Google Veo (no database records yet)
    console.log('Starting video generation with dialogues:', product.script_segments)
    console.log('Using image URL:', product.selected_image_url)
    
    const videoPayload = {
      dialogues: product.script_segments,
      imageUrl: product.selected_image_url
    }
    console.log('Video generation payload:', videoPayload)
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/api/generate-three-videos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(videoPayload),
    })

    console.log('Video generation response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('Video generation error:', errorText)
      return NextResponse.json(
        { error: 'Failed to start video generation', details: errorText },
        { status: 500 }
      )
    }

    const videoGenerationResult = await response.json()
    console.log('Video generation result:', videoGenerationResult)

    console.log('API returning success response')
    return NextResponse.json({
      success: true,
      productId: productId,
      operations: videoGenerationResult.operations,
      scriptSegments: product.script_segments,
      selectedImageUrl: product.selected_image_url
    })

  } catch (error) {
    console.error('=== CREATE VIDEO PROJECT API ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('Full error object:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}