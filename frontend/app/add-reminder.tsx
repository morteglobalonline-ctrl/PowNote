import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';

// Get API URL from environment - fallback for mobile compatibility
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Log API URL for debugging (remove in production)
console.log('[AddReminder] API_URL:', API_URL);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Alarm sounds data
const ALARM_SOUNDS = [
  { id: 'dog', name: 'Dog', icon: 'paw' },
  { id: 'cat', name: 'Cat', icon: 'paw' },
  { id: 'wolf', name: 'Wolf', icon: 'moon' },
  { id: 'bird', name: 'Bird', icon: 'leaf' },
  { id: 'lion', name: 'Lion', icon: 'shield' },
  { id: 'rooster', name: 'Rooster', icon: 'sunny' },
  { id: 'owl', name: 'Owl', icon: 'moon' },
  { id: 'dolphin', name: 'Dolphin', icon: 'water' },
  { id: 'frog', name: 'Frog', icon: 'leaf' },
  { id: 'cricket', name: 'Cricket', icon: 'musical-notes' },
];

export default function AddReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [petId, setPetId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [petName, setPetName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [category, setCategory] = useState('general');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [selectedSound, setSelectedSound] = useState(ALARM_SOUNDS[0]);

  const categories = [
    { id: 'medication', label: 'Medication', icon: 'medical', color: '#EC4899' },
    { id: 'feeding', label: 'Feeding', icon: 'restaurant', color: '#F59E0B' },
    { id: 'walk', label: 'Walk', icon: 'walk', color: '#10B981' },
    { id: 'general', label: 'General', icon: 'notifications', color: '#3B82F6' },
  ];

  const days = [
    { id: 0, label: 'S' },
    { id: 1, label: 'M' },
    { id: 2, label: 'T' },
    { id: 3, label: 'W' },
    { id: 4, label: 'T' },
    { id: 5, label: 'F' },
    { id: 6, label: 'S' },
  ];

  useEffect(() => {
    loadPet();
    requestNotificationPermission();
    // Set default time to current time rounded to nearest 5 minutes
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
    now.setSeconds(0);
    setSelectedTime(now);
  }, []);

  // Load selected sound from navigation params
  useFocusEffect(
    useCallback(() => {
      const loadSelectedSound = async () => {
        const soundId = await AsyncStorage.getItem('selectedAlarmSound');
        if (soundId) {
          const sound = ALARM_SOUNDS.find(s => s.id === soundId);
          if (sound) {
            setSelectedSound(sound);
          }
          await AsyncStorage.removeItem('selectedAlarmSound');
        }
      };
      loadSelectedSound();
    }, [])
  );

  const loadPet = async () => {
    const savedPet = await AsyncStorage.getItem('currentPet');
    if (savedPet) {
      const pet = JSON.parse(savedPet);
      setPetId(pet.id);
      setPetName(pet.name);
    }
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in settings to receive reminders.'
      );
    }
  };

  const toggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter(d => d !== dayId));
      }
    } else {
      setSelectedDays([...selectedDays, dayId].sort());
    }
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const getTimeString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const onTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const scheduleNotification = async (reminder: any) => {
    const [hours, minutes] = reminder.reminder_time.split(':').map(Number);
    
    if (isRecurring) {
      for (const day of selectedDays) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${petName}: ${reminder.title}`,
            body: reminder.description || `Time for ${reminder.title}!`,
            data: { reminderId: reminder.id, sound: selectedSound.id },
          },
          trigger: {
            weekday: day + 1,
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
      }
    } else {
      const now = new Date();
      const notificationDate = new Date();
      notificationDate.setHours(hours, minutes, 0, 0);
      
      if (notificationDate <= now) {
        notificationDate.setDate(notificationDate.getDate() + 1);
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${petName}: ${reminder.title}`,
          body: reminder.description || `Time for ${reminder.title}!`,
          data: { reminderId: reminder.id, sound: selectedSound.id },
        },
        trigger: notificationDate,
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a title');
      return;
    }

    // Clear any previous error
    setErrorMessage(null);
    setLoading(true);
    
    // Build the full API URL
    const apiEndpoint = `${API_URL}/api/reminders`;
    console.log('[AddReminder] Creating reminder at:', apiEndpoint);
    console.log('[AddReminder] Pet ID:', petId);
    
    try {
      const reminderTime = getTimeString(selectedTime);
      const payload = {
        pet_id: petId,
        title: title.trim(),
        description: description.trim() || null,
        reminder_time: reminderTime,
        category,
        is_recurring: isRecurring,
        recurrence_days: selectedDays,
      };
      
      console.log('[AddReminder] Payload:', JSON.stringify(payload));
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[AddReminder] Response status:', response.status);

      if (response.ok) {
        const reminder = await response.json();
        console.log('[AddReminder] Reminder created:', reminder.id);
        await scheduleNotification(reminder);
        router.back();
      } else {
        const errorText = await response.text();
        console.log('[AddReminder] Error response:', errorText);
        setErrorMessage('Could not create reminder. Please try again.');
      }
    } catch (e: any) {
      console.log('[AddReminder] Network error:', e.message);
      console.log('[AddReminder] API URL was:', apiEndpoint);
      setErrorMessage(`Connection failed. Please check your internet connection.`);
    } finally {
      setLoading(false);
    }
  };

  const openSoundSelection = () => {
    router.push('/alarm-sounds');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Reminder</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Give medication"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Additional details"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Time Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Time</Text>
          <TouchableOpacity
            style={styles.timePickerButton}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={24} color="#8B5CF6" />
            <Text style={styles.timeText}>{formatTime(selectedTime)}</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* iOS inline picker */}
        {Platform.OS === 'ios' && showTimePicker && (
          <View style={styles.iosPickerContainer}>
            <View style={styles.iosPickerHeader}>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Text style={styles.iosPickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="spinner"
              onChange={onTimeChange}
              style={styles.iosPicker}
            />
          </View>
        )}

        {/* Android picker modal */}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {/* Web fallback time picker */}
        {Platform.OS === 'web' && showTimePicker && (
          <Modal
            visible={showTimePicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTimePicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
            >
              <View style={styles.webPickerContainer}>
                <Text style={styles.webPickerTitle}>Select Time</Text>
                <View style={styles.webTimeInputs}>
                  <TextInput
                    style={styles.webTimeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="HH"
                    value={selectedTime.getHours().toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const hours = parseInt(text) || 0;
                      if (hours >= 0 && hours <= 23) {
                        const newTime = new Date(selectedTime);
                        newTime.setHours(hours);
                        setSelectedTime(newTime);
                      }
                    }}
                  />
                  <Text style={styles.webTimeSeparator}>:</Text>
                  <TextInput
                    style={styles.webTimeInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="MM"
                    value={selectedTime.getMinutes().toString().padStart(2, '0')}
                    onChangeText={(text) => {
                      const minutes = parseInt(text) || 0;
                      if (minutes >= 0 && minutes <= 59) {
                        const newTime = new Date(selectedTime);
                        newTime.setMinutes(minutes);
                        setSelectedTime(newTime);
                      }
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={styles.webPickerDoneButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.webPickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Alarm Sound Selection */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Alarm Sound</Text>
          <TouchableOpacity
            style={styles.soundSelectButton}
            onPress={openSoundSelection}
          >
            <View style={styles.soundSelectLeft}>
              <View style={styles.soundIconContainer}>
                <Ionicons name={selectedSound.icon as any} size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.soundName}>{selectedSound.name}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoriesContainer}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryButton,
                  category === cat.id && { backgroundColor: cat.color, borderColor: cat.color },
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={18}
                  color={category === cat.id ? '#FFFFFF' : cat.color}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: category === cat.id ? '#FFFFFF' : cat.color },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.recurringOption}
          onPress={() => setIsRecurring(!isRecurring)}
        >
          <View style={styles.recurringLeft}>
            <Ionicons name="repeat" size={24} color="#8B5CF6" />
            <View>
              <Text style={styles.recurringTitle}>Repeat</Text>
              <Text style={styles.recurringSubtitle}>
                {isRecurring ? 'Repeats on selected days' : 'One-time reminder'}
              </Text>
            </View>
          </View>
          <View style={[styles.toggle, isRecurring && styles.toggleActive]}>
            {isRecurring && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>

        {isRecurring && (
          <View style={styles.daysContainer}>
            <Text style={styles.label}>Repeat on</Text>
            <View style={styles.daysRow}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day.id) && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selectedDays.includes(day.id) && styles.dayTextActive,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {/* Inline Error Message */}
        {errorMessage && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Create Reminder</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  timeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  iosPickerContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iosPickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  iosPicker: {
    height: 180,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'center',
  },
  webPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  webTimeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  webTimeInput: {
    width: 70,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
  },
  webTimeSeparator: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1F2937',
    marginHorizontal: 8,
  },
  webPickerDoneButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  webPickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  soundSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  soundSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  soundName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  recurringOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  recurringLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recurringTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  recurringSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  toggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  daysContainer: {
    marginBottom: 20,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
