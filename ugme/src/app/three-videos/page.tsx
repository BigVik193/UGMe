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
  const [character, setCharacter] = useState('A friendly, tall white-furred Yeti dressed casually, green hoodie, sneakers, etc, walking in a field/green area in a city. He is holding the toy from the attached image.');
  const [camera, setCamera] = useState('POV handheld selfie shot, camera held at arm\'s length, slight natural shake as the Yeti strolls forward through the room.');
  const [dialogues, setDialogues] = useState(['', '', '']);
  const [imageUrl, setImageUrl] = useState('');
  const [operations, setOperations] = useState<VideoOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [overallStatus, setOverallStatus] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [concatenationStatus, setConcatenationStatus] = useState<'idle' | 'concatenating' | 'ready' | 'error'>('idle');

  const generateThreeVideos = async () => {
    if (!character.trim() || !camera.trim() || dialogues.some(d => !d.trim())) {
      setOverallStatus('Character, camera, and all three dialogues are required');
      return;
    }

    // Combine character, camera, and dialogue into full prompts
    const fullPrompts = dialogues.map(dialogue => 
      `Character: ${character}\nCamera: ${camera}\nDialogue: ${dialogue}`
    );

    setLoading(true);
    setOverallStatus('Starting 3 video generations...');
    setConcatenationStatus('idle');
    
    // Generate a unique session ID for this batch
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    
    try {
      const response = await fetch('/api/generate-three-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dialogues: dialogues,
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
          // Automatically start concatenation
          startConcatenation(prev);
        } else {
          setOverallStatus(`${completedCount} videos completed, ${errorCount} failed`);
        }
      } else {
        setOverallStatus(`Progress: ${completedCount}/${totalCount} videos completed`);
      }
      
      return prev;
    });
  };

  const startConcatenation = async (completedOperations: VideoOperation[]) => {
    try {
      setConcatenationStatus('concatenating');
      setOverallStatus('🎬 Concatenating videos into one file...');
      
      // Get video URIs in order (1, 2, 3)
      const videoUris = completedOperations
        .sort((a, b) => a.segmentNumber - b.segmentNumber)
        .map(op => op.videoUri)
        .filter(uri => uri); // Filter out any undefined URIs
      
      if (videoUris.length !== 3) {
        throw new Error('Not all videos are available for concatenation');
      }

      const response = await fetch('/api/concatenate-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUris,
          sessionId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setConcatenationStatus('ready');
        setOverallStatus('✨ All videos combined! Ready to download.');
      } else {
        throw new Error(data.error || 'Failed to concatenate videos');
      }
    } catch (error) {
      console.error('Concatenation error:', error);
      setConcatenationStatus('error');
      setOverallStatus(`❌ Error combining videos: ${error}`);
    }
  };

  const downloadConcatenatedVideo = () => {
    if (sessionId && concatenationStatus === 'ready') {
      window.open(`/api/concatenate-videos?sessionId=${encodeURIComponent(sessionId)}`, '_blank');
      setConcatenationStatus('idle'); // Reset after download
    }
  };

  const updateDialogue = (index: number, value: string) => {
    const newDialogues = [...dialogues];
    newDialogues[index] = value;
    setDialogues(newDialogues);
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

        {/* Character Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Character Description (used for all 3 videos)
          </label>
          <textarea
            value={character}
            onChange={(e) => setCharacter(e.target.value)}
            placeholder="Describe the character, their appearance, clothing, actions..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* Camera Description */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Camera Setup (used for all 3 videos)
          </label>
          <textarea
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            placeholder="Describe the camera angle, movement, shot type..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={2}
          />
        </div>

        {/* Three Dialogue Inputs */}
        <div>
          <label className="block text-sm font-medium mb-4">
            Dialogue for Each Video
          </label>
          <div className="grid md:grid-cols-3 gap-4">
            {dialogues.map((dialogue, index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-2">
                  Video {index + 1} Dialogue
                </label>
                <textarea
                  value={dialogue}
                  onChange={(e) => updateDialogue(index, e.target.value)}
                  placeholder={`What the character says in video ${index + 1}...`}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={generateThreeVideos}
          disabled={loading || !character.trim() || !camera.trim() || dialogues.some(d => !d.trim())}
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

        {/* Concatenated Video Download */}
        {concatenationStatus !== 'idle' && (
          <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
            <h3 className="text-xl font-semibold mb-4 text-center">Combined Video</h3>
            
            {concatenationStatus === 'concatenating' && (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-purple-700">Combining all 3 videos into one file...</p>
              </div>
            )}
            
            {concatenationStatus === 'ready' && (
              <div className="text-center">
                <div className="mb-4">
                  <span className="text-4xl">🎬</span>
                  <p className="text-green-700 font-medium mt-2">Your combined video is ready!</p>
                  <p className="text-sm text-gray-600 mt-1">All 3 videos have been seamlessly combined in order</p>
                </div>
                <button
                  onClick={downloadConcatenatedVideo}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-8 rounded-lg hover:from-purple-700 hover:to-blue-700 font-medium text-lg shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3 mx-auto"
                >
                  <span>📥</span>
                  Download Combined Video
                </button>
              </div>
            )}
            
            {concatenationStatus === 'error' && (
              <div className="text-center">
                <span className="text-4xl">❌</span>
                <p className="text-red-700 font-medium mt-2">Error combining videos</p>
                <p className="text-sm text-gray-600 mt-1">You can still download individual videos below</p>
              </div>
            )}
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
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  <strong>Dialogue:</strong> {dialogues[operation.segmentNumber - 1]}
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
          <li>Set up your <strong>Character</strong> description (appearance, clothing, actions)</li>
          <li>Define the <strong>Camera</strong> setup (angle, movement, shot type)</li>
          <li>Enter three different <strong>Dialogues</strong> for each video segment</li>
          <li>Optionally provide an image URL for visual reference</li>
          <li>All 3 videos generate simultaneously with the same character and camera but different dialogue</li>
          <li>Each video appears as it completes and can be viewed/downloaded independently</li>
          <li><strong>🎬 NEW:</strong> Once all videos complete, they automatically combine into one seamless video for easy download!</li>
        </ol>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Prompt Structure Example:</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Character:</strong> A friendly Yeti in green hoodie walking in a city field...</p>
            <p><strong>Camera:</strong> POV handheld selfie shot, natural shake as character moves...</p>
            <p><strong>Dialogue:</strong> "Hey guys, I just bought these cool action figures."</p>
          </div>
        </div>
      </div>
    </div>
  );
}