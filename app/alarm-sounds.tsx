import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { alarmSoundService, ALARM_SOUNDS, AlarmSound } from '../services/alarmSoundService';

export default function AlarmSoundsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedSound, setSelectedSound] = useState<string>('dog');
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize audio and load previously selected sound
    const initialize = async () => {
      await alarmSoundService.initializeAudio();
      const saved = await AsyncStorage.getItem('selectedAlarmSound');
      if (saved) {
        setSelectedSound(saved);
      }
      setIsInitialized(true);
    };
    initialize();

    return () => {
      // Cleanup sound on unmount
      alarmSoundService.cleanup();
    };
  }, []);

  const playPreview = async (soundId: string) => {
    try {
      // If same sound is playing, stop it
      if (playingSound === soundId) {
        await alarmSoundService.stopCurrentSound();
        setPlayingSound(null);
        return;
      }

      // Stop any currently playing sound
      await alarmSoundService.stopCurrentSound();
      setPlayingSound(soundId);

      // Play the sound preview
      const success = await alarmSoundService.playPreview(soundId, (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingSound(null);
        }
      });

      if (!success) {
        setPlayingSound(null);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingSound(null);
    }
  };

  const handleSelect = async (soundId: string) => {
    setSelectedSound(soundId);
  };

  const handleConfirm = async () => {
    // Stop any playing sound
    await alarmSoundService.stopCurrentSound();
    setPlayingSound(null);
    
    // Save selected sound to AsyncStorage
    await AsyncStorage.setItem('selectedAlarmSound', selectedSound);
    router.back();
  };

  const getIconColor = (soundId: string) => {
    if (selectedSound === soundId) return '#8B5CF6';
    return '#6B7280';
  };

  const getIconBgColor = (soundId: string) => {
    if (selectedSound === soundId) return '#EDE9FE';
    return '#F3F4F6';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          alarmSoundService.stopCurrentSound();
          router.back();
        }}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alarm Sounds</Text>
        <TouchableOpacity onPress={handleConfirm}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Sound List */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Animal Sounds</Text>
        <Text style={styles.sectionSubtitle}>
          AI-generated sounds for your pet reminders
        </Text>

        {ALARM_SOUNDS.map((alarmSound: AlarmSound) => (
          <TouchableOpacity
            key={alarmSound.id}
            style={[
              styles.soundItem,
              selectedSound === alarmSound.id && styles.soundItemSelected,
            ]}
            onPress={() => handleSelect(alarmSound.id)}
            activeOpacity={0.7}
          >
            <View style={styles.soundItemLeft}>
              <View
                style={[
                  styles.soundIconContainer,
                  { backgroundColor: getIconBgColor(alarmSound.id) },
                ]}
              >
                <Ionicons
                  name={alarmSound.icon as any}
                  size={22}
                  color={getIconColor(alarmSound.id)}
                />
              </View>
              <View style={styles.soundInfo}>
                <Text
                  style={[
                    styles.soundName,
                    selectedSound === alarmSound.id && styles.soundNameSelected,
                  ]}
                >
                  {alarmSound.name}
                </Text>
                {alarmSound.description && (
                  <Text style={styles.soundDescription}>
                    {alarmSound.description}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.soundItemRight}>
              {/* Play/Preview Button */}
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => playPreview(alarmSound.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={!isInitialized}
              >
                {playingSound === alarmSound.id ? (
                  <View style={styles.stopButton}>
                    <Ionicons name="stop" size={16} color="#FFFFFF" />
                  </View>
                ) : (
                  <Ionicons
                    name="play-circle"
                    size={36}
                    color={selectedSound === alarmSound.id ? '#8B5CF6' : '#9CA3AF'}
                  />
                )}
              </TouchableOpacity>

              {/* Selected Checkmark */}
              {selectedSound === alarmSound.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="sparkles" size={20} color="#8B5CF6" />
          <Text style={styles.infoText}>
            All sounds are originally created for PawsLife using AI sound generation. 
            Soft, natural tones perfect for gentle reminders.
          </Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  soundItemSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: '#8B5CF6',
  },
  soundItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  soundIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  soundInfo: {
    flex: 1,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  soundNameSelected: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  soundDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  soundItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});
