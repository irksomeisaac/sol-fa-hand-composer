/**
 * Comprehensive Test Suite for Flat Hand Detection System
 * Tests various hand positions including flat hand, Kodály signs, and edge cases
 */

import {
  detectFlatHand,
  detectFlatHandMultiple,
  getLandmarkCoordinates,
  updateDetectionConfig,
  getDetectionConfig,
  HAND_LANDMARKS,
  DETECTION_CONFIG
} from './flatHandDetection.js';

// Mock landmark data for testing
const createMockLandmarks = (handType) => {
  const landmarks = Array(21).fill(null).map((_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0
  }));

  switch (handType) {
    case 'flat_hand':
      return createFlatHandLandmarks(landmarks);
    case 'closed_fist':
      return createClosedFistLandmarks(landmarks);
    case 'kodaly_re':
      return createKodalyReLandmarks(landmarks);
    case 'kodaly_mi':
      return createKodalyMiLandmarks(landmarks);
    case 'kodaly_sol':
      return createKodalySolLandmarks(landmarks);
    case 'partial_extension':
      return createPartialExtensionLandmarks(landmarks);
    case 'tilted_hand':
      return createTiltedHandLandmarks(landmarks);
    case 'too_small':
      return createTooSmallHandLandmarks(landmarks);
    default:
      return landmarks;
  }
};

// Create realistic flat hand landmarks (all fingers extended, palm facing camera)
function createFlatHandLandmarks(base) {
  const landmarks = [...base];
  
  // Wrist as base point
  landmarks[HAND_LANDMARKS.WRIST] = { x: 0.5, y: 0.6, z: 0 };
  
  // Thumb (extended outward)
  landmarks[HAND_LANDMARKS.THUMB_CMC] = { x: 0.45, y: 0.55, z: -0.02 };
  landmarks[HAND_LANDMARKS.THUMB_MCP] = { x: 0.42, y: 0.52, z: -0.03 };
  landmarks[HAND_LANDMARKS.THUMB_IP] = { x: 0.39, y: 0.49, z: -0.04 };
  landmarks[HAND_LANDMARKS.THUMB_TIP] = { x: 0.36, y: 0.46, z: -0.05 };
  
  // Index finger (straight up)
  landmarks[HAND_LANDMARKS.INDEX_FINGER_MCP] = { x: 0.47, y: 0.55, z: -0.02 };
  landmarks[HAND_LANDMARKS.INDEX_FINGER_PIP] = { x: 0.47, y: 0.45, z: -0.03 };
  landmarks[HAND_LANDMARKS.INDEX_FINGER_DIP] = { x: 0.47, y: 0.38, z: -0.04 };
  landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP] = { x: 0.47, y: 0.30, z: -0.05 };
  
  // Middle finger (straight up)
  landmarks[HAND_LANDMARKS.MIDDLE_FINGER_MCP] = { x: 0.50, y: 0.55, z: -0.02 };
  landmarks[HAND_LANDMARKS.MIDDLE_FINGER_PIP] = { x: 0.50, y: 0.43, z: -0.03 };
  landmarks[HAND_LANDMARKS.MIDDLE_FINGER_DIP] = { x: 0.50, y: 0.36, z: -0.04 };
  landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP] = { x: 0.50, y: 0.28, z: -0.05 };
  
  // Ring finger (straight up)
  landmarks[HAND_LANDMARKS.RING_FINGER_MCP] = { x: 0.53, y: 0.55, z: -0.02 };
  landmarks[HAND_LANDMARKS.RING_FINGER_PIP] = { x: 0.53, y: 0.44, z: -0.03 };
  landmarks[HAND_LANDMARKS.RING_FINGER_DIP] = { x: 0.53, y: 0.37, z: -0.04 };
  landmarks[HAND_LANDMARKS.RING_FINGER_TIP] = { x: 0.53, y: 0.30, z: -0.05 };
  
  // Pinky (straight up)
  landmarks[HAND_LANDMARKS.PINKY_MCP] = { x: 0.56, y: 0.55, z: -0.02 };
  landmarks[HAND_LANDMARKS.PINKY_PIP] = { x: 0.56, y: 0.46, z: -0.03 };
  landmarks[HAND_LANDMARKS.PINKY_DIP] = { x: 0.56, y: 0.40, z: -0.04 };
  landmarks[HAND_LANDMARKS.PINKY_TIP] = { x: 0.56, y: 0.33, z: -0.05 };
  
  return landmarks;
}

// Create closed fist landmarks
function createClosedFistLandmarks(base) {
  const landmarks = [...base];
  
  landmarks[HAND_LANDMARKS.WRIST] = { x: 0.5, y: 0.6, z: 0 };
  
  // All fingers curled in
  landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP] = { x: 0.48, y: 0.58, z: 0.02 };
  landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP] = { x: 0.50, y: 0.58, z: 0.02 };
  landmarks[HAND_LANDMARKS.RING_FINGER_TIP] = { x: 0.52, y: 0.58, z: 0.02 };
  landmarks[HAND_LANDMARKS.PINKY_TIP] = { x: 0.54, y: 0.58, z: 0.02 };
  landmarks[HAND_LANDMARKS.THUMB_TIP] = { x: 0.46, y: 0.58, z: 0.02 };
  
  return landmarks;
}

// Create Kodály "Re" sign (index finger extended)
function createKodalyReLandmarks(base) {
  const landmarks = createClosedFistLandmarks(base);
  
  // Only index finger extended
  landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP] = { x: 0.47, y: 0.30, z: -0.05 };
  landmarks[HAND_LANDMARKS.INDEX_FINGER_DIP] = { x: 0.47, y: 0.38, z: -0.04 };
  landmarks[HAND_LANDMARKS.INDEX_FINGER_PIP] = { x: 0.47, y: 0.45, z: -0.03 };
  
  return landmarks;
}

// Create Kodály "Mi" sign (index and middle fingers extended)
function createKodalyMiLandmarks(base) {
  const landmarks = createClosedFistLandmarks(base);
  
  // Index and middle fingers extended
  landmarks[HAND_LANDMARKS.INDEX_FINGER_TIP] = { x: 0.47, y: 0.30, z: -0.05 };
  landmarks[HAND_LANDMARKS.MIDDLE_FINGER_TIP] = { x: 0.50, y: 0.28, z: -0.05 };
  
  return landmarks;
}

// Create Kodály "Sol" sign (thumb and pinky extended)
function createKodalySolLandmarks(base) {
  const landmarks = createClosedFistLandmarks(base);
  
  // Thumb and pinky extended
  landmarks[HAND_LANDMARKS.THUMB_TIP] = { x: 0.36, y: 0.46, z: -0.05 };
  landmarks[HAND_LANDMARKS.PINKY_TIP] = { x: 0.56, y: 0.33, z: -0.05 };
  
  return landmarks;
}

// Create partially extended hand
function createPartialExtensionLandmarks(base) {
  const landmarks = createFlatHandLandmarks(base);
  
  // Make ring finger only partially extended
  landmarks[HAND_LANDMARKS.RING_FINGER_TIP] = { x: 0.53, y: 0.50, z: -0.02 };
  
  return landmarks;
}

// Create tilted hand (palm not facing camera)
function createTiltedHandLandmarks(base) {
  const landmarks = createFlatHandLandmarks(base);
  
  // Rotate all z coordinates to simulate tilt
  landmarks.forEach(landmark => {
    landmark.z += 0.1; // Palm facing away from camera
  });
  
  return landmarks;
}

// Create very small hand
function createTooSmallHandLandmarks(base) {
  const landmarks = createFlatHandLandmarks(base);
  
  // Scale down all coordinates to center
  landmarks.forEach(landmark => {
    landmark.x = 0.5 + (landmark.x - 0.5) * 0.05;
    landmark.y = 0.5 + (landmark.y - 0.5) * 0.05;
  });
  
  return landmarks;
}

// Test suite
describe('Flat Hand Detection System', () => {
  
  beforeEach(() => {
    // Reset configuration before each test
    updateDetectionConfig({
      MIN_CONFIDENCE: 0.7,
      FINGER_EXTENSION_THRESHOLD: 0.85,
      THUMB_EXTENSION_THRESHOLD: 0.8,
      MAX_PALM_TILT_ANGLE: 30,
      MIN_PALM_FACING_SCORE: 0.7,
      MIN_HAND_SIZE: 0.1,
      MAX_HAND_SIZE: 0.9,
      MIN_FINGER_SPREAD: 0.15,
      MAX_FINGER_CURL: 0.2,
      MAX_KODALY_FINGER_CURL: 0.6,
      MIN_KODALY_ASYMMETRY: 0.3
    });
  });
  
  describe('Basic Detection', () => {
    test('should detect a proper flat hand (high five position)', () => {
      const landmarks = createMockLandmarks('flat_hand');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.details.fingerStates.index.extended).toBe(true);
      expect(result.details.fingerStates.middle.extended).toBe(true);
      expect(result.details.fingerStates.ring.extended).toBe(true);
      expect(result.details.fingerStates.pinky.extended).toBe(true);
      expect(result.details.fingerStates.thumb.extended).toBe(true);
    });
    
    test('should reject a closed fist', () => {
      const landmarks = createMockLandmarks('closed_fist');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
      expect(result.confidence).toBeLessThan(0.7);
    });
    
    test('should reject partially extended hand', () => {
      const landmarks = createMockLandmarks('partial_extension');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
    });
  });
  
  describe('Kodály Sign Discrimination', () => {
    test('should reject Kodály "Re" sign (index finger only)', () => {
      const landmarks = createMockLandmarks('kodaly_re');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
      expect(result.details.kodalyAnalysis.isKodaly).toBe(true);
      expect(result.details.kodalyAnalysis.detectedSigns).toContain('re');
    });
    
    test('should reject Kodály "Mi" sign (peace sign)', () => {
      const landmarks = createMockLandmarks('kodaly_mi');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
      expect(result.details.kodalyAnalysis.isKodaly).toBe(true);
      expect(result.details.kodalyAnalysis.detectedSigns).toContain('mi');
    });
    
    test('should reject Kodály "Sol" sign (hang loose)', () => {
      const landmarks = createMockLandmarks('kodaly_sol');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
      expect(result.details.kodalyAnalysis.isKodaly).toBe(true);
      expect(result.details.kodalyAnalysis.detectedSigns).toContain('sol');
    });
  });
  
  describe('Palm Orientation Validation', () => {
    test('should reject tilted hand (palm not facing camera)', () => {
      const landmarks = createMockLandmarks('tilted_hand');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
      expect(result.details.palmAnalysis.facingCamera).toBe(false);
    });
  });
  
  describe('Size Validation', () => {
    test('should reject hand that is too small', () => {
      const landmarks = createMockLandmarks('too_small');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.isFlatHand).toBe(false);
      expect(result.details.sizeAnalysis.isValidSize).toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle invalid landmarks array', () => {
      const result = detectFlatHand(null);
      
      expect(result.isFlatHand).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBe('Invalid landmarks provided');
    });
    
    test('should handle incorrect number of landmarks', () => {
      const invalidLandmarks = Array(10).fill({ x: 0.5, y: 0.5, z: 0 });
      const result = detectFlatHand(invalidLandmarks);
      
      expect(result.isFlatHand).toBe(false);
      expect(result.error).toBe('Invalid landmarks provided');
    });
  });
  
  describe('Multiple Hand Detection', () => {
    test('should process multiple hands correctly', () => {
      const mockResults = {
        multiHandLandmarks: [
          createMockLandmarks('flat_hand'),
          createMockLandmarks('kodaly_re')
        ],
        multiHandedness: [
          { label: 'Right' },
          { label: 'Left' }
        ]
      };
      
      const results = detectFlatHandMultiple(mockResults);
      
      expect(results).toHaveLength(2);
      expect(results[0].isFlatHand).toBe(true);
      expect(results[1].isFlatHand).toBe(false);
    });
    
    test('should handle empty results', () => {
      const results = detectFlatHandMultiple(null);
      expect(results).toEqual([]);
    });
  });
  
  describe('Utility Functions', () => {
    test('getLandmarkCoordinates should return correct coordinates', () => {
      const landmarks = createMockLandmarks('flat_hand');
      const coords = getLandmarkCoordinates(landmarks, HAND_LANDMARKS.INDEX_FINGER_TIP);
      
      expect(coords).toHaveProperty('x');
      expect(coords).toHaveProperty('y');
      expect(coords).toHaveProperty('z');
    });
    
    test('getLandmarkCoordinates should handle invalid input', () => {
      const coords = getLandmarkCoordinates(null, 0);
      expect(coords).toBeNull();
    });
    
    test('configuration should be updatable', () => {
      const originalConfig = getDetectionConfig();
      updateDetectionConfig({ MIN_CONFIDENCE: 0.9 });
      
      const newConfig = getDetectionConfig();
      expect(newConfig.MIN_CONFIDENCE).toBe(0.9);
      expect(newConfig.MIN_CONFIDENCE).not.toBe(originalConfig.MIN_CONFIDENCE);
    });
  });
  
  describe('Confidence Scoring', () => {
    test('flat hand should have high confidence', () => {
      const landmarks = createMockLandmarks('flat_hand');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.confidence).toBeGreaterThan(0.8);
    });
    
    test('ambiguous gestures should have lower confidence', () => {
      const landmarks = createMockLandmarks('partial_extension');
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result.confidence).toBeLessThan(0.7);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle landmarks with missing properties', () => {
      const landmarks = Array(21).fill({ x: 0.5, y: 0.5 }); // Missing z
      const result = detectFlatHand(landmarks, 'Right');
      
      // Should still work with default z=0
      expect(result).toHaveProperty('isFlatHand');
      expect(result).toHaveProperty('confidence');
    });
    
    test('should handle extreme coordinate values', () => {
      const landmarks = createMockLandmarks('flat_hand');
      landmarks[0] = { x: 999, y: -999, z: 999 }; // Extreme values
      
      const result = detectFlatHand(landmarks, 'Right');
      
      expect(result).toHaveProperty('isFlatHand');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });
  
  describe('Performance Considerations', () => {
    test('detection should complete quickly', () => {
      const landmarks = createMockLandmarks('flat_hand');
      const startTime = performance.now();
      
      detectFlatHand(landmarks, 'Right');
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });
    
    test('multiple hand processing should be efficient', () => {
      const mockResults = {
        multiHandLandmarks: Array(5).fill(createMockLandmarks('flat_hand')),
        multiHandedness: Array(5).fill({ label: 'Right' })
      };
      
      const startTime = performance.now();
      detectFlatHandMultiple(mockResults);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});

// Integration test helper
export function createTestSuite() {
  return {
    flatHandLandmarks: createMockLandmarks('flat_hand'),
    closedFistLandmarks: createMockLandmarks('closed_fist'),
    kodalyReLandmarks: createMockLandmarks('kodaly_re'),
    kodalyMiLandmarks: createMockLandmarks('kodaly_mi'),
    kodalySolLandmarks: createMockLandmarks('kodaly_sol'),
    partialLandmarks: createMockLandmarks('partial_extension'),
    tiltedLandmarks: createMockLandmarks('tilted_hand'),
    smallHandLandmarks: createMockLandmarks('too_small')
  };
}

export default createTestSuite;
