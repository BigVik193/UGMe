import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompts, imageUrl } = await request.json();

    if (!prompts || !Array.isArray(prompts) || prompts.length !== 3) {
      return NextResponse.json(
        { error: 'Exactly 3 prompts are required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Generate all 3 videos in parallel
    const videoPromises = prompts.map((prompt, index) => 
      generateSingleVideo(prompt, imageUrl, index + 1)
    );

    const operations = await Promise.all(videoPromises);

    return NextResponse.json({
      operations,
      status: 'started',
      message: 'All 3 video generations started'
    });

  } catch (error) {
    console.error('Error in generate-three-videos API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateSingleVideo(prompt: string, imageUrl?: string, segmentNumber?: number) {
  let imageData = null;
  
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

  if (!generateResponse.ok) {
    const errorText = await generateResponse.text();
    console.error(`Veo API Error for segment ${segmentNumber}:`, {
      status: generateResponse.status,
      statusText: generateResponse.statusText,
      error: errorText
    });
    throw new Error(`Failed to start video generation for segment ${segmentNumber}`);
  }

  const operation = await generateResponse.json();
  
  return {
    operationName: operation.name,
    segmentNumber,
    prompt,
    status: 'started'
  };
}