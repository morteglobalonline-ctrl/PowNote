import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function AddReminderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [petId, setPetId] = useState('');
  const [petName, setPetName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [category, setCategory] = useState('general');
  const [isRecurring, setIsRecurring] = useState(true);
  const [selectedDays, setSelectedDays] = useState([0, 1, 2, 3, 4, 5, 6]);

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
  }, []);

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

  const formatTimeInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.substring(0, 2);
    if (cleaned.length > 2) formatted += ':' + cleaned.substring(2, 4);
    return formatted;
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

  const scheduleNotification = async (reminder: any) => {
    const [hours, minutes] = reminder.reminder_time.split(':').map(Number);
    
    if (isRecurring) {
      // Schedule for each selected day
      for (const day of selectedDays) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${petName}: ${reminder.title}`,
            body: reminder.description || `Time for ${reminder.title}!`,
            data: { reminderId: reminder.id },
          },
          trigger: {
            weekday: day + 1, // expo uses 1-7 for Sunday-Saturday
            hour: hours,
            minute: minutes,
            repeats: true,
          },
        });
      }
    } else {
      // One-time notification
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
          data: { reminderId: reminder.id },
        },
        trigger: notificationDate,
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !reminderTime.trim()) {
      Alert.alert('Missing Info', 'Please enter a title and time');
      return;
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(reminderTime)) {
      Alert.alert('Invalid Time', 'Please enter time in HH:MM format');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          title: title.trim(),
          description: description.trim() || null,
          reminder_time: reminderTime,
          category,
          is_recurring: isRecurring,
          recurrence_days: selectedDays,
        }),
      });

      if (response.ok) {
        const reminder = await response.json();
        await scheduleNotification(reminder);
        Alert.alert('Success', 'Reminder created and notifications scheduled!');
        router.back();
      } else {
        Alert.alert('Error', 'Could not create reminder');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={styles.input}
            placeholder="HH:MM (24-hour format)"
            placeholderTextColor="#9CA3AF"
            value={reminderTime}
            onChangeText={(text) => setReminderTime(formatTimeInput(text))}
            keyboardType="numeric"
            maxLength={5}
          />
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
