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

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ChecklistItem {
  text: string;
  due_time?: string;
}

export default function AddChecklistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [petId, setPetId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('daily');
  const [items, setItems] = useState<ChecklistItem[]>([{ text: '', due_time: '' }]);
  const [isRecurring, setIsRecurring] = useState(false);

  const categories = [
    { id: 'daily', label: 'Daily', icon: 'sunny', color: '#10B981' },
    { id: 'medication', label: 'Medication', icon: 'medical', color: '#EC4899' },
    { id: 'feeding', label: 'Feeding', icon: 'restaurant', color: '#F59E0B' },
    { id: 'vet', label: 'Vet Care', icon: 'medkit', color: '#6366F1' },
  ];

  useEffect(() => {
    loadPet();
  }, []);

  const loadPet = async () => {
    const savedPet = await AsyncStorage.getItem('currentPet');
    if (savedPet) {
      const pet = JSON.parse(savedPet);
      setPetId(pet.id);
    }
  };

  const addItem = () => {
    setItems([...items, { text: '', due_time: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: 'text' | 'due_time', value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const formatTimeInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.substring(0, 2);
    if (cleaned.length > 2) formatted += ':' + cleaned.substring(2, 4);
    return formatted;
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your checklist');
      return;
    }

    const validItems = items.filter(item => item.text.trim());
    if (validItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one item to your checklist');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/checklists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pet_id: petId,
          title: title.trim(),
          category,
          items: validItems.map(item => ({
            text: item.text.trim(),
            due_time: item.due_time || null,
          })),
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? 'daily' : null,
        }),
      });

      if (response.ok) {
        router.back();
      } else {
        Alert.alert('Error', 'Could not create checklist');
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
        <Text style={styles.headerTitle}>New Checklist</Text>
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
            placeholder="e.g., Morning Routine"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Items</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <TextInput
                style={styles.itemInput}
                placeholder="Task description"
                placeholderTextColor="#9CA3AF"
                value={item.text}
                onChangeText={(text) => updateItem(index, 'text', text)}
              />
              <TextInput
                style={styles.timeInput}
                placeholder="HH:MM"
                placeholderTextColor="#9CA3AF"
                value={item.due_time}
                onChangeText={(text) => updateItem(index, 'due_time', formatTimeInput(text))}
                keyboardType="numeric"
                maxLength={5}
              />
              {items.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addItemButton} onPress={addItem}>
            <Ionicons name="add" size={20} color="#8B5CF6" />
            <Text style={styles.addItemText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.recurringOption}
          onPress={() => setIsRecurring(!isRecurring)}
        >
          <View style={styles.recurringLeft}>
            <Ionicons name="repeat" size={24} color="#8B5CF6" />
            <View>
              <Text style={styles.recurringTitle}>Repeat Daily</Text>
              <Text style={styles.recurringSubtitle}>Reset checklist every day</Text>
            </View>
          </View>
          <View style={[styles.toggle, isRecurring && styles.toggleActive]}>
            {isRecurring && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
          </View>
        </TouchableOpacity>
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
            <Text style={styles.saveButtonText}>Create Checklist</Text>
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
    marginBottom: 24,
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  itemInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  timeInput: {
    width: 70,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: '#F3E8FF',
    borderRadius: 10,
    gap: 6,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
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
