import { NextRequest, NextResponse } from 'next/server'
import { chromium, type Browser, type Page } from 'playwright'
import * as cheerio from 'cheerio'
import { createClient } from '@/lib/supabase-server'

interface ScrapedProduct {
  title: string
  description: string
  imageUrls: string[]
}

async function scrapeAmazonProduct(url: string): Promise<ScrapedProduct> {
  let browser: Browser | null = null
  
  try {
    // Simple browser launch
    browser = await chromium.launch({
      headless: true
    })

    const page: Page = await browser.newPage()

    // Navigate to the Amazon product page
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    })

    // Get page content
    const content = await page.content()
    const $ = cheerio.load(content)

    // Extract product title
    const title = 
      $('#productTitle').text().trim() ||
      $('h1').first().text().trim() ||
      'Product Title'

    // Extract product description
    const description = 
      $('#feature-bullets ul').text().replace(/\s+/g, ' ').trim() ||
      $('#productDescription p').text().trim() ||
      'Product description'

    // Extract product images
    const imageUrls: string[] = []
    
    // Simple image extraction
    $('#landingImage, .a-dynamic-image, #altImages img').each((_, element) => {
      const src = $(element).attr('src') || $(element).attr('data-old-hires')
      if (src && src.includes('images-amazon') && !imageUrls.includes(src)) {
        imageUrls.push(src)
      }
    })

    return {
      title: title.substring(0, 500),
      description: description.substring(0, 2000),
      imageUrls: imageUrls.slice(0, 10) // Limit to 10 images
    }

  } catch (error) {
    console.error('Scraping error:', error)
    throw new Error('Failed to scrape Amazon product')
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { amazonUrl } = await request.json()

    if (!amazonUrl) {
      return NextResponse.json(
        { error: 'Amazon URL is required' },
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

    // Scrape the product
    const scrapedData = await scrapeAmazonProduct(amazonUrl)

    // Save to database
    const { data: product, error: dbError } = await supabase
      .from('products')
      .insert({
        user_id: session.user.id,
        amazon_url: amazonUrl,
        product_title: scrapedData.title,
        product_description: scrapedData.description,
        product_image_urls: scrapedData.imageUrls,
        status: 'processed'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save product data' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        title: product.product_title,
        description: product.product_description,
        imageUrls: product.product_image_urls,
        amazonUrl: product.amazon_url
      }
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to process Amazon product URL' },
      { status: 500 }
    )
  }
}