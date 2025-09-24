import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function selectFirstImage(imageUrls: string[]): { url: string; index: number; reasoning: string } {
  return {
    url: imageUrls[0] || '',
    index: 0,
    reasoning: 'Selected first image from list'
  }
}

async function generateScriptSegments(productTitle: string, productDescription: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Create 3 UGC script segments (8 seconds each) for: ${productTitle}. Description: ${productDescription}. Use a general name for the item instead of the exact Amazon product name since each segment must be said in 8 seconds aka max 12 words. Return JSON array: ["segment1", "segment2", "segment3"]`
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      // Remove markdown code blocks if present
      let cleanContent = content.trim()
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
      }
      
      console.log('Cleaned content for JSON parsing:', cleanContent)
      
      const segments = JSON.parse(cleanContent)
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
    const { productId, userId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      )
    }

    // Get product from database using service role
    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', userId)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Select first image and generate scripts
    const selectedImage = selectFirstImage(product.product_image_urls || [])
    const scriptSegments = await generateScriptSegments(
      product.product_title || 'product',
      product.product_description || ''
    )

    // Update product in database using service role
    await supabaseAdmin
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