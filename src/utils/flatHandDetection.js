/**
 * Flat Hand Detection System for MediaPipe Hand Landmarks
 * Detects when a hand is in "high five" position - all fingers extended, palm facing camera
 * Distinguishes from Kodály hand signs through comprehensive validation
 * 
 * Author: AI Assistant
 * Date: 2025-11-11
 */

// MediaPipe hand landmark indices
const HAND_LANDMARKS = {
  WRIST: 0,
  
  // Thumb
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  
  // Index finger
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  
  // Middle finger
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  
  // Ring finger
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  
  // Pinky
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20
};

/**
 * Configuration object for flat hand detection
 */
const DETECTION_CONFIG = {
  // Minimum confidence threshold for detection
  MIN_CONFIDENCE: 0.7,
  
  // Finger extension thresholds
  FINGER_EXTENSION_THRESHOLD: 0.85, // How extended fingers must be (0-1)
  THUMB_EXTENSION_THRESHOLD: 0.8,   // Thumb has different geometry
  
  // Palm orientation thresholds
  MAX_PALM_TILT_ANGLE: 30,          // Maximum degrees of tilt from vertical
  MIN_PALM_FACING_SCORE: 0.7,       // How directly palm must face camera
  
  // Hand positioning thresholds
  MIN_HAND_SIZE: 0.1,               // Minimum relative hand size in frame
  MAX_HAND_SIZE: 0.9,               // Maximum relative hand size in frame
  
  // Finger spread validation
  MIN_FINGER_SPREAD: 0.15,          // Minimum spread between fingers
  MAX_FINGER_CURL: 0.2,             // Maximum curl allowed in extended fingers
  
  // Kodály sign discrimination thresholds
  MAX_KODALY_FINGER_CURL: 0.6,      // Max curl before it's definitely not Kodály
  MIN_KODALY_ASYMMETRY: 0.3         // Min asymmetry to rule out Kodály signs
};

/**
 * Calculate 2D distance between two landmarks
 */
function calculateDistance2D(landmark1, landmark2) {
  const dx = landmark1.x - landmark2.x;
  const dy = landmark1.y - landmark2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate 3D distance between two landmarks
 */
function calculateDistance3D(landmark1, landmark2) {
  const dx = landmark1.x - landmark2.x;
  const dy = landmark1.y - landmark2.y;
  const dz = landmark1.z - landmark2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate angle between three points
 */
function calculateAngle(point1, point2, point3) {
  const v1 = { x: point1.x - point2.x, y: point1.y - point2.y };
  const v2 = { x: point3.x - point2.x, y: point3.y - point2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cos = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
}

/**
 * Check if a finger is extended based on joint angles and positions
 */
function isFingerExtended(landmarks, fingerIndices, isThumb = false) {
  const [mcp, pip, dip, tip] = fingerIndices;
  
  // For thumb, use different logic due to different joint structure
  if (isThumb) {
    const cmc = landmarks[HAND_LANDMARKS.THUMB_CMC];
    const mcp_joint = landmarks[mcp];
    const tip_joint = landmarks[tip];
    
    // Check if thumb tip is extended away from palm
    const thumbLength = calculateDistance2D(cmc, tip_joint);
    const thumbAngle = calculateAngle(cmc, mcp_joint, tip_joint);
    
    return {
      extended: thumbLength > DETECTION_CONFIG.THUMB_EXTENSION_THRESHOLD * 0.3 && 
                thumbAngle > 140,
      confidence: Math.min(1, (thumbLength / 0.3) * (thumbAngle / 180))
    };
  }
  
  // For other fingers, check joint angles
  const mcpJoint = landmarks[mcp];
  const pipJoint = landmarks[pip];
  const dipJoint = landmarks[dip];
  const tipJoint = landmarks[tip];
  
  // Calculate angles at each joint
  const pipAngle = calculateAngle(mcpJoint, pipJoint, dipJoint);
  const dipAngle = calculateAngle(pipJoint, dipJoint, tipJoint);
  
  // Check if finger is straight (high angles indicate extension)
  const avgAngle = (pipAngle + dipAngle) / 2;
  const extended = avgAngle > DETECTION_CONFIG.FINGER_EXTENSION_THRESHOLD * 180;
  
  // Calculate finger length as additional validation
  const fingerLength = calculateDistance2D(mcpJoint, tipJoint);
  
  return {
    extended,
    confidence: Math.min(1, (avgAngle / 180) * (fingerLength / 0.25)),
    angles: { pip: pipAngle, dip: dipAngle }
  };
}

/**
 * Analyze palm orientation to determine if it's facing the camera
 */
function analyzePalmOrientation(landmarks) {
  const wrist = landmarks[HAND_LANDMARKS.WRIST];
  const indexMCP = landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP];
  const pinkyMCP = landmarks[HAND_LANDMARKS.PINKY_MCP];
  const middleMCP = landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP];
  
  // Calculate palm normal using cross product
  const v1 = {
    x: indexMCP.x - wrist.x,
    y: indexMCP.y - wrist.y,
    z: indexMCP.z - wrist.z
  };
  
  const v2 = {
    x: pinkyMCP.x - wrist.x,
    y: pinkyMCP.y - wrist.y,
    z: pinkyMCP.z - wrist.z
  };
  
  // Cross product gives palm normal
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
  
  // Normalize
  const magnitude = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  if (magnitude > 0) {
    normal.x /= magnitude;
    normal.y /= magnitude;
    normal.z /= magnitude;
  }
  
  // Check if palm is facing camera (z-component should be negative)
  const facingCamera = normal.z < 0;
  const facingScore = Math.abs(normal.z);
  
  // Calculate tilt angle
  const tiltAngle = Math.atan2(Math.sqrt(normal.x * normal.x + normal.y * normal.y), Math.abs(normal.z)) * (180 / Math.PI);
  
  return {
    facingCamera: facingCamera && facingScore > DETECTION_CONFIG.MIN_PALM_FACING_SCORE,
    facingScore,
    tiltAngle,
    normal
  };
}

/**
 * Check finger spread to ensure hand is open (not closed fist)
 */
function analyzeFingerSpread(landmarks) {
  const fingerTips = [
    landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP],
    landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP],
    landmarks[HAND_LANDMARKS.RING_FINGER_TIP],
    landmarks[HAND_LANDMARKS.PINKY_TIP]
  ];
  
  let totalSpread = 0;
  let spreadCount = 0;
  
  // Calculate distances between adjacent finger tips
  for (let i = 0; i < fingerTips.length - 1; i++) {
    const spread = calculateDistance2D(fingerTips[i], fingerTips[i + 1]);
    totalSpread += spread;
    spreadCount++;
  }
  
  const averageSpread = totalSpread / spreadCount;
  const isSpread = averageSpread > DETECTION_CONFIG.MIN_FINGER_SPREAD;
  
  return {
    isSpread,
    averageSpread,
    confidence: Math.min(1, averageSpread / DETECTION_CONFIG.MIN_FINGER_SPREAD)
  };
}

/**
 * Detect potential Kodály hand signs to differentiate from flat hand
 */
function detectKodalySigns(landmarks, fingerStates) {
  const kodalyPatterns = {
    // Do - closed fist
    do: () => {
      const extendedCount = Object.values(fingerStates).filter(f => f.extended).length;
      return extendedCount === 0;
    },
    
    // Re - index finger extended
    re: () => {
      return fingerStates.index.extended && 
             !fingerStates.middle.extended && 
             !fingerStates.ring.extended && 
             !fingerStates.pinky.extended;
    },
    
    // Mi - index and middle extended
    mi: () => {
      return fingerStates.index.extended && 
             fingerStates.middle.extended && 
             !fingerStates.ring.extended && 
             !fingerStates.pinky.extended;
    },
    
    // Fa - thumb extended
    fa: () => {
      return fingerStates.thumb.extended && 
             !fingerStates.index.extended && 
             !fingerStates.middle.extended && 
             !fingerStates.ring.extended && 
             !fingerStates.pinky.extended;
    },
    
    // Sol - thumb and pinky extended (hang loose)
    sol: () => {
      return fingerStates.thumb.extended && 
             !fingerStates.index.extended && 
             !fingerStates.middle.extended && 
             !fingerStates.ring.extended && 
             fingerStates.pinky.extended;
    },
    
    // La - thumb, index, and pinky extended
    la: () => {
      return fingerStates.thumb.extended && 
             fingerStates.index.extended && 
             !fingerStates.middle.extended && 
             !fingerStates.ring.extended && 
             fingerStates.pinky.extended;
    },
    
    // Ti - index finger pointing up
    ti: () => {
      return fingerStates.index.extended && 
             !fingerStates.middle.extended && 
             !fingerStates.ring.extended && 
             !fingerStates.pinky.extended;
    }
  };
  
  const detectedSigns = [];
  for (const [sign, detector] of Object.entries(kodalyPatterns)) {
    if (detector()) {
      detectedSigns.push(sign);
    }
  }
  
  return {
    isKodaly: detectedSigns.length > 0,
    detectedSigns,
    confidence: detectedSigns.length > 0 ? 0.8 : 0.0
  };
}

/**
 * Calculate hand size relative to image frame
 */
function calculateHandSize(landmarks) {
  // Find bounding box of hand
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  landmarks.forEach(landmark => {
    minX = Math.min(minX, landmark.x);
    maxX = Math.max(maxX, landmark.x);
    minY = Math.min(minY, landmark.y);
    maxY = Math.max(maxY, landmark.y);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  const area = width * height;
  
  return {
    width,
    height,
    area,
    isValidSize: area >= DETECTION_CONFIG.MIN_HAND_SIZE && area <= DETECTION_CONFIG.MAX_HAND_SIZE
  };
}

/**
 * Main flat hand detection function
 * @param {Array} landmarks - MediaPipe hand landmarks array
 * @param {string} handedness - "Left" or "Right" 
 * @returns {Object} Detection result with confidence and details
 */
export function detectFlatHand(landmarks, handedness = "Right") {
  if (!landmarks || landmarks.length !== 21) {
    return {
      isFlatHand: false,
      confidence: 0,
      error: "Invalid landmarks provided"
    };
  }
  
  try {
    // Analyze individual finger extension
    const fingerStates = {
      thumb: isFingerExtended(landmarks, [
        HAND_LANDMARKS.THUMB_MCP,
        HAND_LANDMARKS.THUMB_IP,
        HAND_LANDMARKS.THUMB_IP, // Thumb only has IP joint
        HAND_LANDMARKS.THUMB_TIP
      ], true),
      
      index: isFingerExtended(landmarks, [
        HAND_LANDMARKS.INDEX_FINGER_MCP,
        HAND_LANDMARKS.INDEX_FINGER_PIP,
        HAND_LANDMARKS.INDEX_FINGER_DIP,
        HAND_LANDMARKS.INDEX_FINGER_TIP
      ]),
      
      middle: isFingerExtended(landmarks, [
        HAND_LANDMARKS.MIDDLE_FINGER_MCP,
        HAND_LANDMARKS.MIDDLE_FINGER_PIP,
        HAND_LANDMARKS.MIDDLE_FINGER_DIP,
        HAND_LANDMARKS.MIDDLE_FINGER_TIP
      ]),
      
      ring: isFingerExtended(landmarks, [
        HAND_LANDMARKS.RING_FINGER_MCP,
        HAND_LANDMARKS.RING_FINGER_PIP,
        HAND_LANDMARKS.RING_FINGER_DIP,
        HAND_LANDMARKS.RING_FINGER_TIP
      ]),
      
      pinky: isFingerExtended(landmarks, [
        HAND_LANDMARKS.PINKY_MCP,
        HAND_LANDMARKS.PINKY_PIP,
        HAND_LANDMARKS.PINKY_DIP,
        HAND_LANDMARKS.PINKY_TIP
      ])
    };
    
    // Analyze palm orientation
    const palmAnalysis = analyzePalmOrientation(landmarks);
    
    // Analyze finger spread
    const spreadAnalysis = analyzeFingerSpread(landmarks);
    
    // Check hand size
    const sizeAnalysis = calculateHandSize(landmarks);
    
    // Detect Kodály signs
    const kodalyAnalysis = detectKodalySigns(landmarks, fingerStates);
    
    // Determine if all fingers are extended
    const allFingersExtended = Object.values(fingerStates).every(finger => finger.extended);
    
    // Calculate overall confidence
    const fingerConfidences = Object.values(fingerStates).map(f => f.confidence);
    const avgFingerConfidence = fingerConfidences.reduce((sum, conf) => sum + conf, 0) / fingerConfidences.length;
    
    // Weight different factors
    const weights = {
      fingers: 0.4,      // 40% - Most important
      palmFacing: 0.25,  // 25% - Very important
      spread: 0.2,       // 20% - Important for distinguishing from fist
      size: 0.1,         // 10% - Basic validation
      notKodaly: 0.05    // 5% - Discrimination factor
    };
    
    const confidence = (
      avgFingerConfidence * weights.fingers +
      palmAnalysis.facingScore * weights.palmFacing +
      spreadAnalysis.confidence * weights.spread +
      (sizeAnalysis.isValidSize ? 1 : 0) * weights.size +
      (kodalyAnalysis.isKodaly ? 0 : 1) * weights.notKodaly
    );
    
    // Final determination
    const isFlatHand = (
      allFingersExtended &&
      palmAnalysis.facingCamera &&
      palmAnalysis.tiltAngle <= DETECTION_CONFIG.MAX_PALM_TILT_ANGLE &&
      spreadAnalysis.isSpread &&
      sizeAnalysis.isValidSize &&
      !kodalyAnalysis.isKodaly &&
      confidence >= DETECTION_CONFIG.MIN_CONFIDENCE
    );
    
    return {
      isFlatHand,
      confidence: Math.min(1, confidence),
      details: {
        fingerStates,
        palmAnalysis,
        spreadAnalysis,
        sizeAnalysis,
        kodalyAnalysis,
        handedness,
        timestamp: Date.now()
      },
      summary: {
        allFingersExtended,
        palmFacingCamera: palmAnalysis.facingCamera,
        fingerSpread: spreadAnalysis.isSpread,
        validSize: sizeAnalysis.isValidSize,
        notKodaly: !kodalyAnalysis.isKodaly
      }
    };
    
  } catch (error) {
    return {
      isFlatHand: false,
      confidence: 0,
      error: error.message,
      details: null
    };
  }
}

/**
 * Utility function to get landmark coordinates for debugging
 */
export function getLandmarkCoordinates(landmarks, landmarkIndex) {
  if (!landmarks || landmarkIndex < 0 || landmarkIndex >= landmarks.length) {
    return null;
  }
  
  return {
    x: landmarks[landmarkIndex].x,
    y: landmarks[landmarkIndex].y,
    z: landmarks[landmarkIndex].z
  };
}

/**
 * Batch process multiple hands for flat hand detection
 */
export function detectFlatHandMultiple(handResults) {
  if (!handResults || !handResults.multiHandLandmarks) {
    return [];
  }
  
  const results = [];
  
  for (let i = 0; i < handResults.multiHandLandmarks.length; i++) {
    const landmarks = handResults.multiHandLandmarks[i];
    const handedness = handResults.multiHandedness && 
                      handResults.multiHandedness[i] && 
                      handResults.multiHandedness[i].label || "Unknown";
    
    const detection = detectFlatHand(landmarks.landmark || landmarks, handedness);
    results.push({
      handIndex: i,
      ...detection
    });
  }
  
  return results;
}

/**
 * Configuration update function
 */
export function updateDetectionConfig(newConfig) {
  Object.assign(DETECTION_CONFIG, newConfig);
}

/**
 * Get current configuration
 */
export function getDetectionConfig() {
  return { ...DETECTION_CONFIG };
}

export { HAND_LANDMARKS, DETECTION_CONFIG };
