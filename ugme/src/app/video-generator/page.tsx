'use client';

import { useState } from 'react';

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [operationName, setOperationName] = useState('');
  const [status, setStatus] = useState('');
  const [videoUri, setVideoUri] = useState('');
  const [loading, setLoading] = useState(false);

  const generateVideo = async () => {
    setLoading(true);
    setStatus('Starting video generation...');
    
    try {
      const response = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          imageUrl: imageUrl || undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setOperationName(data.operationName);
        setStatus('Video generation started. Checking status...');
        
        // Start polling for status
        pollStatus(data.operationName);
      } else {
        setStatus(`Error: ${data.error}`);
        setLoading(false);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
      setLoading(false);
    }
  };

  const pollStatus = async (opName: string) => {
    try {
      const response = await fetch(`/api/check-operation?operation=${encodeURIComponent(opName)}`);
      const data = await response.json();
      
      console.log('Check operation response:', data);
      
      if (data.status === 'completed') {
        setVideoUri(data.videoUri);
        setStatus('Video generation completed!');
        setLoading(false);
      } else if (data.status === 'error') {
        setStatus(`Error: ${JSON.stringify(data.error)}`);
        setLoading(false);
      } else {
        setStatus('Video generation in progress...');
        // Poll again in 10 seconds
        setTimeout(() => pollStatus(opName), 10000);
      }
    } catch (error) {
      setStatus(`Error checking status: ${error}`);
      setLoading(false);
    }
  };

  const downloadVideo = () => {
    if (videoUri) {
      window.open(`/api/download-video?uri=${encodeURIComponent(videoUri)}&download=true`, '_blank');
    }
  };

  const getVideoSrc = () => {
    if (videoUri) {
      return `/api/download-video?uri=${encodeURIComponent(videoUri)}`;
    }
    return '';
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Video Generator with Google Veo</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Video Prompt (required)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A cinematic shot of a majestic lion in the savannah..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Image URL (optional)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 mt-1">
            Optional: Provide an image URL to use as the starting frame for the video
          </p>
        </div>

        <button
          onClick={generateVideo}
          disabled={!prompt || loading}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Generating Video...' : 'Generate Video'}
        </button>

        {status && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium mb-2">Status:</h3>
            <p className="text-sm">{status}</p>
            {operationName && (
              <p className="text-xs text-gray-600 mt-2">
                Operation: {operationName}
              </p>
            )}
          </div>
        )}

        {videoUri && (
          <div className="p-4 bg-green-100 rounded-lg">
            <h3 className="font-medium mb-4">Video Ready!</h3>
            
            {/* Video Player */}
            <div className="mb-4">
              <video 
                src={getVideoSrc()}
                controls 
                className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                style={{ maxHeight: '400px' }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={downloadVideo}
                className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 flex items-center gap-2"
              >
                <span>📥</span>
                Download Video
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Get a Gemini API key from <a href="https://ai.google.dev/" className="text-blue-600 hover:underline">ai.google.dev</a></li>
          <li>Add it to your environment variables as <code className="bg-gray-200 px-1 rounded">GEMINI_API_KEY</code></li>
          <li>Restart your development server</li>
          <li>Enter a descriptive prompt and optionally an image URL</li>
          <li>Click "Generate Video" and wait for completion (can take several minutes)</li>
        </ol>
      </div>
    </div>
  );
}