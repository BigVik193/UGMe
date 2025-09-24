import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for concatenated videos (in production, use Redis or database)
const concatenatedVideos = new Map<string, Buffer>();

export async function POST(request: NextRequest) {
  try {
    const { videoUris, sessionId } = await request.json();

    if (!videoUris || !Array.isArray(videoUris) || videoUris.length !== 3) {
      return NextResponse.json(
        { error: 'Exactly 3 video URIs are required' },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log(`Starting video concatenation for session ${sessionId}`);
    
    // Download all videos
    const videoBuffers: ArrayBuffer[] = [];
    
    for (let i = 0; i < videoUris.length; i++) {
      const videoUri = videoUris[i];
      console.log(`Downloading video ${i + 1}...`);
      
      // Fetch video from URI
      const videoResponse = await fetch(videoUri, {
        headers: {
          'x-goog-api-key': process.env.GOOGLE_GEMINI_API_KEY
        }
      });

      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video ${i + 1}: ${videoResponse.status} ${videoResponse.statusText}`);
      }

      const videoBuffer = await videoResponse.arrayBuffer();
      videoBuffers.push(videoBuffer);
      console.log(`Downloaded video ${i + 1}: ${videoBuffer.byteLength} bytes`);
    }

    console.log('Starting video concatenation with Mediabunny...');

    // Import Mediabunny classes dynamically
    const { Input, Output, Mp4OutputFormat, BufferTarget, BufferSource, VideoSampleSource, ALL_FORMATS } = await import('mediabunny');

    // Create output target and format
    const target = new BufferTarget();
    const format = new Mp4OutputFormat();
    const output = new Output({ target, format });

    // Create a video sample source for encoding
    const videoSource = new VideoSampleSource({
      codec: 'avc', // H.264
      bitrate: 1e6  // 1 Mbps
    });

    output.addVideoTrack(videoSource);
    output.start();

    let currentTimestamp = 0; // Track cumulative time

    // Process each video file sequentially
    for (let i = 0; i < videoBuffers.length; i++) {
      console.log(`Processing video ${i + 1}...`);
      
      // Create input from buffer using BufferSource
      const input = new Input({
        formats: ALL_FORMATS,
        source: new BufferSource(videoBuffers[i])
      });

      // Get primary video track
      const videoTrack = await input.getPrimaryVideoTrack();
      
      // Get video samples and add them to the output with adjusted timestamps
      const { VideoSampleSink } = await import('mediabunny');
      const sampleSink = new VideoSampleSink(videoTrack);
      
      let sampleCount = 0;
      for await (const sample of sampleSink.samples()) {
        // Adjust timestamp by adding total duration from previous videos
        const adjustedSample = {
          ...sample,
          timestamp: sample.timestamp + (currentTimestamp * 1000000) // Convert seconds to microseconds
        };
        
        await videoSource.add(adjustedSample);
        sample.close(); // Important: close samples to free memory
        
        sampleCount++;
        if (sampleCount % 30 === 0) {
          console.log(`Added ${sampleCount} samples from video ${i + 1}`);
        }
      }
      
      // Update current timestamp for next video
      const videoDuration = await videoTrack.computeDuration();
      currentTimestamp += videoDuration;
      
      console.log(`Completed video ${i + 1}, added ${sampleCount} samples. Total time: ${currentTimestamp}s`);
    }

    // Finalize the output
    console.log('Finalizing concatenated video...');
    await output.finalize();
    
    // Store the concatenated video buffer
    concatenatedVideos.set(sessionId, Buffer.from(target.buffer));

    console.log(`Video concatenation completed! Total duration: ${currentTimestamp}s, Size: ${target.buffer.byteLength} bytes`);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Videos concatenated successfully',
      sessionId
    });

  } catch (error) {
    console.error('Error concatenating videos:', error);
    
    return NextResponse.json(
      { error: 'Failed to concatenate videos' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const concatenatedBuffer = concatenatedVideos.get(sessionId);

    if (!concatenatedBuffer) {
      return NextResponse.json(
        { error: 'Concatenated video not found or expired' },
        { status: 404 }
      );
    }

    // Return the concatenated video for download
    const headers = {
      'Content-Type': 'video/mp4',
      'Content-Length': concatenatedBuffer.byteLength.toString(),
      'Content-Disposition': 'attachment; filename="concatenated-video.mp4"',
      'Cache-Control': 'no-cache'
    };

    // Clean up from memory after serving
    concatenatedVideos.delete(sessionId);

    return new NextResponse(concatenatedBuffer, { headers });

  } catch (error) {
    console.error('Error serving concatenated video:', error);
    return NextResponse.json(
      { error: 'Failed to serve concatenated video' },
      { status: 500 }
    );
  }
}