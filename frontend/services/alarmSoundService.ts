/**
 * Pawnote Alarm Sound Service
 * 
 * Scalable system for managing AI-generated animal alarm sounds.
 * 
 * ARCHITECTURE:
 * - Sounds are loaded from local assets/alarms/ directory (MVP)
 * - Can easily switch to remote CDN URLs without UI changes
 * - Supports 100+ sounds with lazy loading
 * 
 * FILE NAMING CONVENTION:
 * - Format: {animal_id}_soft.mp3
 * - Examples: dog_soft.mp3, cat_soft.mp3, wolf_soft.mp3
 * 
 * TO ADD NEW SOUNDS:
 * 1. Generate AI sound (0.6-1.2 seconds, soft, natural)
 * 2. Save as {animal_id}_soft.mp3 in assets/alarms/
 * 3. Add entry to ALARM_SOUNDS array below
 * 4. No UI changes needed
 * 
 * TO SWITCH TO CDN:
 * 1. Upload sounds to CDN
 * 2. Set USE_CDN = true
 * 3. Update CDN_BASE_URL
 */

import { Audio, AVPlaybackStatus } from 'expo-av';

// Configuration - easy to switch between local and CDN
const USE_CDN = false;
const CDN_BASE_URL = 'https://cdn.pawnote.app/alarms/'; // Future CDN URL

// Sound file mapping - required for local assets in React Native
// This mapping allows dynamic loading while maintaining static require() for bundler
const LOCAL_SOUND_FILES: Record<string, any> = {
  dog: require('../assets/alarms/dog_soft.mp3'),
  cat: require('../assets/alarms/cat_soft.mp3'),
  wolf: require('../assets/alarms/wolf_soft.mp3'),
  bird: require('../assets/alarms/bird_soft.mp3'),
  lion: require('../assets/alarms/lion_soft.mp3'),
  rooster: require('../assets/alarms/rooster_soft.mp3'),
  owl: require('../assets/alarms/owl_soft.mp3'),
  dolphin: require('../assets/alarms/dolphin_soft.mp3'),
  frog: require('../assets/alarms/frog_soft.mp3'),
  cricket: require('../assets/alarms/cricket_soft.mp3'),
  whale: require('../assets/alarms/whale_soft.mp3'),
  elephant: require('../assets/alarms/elephant_soft.mp3'),
};

// Alarm sound metadata - scalable for 100+ sounds
export interface AlarmSound {
  id: string;
  name: string;
  icon: string;
  category: 'pets' | 'wild' | 'nature' | 'farm' | 'ocean';
  description?: string;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: 'dog', name: 'Dog', icon: 'paw', category: 'pets', description: 'Soft dog bark' },
  { id: 'cat', name: 'Cat', icon: 'paw', category: 'pets', description: 'Gentle meow' },
  { id: 'wolf', name: 'Wolf', icon: 'moon', category: 'wild', description: 'Distant howl' },
  { id: 'bird', name: 'Bird', icon: 'leaf', category: 'nature', description: 'Morning chirp' },
  { id: 'lion', name: 'Lion', icon: 'shield', category: 'wild', description: 'Soft roar' },
  { id: 'rooster', name: 'Rooster', icon: 'sunny', category: 'farm', description: 'Wake-up call' },
  { id: 'owl', name: 'Owl', icon: 'moon', category: 'nature', description: 'Night hoot' },
  { id: 'dolphin', name: 'Dolphin', icon: 'water', category: 'ocean', description: 'Playful click' },
  { id: 'frog', name: 'Frog', icon: 'leaf', category: 'nature', description: 'Pond croak' },
  { id: 'cricket', name: 'Cricket', icon: 'musical-notes', category: 'nature', description: 'Evening chirp' },
  { id: 'whale', name: 'Whale', icon: 'water', category: 'ocean', description: 'Deep song' },
  { id: 'elephant', name: 'Elephant', icon: 'footsteps', category: 'wild', description: 'Trumpet call' },
];

// Category metadata for grouping (future use)
export const SOUND_CATEGORIES = {
  pets: { name: 'Pets', icon: 'paw' },
  wild: { name: 'Wild Animals', icon: 'shield' },
  nature: { name: 'Nature', icon: 'leaf' },
  farm: { name: 'Farm', icon: 'sunny' },
  ocean: { name: 'Ocean', icon: 'water' },
};

/**
 * AlarmSoundService - Singleton for managing alarm sound playback
 */
class AlarmSoundService {
  private currentSound: Audio.Sound | null = null;
  private isPlaying: boolean = false;

  /**
   * Get the sound source for a given sound ID
   * Supports both local assets and remote CDN
   */
  private getSoundSource(soundId: string): any {
    if (USE_CDN) {
      // Remote CDN URL
      return { uri: `${CDN_BASE_URL}${soundId}_soft.mp3` };
    } else {
      // Local asset
      return LOCAL_SOUND_FILES[soundId];
    }
  }

  /**
   * Initialize audio session
   * Call this before playing any sounds
   */
  async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  /**
   * Play a preview of the alarm sound
   * @param soundId - The ID of the sound to play
   * @param onPlaybackStatusUpdate - Callback for playback status updates
   * @returns Promise<boolean> - Whether playback started successfully
   */
  async playPreview(
    soundId: string,
    onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
  ): Promise<boolean> {
    try {
      // Stop any currently playing sound
      await this.stopCurrentSound();

      const soundSource = this.getSoundSource(soundId);
      
      if (!soundSource) {
        console.warn(`Sound not found for ID: ${soundId}`);
        return false;
      }

      const { sound } = await Audio.Sound.createAsync(
        soundSource,
        { shouldPlay: true, volume: 0.8 },
        onPlaybackStatusUpdate
      );

      this.currentSound = sound;
      this.isPlaying = true;

      // Auto-cleanup when sound finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.cleanup();
        }
        onPlaybackStatusUpdate?.(status);
      });

      return true;
    } catch (error) {
      console.error('Error playing sound:', error);
      return false;
    }
  }

  /**
   * Stop the currently playing sound
   */
  async stopCurrentSound(): Promise<void> {
    if (this.currentSound) {
      try {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
      } catch (error) {
        // Ignore errors during cleanup
      }
      this.currentSound = null;
      this.isPlaying = false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopCurrentSound();
  }

  /**
   * Check if a sound is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Get all available sounds
   */
  getAllSounds(): AlarmSound[] {
    return ALARM_SOUNDS;
  }

  /**
   * Get sounds by category
   */
  getSoundsByCategory(category: AlarmSound['category']): AlarmSound[] {
    return ALARM_SOUNDS.filter((sound) => sound.category === category);
  }

  /**
   * Get sound by ID
   */
  getSoundById(soundId: string): AlarmSound | undefined {
    return ALARM_SOUNDS.find((sound) => sound.id === soundId);
  }

  /**
   * Check if a sound exists
   */
  soundExists(soundId: string): boolean {
    return soundId in LOCAL_SOUND_FILES;
  }
}

// Export singleton instance
export const alarmSoundService = new AlarmSoundService();

// Export for direct access to sound data
export default {
  service: alarmSoundService,
  sounds: ALARM_SOUNDS,
  categories: SOUND_CATEGORIES,
};
