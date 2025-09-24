import { NextRequest, NextResponse } from 'next/server'
import { chromium, type Browser, type Page } from 'playwright'
import * as cheerio from 'cheerio'
import { supabaseAdmin } from '@/lib/supabase/server'

interface ScrapedProduct {
  title: string
  description: string
  imageUrls: string[]
}

async function scrapeAmazonProduct(url: string): Promise<ScrapedProduct> {
  console.log('scrapeAmazonProduct: Starting with URL:', url)
  let browser: Browser | null = null
  
  try {
    // Simple browser launch
    console.log('scrapeAmazonProduct: Launching browser...')
    browser = await chromium.launch({
      headless: true
    })

    const page: Page = await browser.newPage()
    console.log('scrapeAmazonProduct: Browser launched, navigating to page...')

    // Navigate to the Amazon product page
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    console.log('scrapeAmazonProduct: Navigation completed')

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
  console.log('=== SCRAPE-PRODUCT API ROUTE START ===')
  
  try {
    const { amazonUrl, userId } = await request.json()
    console.log('Amazon URL received:', amazonUrl)
    console.log('User ID received:', userId)

    if (!amazonUrl) {
      console.log('No Amazon URL provided')
      return NextResponse.json(
        { error: 'Amazon URL is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.log('No user ID provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      )
    }

    console.log('Using service role client for database operations')

    // Scrape the product
    console.log('Starting Amazon product scraping...')
    const scrapedData = await scrapeAmazonProduct(amazonUrl)
    console.log('Scraping completed. Data:', {
      title: scrapedData.title.substring(0, 100) + '...',
      descriptionLength: scrapedData.description.length,
      imageCount: scrapedData.imageUrls.length
    })

    // Save to database using service role client
    const { data: product, error: dbError } = await supabaseAdmin
      .from('products')
      .insert({
        user_id: userId,
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