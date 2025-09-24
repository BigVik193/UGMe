import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

async function generateThreeVideos(dialogues: string[], imageUrl: string) {
  console.log('=== GENERATING THREE VIDEOS ===')
  console.log('Dialogues:', dialogues)
  console.log('Image URL:', imageUrl)
  
  if (!dialogues || !Array.isArray(dialogues) || dialogues.length !== 3) {
    console.log('Invalid dialogues:', dialogues)
    throw new Error('Exactly 3 dialogues are required')
  }

  // Hardcoded character and camera setup
  const character = 'A friendly, tall white-furred Yeti dressed casually, green hoodie, sneakers, etc, walking in a field/green area in a city. He is holding the toy from the attached image.';
  const camera = 'POV handheld selfie shot, camera held at arm\'s length, slight natural shake as the Yeti strolls forward through the room.';

  // Combine character, camera, and each dialogue into full prompts
  const fullPrompts = dialogues.map((dialogue: string) => 
    `Character: ${character}\nCamera: ${camera}\nDialogue: ${dialogue}`
  );

  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    console.log('GOOGLE_GEMINI_API_KEY not configured')
    throw new Error('GOOGLE_GEMINI_API_KEY not configured')
  }

  console.log('Generated full prompts:', fullPrompts)

  // Generate all 3 videos in parallel
  console.log('Starting video generation for 3 prompts...')
  const videoPromises = fullPrompts.map((prompt, index) => 
    generateSingleVideo(prompt, imageUrl, index + 1)
  );

  console.log('Waiting for all video operations to complete...')
  const operations = await Promise.all(videoPromises);
  console.log('All operations completed:', operations)

  return {
    operations,
    status: 'started',
    message: 'All 3 video generations started'
  };
}

async function generateSingleVideo(prompt: string, imageUrl?: string, segmentNumber?: number) {
  console.log(`=== GENERATING SINGLE VIDEO ${segmentNumber} ===`)
  console.log('Prompt:', prompt)
  console.log('Image URL:', imageUrl)
  
  let imageData = null;
  
  if (imageUrl) {
    try {
      console.log(`Fetching image for segment ${segmentNumber}...`)
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/png';
      
      imageData = {
        imageBytes: base64Image,
        mimeType: contentType
      };
      console.log(`Image processed for segment ${segmentNumber}, size:`, base64Image.length)
    } catch (error) {
      console.warn(`Failed to process image for segment ${segmentNumber}:`, error);
    }
  }

  const instance: any = {
    prompt: prompt
  };

  if (imageData) {
    instance.image = {
      bytesBase64Encoded: imageData.imageBytes,
      mimeType: imageData.mimeType
    };
  }

  const generatePayload = {
    instances: [instance]
  };

  console.log(`Sending request for segment ${segmentNumber}:`, JSON.stringify(generatePayload, null, 2));

  console.log(`Calling Veo API for segment ${segmentNumber}...`)
  const generateResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001:predictLongRunning',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GOOGLE_GEMINI_API_KEY!
      },
      body: JSON.stringify(generatePayload)
    }
  );

  console.log(`Veo API response for segment ${segmentNumber}:`, generateResponse.status, generateResponse.statusText)

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error(`Veo API Error for segment ${segmentNumber}:`, {
      status: generateResponse.status,
      statusText: generateResponse.statusText,
      error: errorText
    });
    throw new Error(`Failed to start video generation for segment ${segmentNumber}: ${errorText}`);
  }

  const operation = await generateResponse.json();
  console.log(`Operation created for segment ${segmentNumber}:`, operation.name)
  
  return {
    operationName: operation.name,
    segmentNumber,
    prompt,
    status: 'started'
  };
}

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
    
    try {
      const videoGenerationResult = await generateThreeVideos(product.script_segments, product.selected_image_url)
      console.log('Video generation result:', videoGenerationResult)

      console.log('API returning success response')
      return NextResponse.json({
        success: true,
        productId: productId,
        operations: videoGenerationResult.operations,
        scriptSegments: product.script_segments,
        selectedImageUrl: product.selected_image_url
      })
    } catch (videoError) {
      console.log('Video generation error:', videoError)
      return NextResponse.json(
        { error: 'Failed to start video generation', details: videoError instanceof Error ? videoError.message : 'Unknown error' },
        { status: 500 }
      )
    }

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