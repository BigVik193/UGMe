import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUri = searchParams.get('uri');
    const download = searchParams.get('download') === 'true';

    if (!videoUri) {
      return NextResponse.json(
        { error: 'Video URI is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch the video from the provided URI
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': process.env.GOOGLE_GEMINI_API_KEY
      }
    });

    if (!videoResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch video' },
        { status: 500 }
      );
    }

    // Get the video buffer
    const videoBuffer = await videoResponse.arrayBuffer();

    // Determine headers based on whether it's for download or inline viewing
    const headers: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Content-Length': videoBuffer.byteLength.toString(),
      'Cache-Control': 'public, max-age=3600'
    };

    if (download) {
      // Force download
      headers['Content-Disposition'] = 'attachment; filename="generated-video.mp4"';
    } else {
      // Allow inline viewing
      headers['Content-Disposition'] = 'inline';
    }

    return new NextResponse(videoBuffer, { headers });

  } catch (error) {
    console.error('Error serving video:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}