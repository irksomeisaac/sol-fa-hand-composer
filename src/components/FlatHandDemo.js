/**
 * React Component Demo for Flat Hand Detection
 * Integrates MediaPipe Hand Tracking with Flat Hand Detection
 * Provides real-time feedback and visualization
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  detectFlatHand, 
  detectFlatHandMultiple, 
  getDetectionConfig,
  updateDetectionConfig 
} from '../utils/flatHandDetection.js';

const FlatHandDemo = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detectionResults, setDetectionResults] = useState([]);
  const [stats, setStats] = useState({
    totalFrames: 0,
    detectedFrames: 0,
    accuracy: 0
  });
  const [config, setConfig] = useState(getDetectionConfig());
  const [isRecording, setIsRecording] = useState(false);
  
  // MediaPipe hands instance
  const handsRef = useRef(null);
  
  // Initialize MediaPipe
  useEffect(() => {
    const initializeMediaPipe = async () => {
      try {
        // Check if MediaPipe is available
        if (typeof window.Hands === 'undefined') {
          throw new Error('MediaPipe library not loaded. Please include MediaPipe hands library.');
        }
        
        const hands = new window.Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });
        
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        
        hands.onResults(onResults);
        handsRef.current = hands;
        
        await initializeCamera();
        setIsLoading(false);
        
      } catch (err) {
        setError(`Failed to initialize: ${err.message}`);
        setIsLoading(false);
      }
    };
    
    initializeMediaPipe();
  }, []);
  
  // Initialize camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          startDetection();
        };
      }
    } catch (err) {
      setError(`Camera access denied: ${err.message}`);
    }
  };
  
  // Start detection loop
  const startDetection = () => {
    const detectFrame = async () => {
      if (videoRef.current && handsRef.current && isRecording) {
        await handsRef.current.send({ image: videoRef.current });
      }
      requestAnimationFrame(detectFrame);
    };
    detectFrame();
  };
  
  // Handle MediaPipe results
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Process hand detection
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const detections = detectFlatHandMultiple(results);
      setDetectionResults(detections);
      
      // Update stats
      setStats(prev => ({
        totalFrames: prev.totalFrames + 1,
        detectedFrames: prev.detectedFrames + (detections.some(d => d.isFlatHand) ? 1 : 0),
        accuracy: ((prev.detectedFrames + (detections.some(d => d.isFlatHand) ? 1 : 0)) / (prev.totalFrames + 1) * 100).toFixed(2)
      }));
      
      // Draw hand landmarks and detection results
      drawHandResults(ctx, results, detections);
    } else {
      setDetectionResults([]);
      setStats(prev => ({
        ...prev,
        totalFrames: prev.totalFrames + 1
      }));
    }
  }, []);
  
  // Draw hand landmarks and detection feedback
  const drawHandResults = (ctx, results, detections) => {
    results.multiHandLandmarks.forEach((landmarks, index) => {
      const detection = detections[index];
      const handedness = results.multiHandedness[index]?.label || 'Unknown';
      
      // Draw hand landmarks
      drawLandmarks(ctx, landmarks, detection.isFlatHand);
      
      // Draw detection feedback
      drawDetectionFeedback(ctx, landmarks, detection, handedness, index);
    });
  };
  
  // Draw hand landmarks
  const drawLandmarks = (ctx, landmarks, isFlat) => {
    const canvas = canvasRef.current;
    
    // Draw connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17] // Palm connections
    ];
    
    ctx.strokeStyle = isFlat ? '#00FF00' : '#FF6B6B';
    ctx.lineWidth = 2;
    
    connections.forEach(([start, end]) => {
      const startPoint = landmarks.landmark[start];
      const endPoint = landmarks.landmark[end];
      
      ctx.beginPath();
      ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
      ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
      ctx.stroke();
    });
    
    // Draw landmark points
    ctx.fillStyle = isFlat ? '#00AA00' : '#CC4444';
    landmarks.landmark.forEach(landmark => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * canvas.width,
        landmark.y * canvas.height,
        3,
        0,
        2 * Math.PI
      );
      ctx.fill();
    });
  };
  
  // Draw detection feedback
  const drawDetectionFeedback = (ctx, landmarks, detection, handedness, index) => {
    const canvas = canvasRef.current;
    const wrist = landmarks.landmark[0];
    const x = wrist.x * canvas.width;
    const y = wrist.y * canvas.height - 50;
    
    // Background for text
    ctx.fillStyle = detection.isFlatHand ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 107, 107, 0.8)';
    ctx.fillRect(x - 60, y - 25, 120, 50);
    
    // Text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    const status = detection.isFlatHand ? 'FLAT HAND' : 'NOT FLAT';
    const confidence = `${(detection.confidence * 100).toFixed(1)}%`;
    
    ctx.fillText(`${handedness} Hand`, x, y - 5);
    ctx.fillText(`${status}`, x, y + 10);
    ctx.fillText(`${confidence}`, x, y + 25);
  };
  
  // Configuration handlers
  const updateConfigValue = (key, value) => {
    const newConfig = { ...config, [key]: parseFloat(value) };
    setConfig(newConfig);
    updateDetectionConfig(newConfig);
  };
  
  // Toggle recording
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };
  
  // Reset stats
  const resetStats = () => {
    setStats({ totalFrames: 0, detectedFrames: 0, accuracy: 0 });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading MediaPipe...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <strong>Error:</strong> {error}
      </div>
    );
  }
  
  return (
    <div className="flat-hand-demo p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
        Flat Hand Detection Demo
      </h1>
      
      {/* Control Panel */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={toggleRecording}
            className={`px-6 py-2 rounded font-semibold ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRecording ? 'Stop Detection' : 'Start Detection'}
          </button>
          
          <button
            onClick={resetStats}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
          >
            Reset Stats
          </button>
          
          {/* Statistics */}
          <div className="flex gap-4 text-sm">
            <span>Frames: {stats.totalFrames}</span>
            <span>Detected: {stats.detectedFrames}</span>
            <span>Accuracy: {stats.accuracy}%</span>
          </div>
        </div>
      </div>
      
      {/* Video and Canvas */}
      <div className="flex flex-wrap lg:flex-nowrap gap-6">
        <div className="flex-1">
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-auto"
              playsInline
              muted
              style={{ display: 'none' }}
            />
            <canvas
              ref={canvasRef}
              className="w-full h-auto"
            />
            
            {/* Status Overlay */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white px-3 py-2 rounded">
              Status: {isRecording ? 'Detecting...' : 'Stopped'}
            </div>
          </div>
        </div>
        
        {/* Side Panel */}
        <div className="w-full lg:w-80 space-y-4">
          {/* Detection Results */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Detection Results</h3>
            {detectionResults.length > 0 ? (
              <div className="space-y-3">
                {detectionResults.map((result, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded ${
                      result.isFlatHand ? 'bg-green-100' : 'bg-red-100'
                    }`}
                  >
                    <div className="font-medium">
                      Hand {index + 1}: {result.details?.handedness || 'Unknown'}
                    </div>
                    <div className="text-sm">
                      Status: {result.isFlatHand ? '✅ Flat Hand' : '❌ Not Flat'}
                    </div>
                    <div className="text-sm">
                      Confidence: {(result.confidence * 100).toFixed(1)}%
                    </div>
                    
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-sm cursor-pointer">Details</summary>
                        <div className="mt-1 text-xs space-y-1">
                          <div>All Fingers: {result.summary?.allFingersExtended ? '✅' : '❌'}</div>
                          <div>Palm Facing: {result.summary?.palmFacingCamera ? '✅' : '❌'}</div>
                          <div>Finger Spread: {result.summary?.fingerSpread ? '✅' : '❌'}</div>
                          <div>Valid Size: {result.summary?.validSize ? '✅' : '❌'}</div>
                          <div>Not Kodály: {result.summary?.notKodaly ? '✅' : '❌'}</div>
                          {result.details.kodalyAnalysis?.detectedSigns?.length > 0 && (
                            <div>Kodály Signs: {result.details.kodalyAnalysis.detectedSigns.join(', ')}</div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">
                No hands detected
              </div>
            )}
          </div>
          
          {/* Configuration */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold mb-3">Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Confidence: {config.MIN_CONFIDENCE}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={config.MIN_CONFIDENCE}
                  onChange={(e) => updateConfigValue('MIN_CONFIDENCE', e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Finger Extension Threshold: {config.FINGER_EXTENSION_THRESHOLD}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={config.FINGER_EXTENSION_THRESHOLD}
                  onChange={(e) => updateConfigValue('FINGER_EXTENSION_THRESHOLD', e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Palm Facing Score: {config.MIN_PALM_FACING_SCORE}
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="1"
                  step="0.05"
                  value={config.MIN_PALM_FACING_SCORE}
                  onChange={(e) => updateConfigValue('MIN_PALM_FACING_SCORE', e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Palm Tilt: {config.MAX_PALM_TILT_ANGLE}°
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={config.MAX_PALM_TILT_ANGLE}
                  onChange={(e) => updateConfigValue('MAX_PALM_TILT_ANGLE', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-800">Instructions</h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>• Show your palm facing the camera</p>
              <p>• Extend all five fingers</p>
              <p>• Keep hand straight (avoid tilting)</p>
              <p>• Green indicates flat hand detected</p>
              <p>• Red indicates other gestures (including Kodály signs)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlatHandDemo;
