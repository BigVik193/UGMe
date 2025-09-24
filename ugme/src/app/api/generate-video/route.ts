import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt, imageUrl } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    let imageData = null;
    
    // If imageUrl is provided, fetch and convert to base64
    if (imageUrl) {
      try {
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
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to process image URL' },
          { status: 400 }
        );
      }
    }

    // Start video generation operation using the correct API format
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

    console.log('Sending request to Veo API with payload:', JSON.stringify(generatePayload, null, 2));

    const generateResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/veo-3.0-generate-001:predictLongRunning',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GOOGLE_GEMINI_API_KEY
        },
        body: JSON.stringify(generatePayload)
      }
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Veo API Error:', {
        status: generateResponse.status,
        statusText: generateResponse.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: 'Failed to start video generation', details: errorText, status: generateResponse.status },
        { status: 500 }
      );
    }

    const operation = await generateResponse.json();
    
    // Return operation details for client to poll
    return NextResponse.json({
      operationName: operation.name,
      status: 'started',
      message: 'Video generation started. Use the operation name to check status.'
    });

  } catch (error) {
    console.error('Error in generate-video API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}