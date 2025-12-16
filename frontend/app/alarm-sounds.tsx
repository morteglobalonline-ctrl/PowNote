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
import { Audio } from 'expo-av';

// Alarm sounds data - scalable for 100+ sounds
const ALARM_SOUNDS = [
  { id: 'dog', name: 'Dog', icon: 'paw', category: 'pets' },
  { id: 'cat', name: 'Cat', icon: 'paw', category: 'pets' },
  { id: 'wolf', name: 'Wolf', icon: 'moon', category: 'wild' },
  { id: 'bird', name: 'Bird', icon: 'leaf', category: 'nature' },
  { id: 'lion', name: 'Lion', icon: 'shield', category: 'wild' },
  { id: 'rooster', name: 'Rooster', icon: 'sunny', category: 'farm' },
  { id: 'owl', name: 'Owl', icon: 'moon', category: 'nature' },
  { id: 'dolphin', name: 'Dolphin', icon: 'water', category: 'ocean' },
  { id: 'frog', name: 'Frog', icon: 'leaf', category: 'nature' },
  { id: 'cricket', name: 'Cricket', icon: 'musical-notes', category: 'nature' },
  { id: 'whale', name: 'Whale', icon: 'water', category: 'ocean' },
  { id: 'elephant', name: 'Elephant', icon: 'footsteps', category: 'wild' },
];

interface AlarmSound {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export default function AlarmSoundsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedSound, setSelectedSound] = useState<string>('dog');
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  useEffect(() => {
    // Load previously selected sound
    const loadSelected = async () => {
      const saved = await AsyncStorage.getItem('tempSelectedSound');
      if (saved) {
        setSelectedSound(saved);
      }
    };
    loadSelected();

    return () => {
      // Cleanup sound on unmount
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const playPreview = async (soundId: string) => {
    try {
      // Stop any currently playing sound
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      if (playingSound === soundId) {
        setPlayingSound(null);
        return;
      }

      // For now, we'll simulate sound preview with a short delay
      // In production, you would load actual sound files here
      setPlayingSound(soundId);
      
      // Simulate sound playing for 2 seconds
      setTimeout(() => {
        setPlayingSound(null);
      }, 2000);

      // Example of how to load actual sounds:
      // const { sound: newSound } = await Audio.Sound.createAsync(
      //   require(`../assets/sounds/${soundId}.mp3`)
      // );
      // setSound(newSound);
      // await newSound.playAsync();

    } catch (error) {
      console.error('Error playing sound:', error);
      setPlayingSound(null);
    }
  };

  const handleSelect = async (soundId: string) => {
    setSelectedSound(soundId);
  };

  const handleConfirm = async () => {
    // Save selected sound to AsyncStorage so add-reminder can read it
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
        <TouchableOpacity onPress={() => router.back()}>
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
          Select a sound for your reminder alarm
        </Text>

        {ALARM_SOUNDS.map((alarmSound) => (
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
              <Text
                style={[
                  styles.soundName,
                  selectedSound === alarmSound.id && styles.soundNameSelected,
                ]}
              >
                {alarmSound.name}
              </Text>
            </View>

            <View style={styles.soundItemRight}>
              {/* Play/Preview Button */}
              <TouchableOpacity
                style={styles.playButton}
                onPress={() => playPreview(alarmSound.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {playingSound === alarmSound.id ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Ionicons
                    name="play-circle"
                    size={32}
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
          <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            Sound previews are simulated. Actual alarm sounds will play when the reminder triggers.
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
  soundItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
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
