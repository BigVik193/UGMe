import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get('operation');

    if (!operationName) {
      return NextResponse.json(
        { error: 'Operation name is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Check operation status
    const statusResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}`,
      {
        headers: {
          'x-goog-api-key': process.env.GOOGLE_GEMINI_API_KEY
        }
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      return NextResponse.json(
        { error: 'Failed to check operation status', details: errorText },
        { status: 500 }
      );
    }

    const operation = await statusResponse.json();
    
    console.log('Full operation response:', JSON.stringify(operation, null, 2));

    if (operation.done) {
      if (operation.error) {
        return NextResponse.json({
          status: 'error',
          error: operation.error
        });
      }

      // Operation completed successfully - handle both response formats
      let videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      // Try alternative response format from predictLongRunning
      if (!videoUri) {
        videoUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      }
      
      console.log('Operation response:', JSON.stringify(operation, null, 2));
      console.log('Extracted video URI:', videoUri);
      
      return NextResponse.json({
        status: 'completed',
        videoUri: videoUri,
        operation: operation
      });
    } else {
      // Operation still in progress
      return NextResponse.json({
        status: 'in_progress',
        message: 'Video generation is still in progress'
      });
    }

  } catch (error) {
    console.error('Error checking operation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}