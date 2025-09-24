import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase-server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function selectBestImage(imageUrls: string[]): Promise<{ url: string; index: number; reasoning: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Select the best image for UGC video from these ${imageUrls.length} images. Return JSON: {"selectedImageIndex": <number>, "reasoning": "<brief explanation>"}`
            },
            ...imageUrls.map((imageUrl) => ({
              type: "image_url" as const,
              image_url: {
                url: imageUrl,
                detail: "low" as const
              }
            }))
          ]
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      const parsed = JSON.parse(content)
      return {
        url: imageUrls[parsed.selectedImageIndex] || imageUrls[0],
        index: parsed.selectedImageIndex || 0,
        reasoning: parsed.reasoning || 'Selected based on quality'
      }
    }
  } catch (error) {
    console.error('Image selection error:', error)
  }
  
  // Fallback
  return {
    url: imageUrls[0],
    index: 0,
    reasoning: 'Selected first image as fallback'
  }
}

async function generateScriptSegments(productTitle: string, productDescription: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3 UGC script segments (8 seconds each) for: ${productTitle}. Description: ${productDescription}. Return JSON array: ["segment1", "segment2", "segment3"]`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      const segments = JSON.parse(content)
      if (Array.isArray(segments) && segments.length === 3) {
        return segments
      }
    }
  } catch (error) {
    console.error('Script generation error:', error)
  }

  // Fallback scripts
  return [
    `Hey guys, I just got this amazing ${productTitle}!`,
    "It's so cool and works perfectly for what I need.",
    "You should definitely check it out - link in my bio!"
  ]
}

export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Get user from session
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get product from database
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', session.user.id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Select best image and generate scripts
    const selectedImage = await selectBestImage(product.product_image_urls || [])
    const scriptSegments = await generateScriptSegments(
      product.product_title || 'product',
      product.product_description || ''
    )

    // Update product in database
    await supabase
      .from('products')
      .update({
        selected_image_url: selectedImage.url,
        script_segments: scriptSegments,
        script_generation_status: 'completed'
      })
      .eq('id', productId)

    return NextResponse.json({
      success: true,
      selectedImage,
      scriptSegments
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate scripts and select image' },
      { status: 500 }
    )
  }
}