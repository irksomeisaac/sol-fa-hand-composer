/**
 * Legacy Audio Utils - Backward Compatibility Layer
 * This file maintains the original API while using the enhanced audio engine under the hood
 */

// Import the enhanced audio system
import { audioPlayer as enhancedAudioPlayer, BASE_NOTES, getNoteFrequency } from './enhancedAudioUtils.js';

// Export the enhanced player with the same interface
export const audioPlayer = enhancedAudioPlayer;

// Export legacy constants for backward compatibility
export { BASE_NOTES, getNoteFrequency };

// Re-export the enhanced player class for direct instantiation
export { EnhancedAudioPlayer as AudioPlayer } from './enhancedAudioUtils.js';

// Export additional enhanced features for components that want to use them
export { TIMBRES, EFFECT_TYPES } from './enhancedAudioUtils.js';
