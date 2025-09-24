'use client';

import { useState } from 'react';

interface VideoOperation {
  operationName: string;
  segmentNumber: number;
  prompt: string;
  status: string;
  videoUri?: string;
  error?: string;
}

export default function ThreeVideosGenerator() {
  const [prompts, setPrompts] = useState(['', '', '']);
  const [imageUrl, setImageUrl] = useState('');
  const [operations, setOperations] = useState<VideoOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [overallStatus, setOverallStatus] = useState('');

  const generateThreeVideos = async () => {
    if (prompts.some(p => !p.trim())) {
      setOverallStatus('All three prompts are required');
      return;
    }

    setLoading(true);
    setOverallStatus('Starting 3 video generations...');
    
    try {
      const response = await fetch('/api/generate-three-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: prompts.map(p => p.trim()),
          imageUrl: imageUrl || undefined
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setOperations(data.operations);
        setOverallStatus('All videos started! Checking progress...');
        
        // Start polling for all operations
        data.operations.forEach((op: VideoOperation) => {
          pollVideoStatus(op.operationName, op.segmentNumber);
        });
      } else {
        setOverallStatus(`Error: ${data.error}`);
        setLoading(false);
      }
    } catch (error) {
      setOverallStatus(`Error: ${error}`);
      setLoading(false);
    }
  };

  const pollVideoStatus = async (operationName: string, segmentNumber: number) => {
    try {
      const response = await fetch(`/api/check-operation?operation=${encodeURIComponent(operationName)}`);
      const data = await response.json();
      
      console.log(`Segment ${segmentNumber} status:`, data);
      
      if (data.status === 'completed') {
        updateOperationStatus(segmentNumber, {
          status: 'completed',
          videoUri: data.videoUri
        });
        checkAllCompleted();
      } else if (data.status === 'error') {
        updateOperationStatus(segmentNumber, {
          status: 'error',
          error: data.error
        });
        checkAllCompleted();
      } else {
        updateOperationStatus(segmentNumber, {
          status: 'generating'
        });
        // Poll again in 10 seconds
        setTimeout(() => pollVideoStatus(operationName, segmentNumber), 10000);
      }
    } catch (error) {
      console.error(`Error checking segment ${segmentNumber}:`, error);
      updateOperationStatus(segmentNumber, {
        status: 'error',
        error: `Polling error: ${error}`
      });
    }
  };

  const updateOperationStatus = (segmentNumber: number, updates: Partial<VideoOperation>) => {
    setOperations(prev => prev.map(op => 
      op.segmentNumber === segmentNumber 
        ? { ...op, ...updates }
        : op
    ));
  };

  const checkAllCompleted = () => {
    setOperations(prev => {
      const completedCount = prev.filter(op => op.status === 'completed').length;
      const errorCount = prev.filter(op => op.status === 'error').length;
      const totalCount = prev.length;
      
      if (completedCount + errorCount === totalCount) {
        setLoading(false);
        if (completedCount === totalCount) {
          setOverallStatus('🎉 All 3 videos completed successfully!');
        } else {
          setOverallStatus(`${completedCount} videos completed, ${errorCount} failed`);
        }
      } else {
        setOverallStatus(`Progress: ${completedCount}/${totalCount} videos completed`);
      }
      
      return prev;
    });
  };

  const updatePrompt = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const getVideoSrc = (videoUri: string) => {
    return `/api/download-video?uri=${encodeURIComponent(videoUri)}`;
  };

  const downloadVideo = (videoUri: string, segmentNumber: number) => {
    window.open(`/api/download-video?uri=${encodeURIComponent(videoUri)}&download=true`, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Generate 3 Videos Simultaneously</h1>
      <p className="text-gray-600 mb-8">
        Create three 8-second videos at the same time with different prompts. Each video will be generated independently.
      </p>
      
      <div className="space-y-6">
        {/* Image URL Input */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Image URL (optional - will be used for all 3 videos)
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-sm text-gray-600 mt-1">
            Optional: Same starting image will be used for all 3 videos
          </p>
        </div>

        {/* Three Prompt Inputs */}
        <div className="grid md:grid-cols-3 gap-6">
          {prompts.map((prompt, index) => (
            <div key={index}>
              <label className="block text-sm font-medium mb-2">
                Video {index + 1} Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => updatePrompt(index, e.target.value)}
                placeholder={`Describe video ${index + 1}...`}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
            </div>
          ))}
        </div>

        <button
          onClick={generateThreeVideos}
          disabled={loading || prompts.some(p => !p.trim())}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Generating 3 Videos...' : 'Generate All 3 Videos'}
        </button>

        {/* Overall Status */}
        {overallStatus && (
          <div className="p-4 bg-blue-100 rounded-lg">
            <h3 className="font-medium mb-2">Status:</h3>
            <p className="text-sm">{overallStatus}</p>
          </div>
        )}

        {/* Individual Video Results */}
        {operations.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {operations.map((operation) => (
              <div key={operation.segmentNumber} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Video {operation.segmentNumber}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(operation.status)}`}>
                    {operation.status}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {operation.prompt}
                </p>
                
                {operation.status === 'completed' && operation.videoUri && (
                  <div className="space-y-3">
                    <video 
                      src={getVideoSrc(operation.videoUri)}
                      controls 
                      className="w-full rounded-lg shadow-sm"
                      style={{ maxHeight: '200px' }}
                    >
                      Your browser does not support the video tag.
                    </video>
                    
                    <button
                      onClick={() => downloadVideo(operation.videoUri!, operation.segmentNumber)}
                      className="w-full bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                    >
                      <span>📥</span>
                      Download
                    </button>
                  </div>
                )}
                
                {operation.status === 'error' && operation.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    Error: {operation.error}
                  </div>
                )}
                
                {operation.status === 'generating' && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                    Generating video... This may take several minutes.
                  </div>
                )}
                
                {operation.operationName && (
                  <p className="text-xs text-gray-400 mt-2 truncate">
                    {operation.operationName}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How it Works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Enter three different prompts for three separate videos</li>
          <li>Optionally provide an image URL that will be used for all 3 videos</li>
          <li>All 3 videos are generated simultaneously (in parallel)</li>
          <li>Each video appears as it completes (they may finish at different times)</li>
          <li>View and download each video independently</li>
        </ol>
        <p className="text-sm text-gray-600 mt-4">
          <strong>Note:</strong> Each video is 8 seconds long and generated independently. This is faster than sequential generation.
        </p>
      </div>
    </div>
  );
}