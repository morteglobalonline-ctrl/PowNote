import React, { useState } from 'react';
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

import { addPet, setCurrentPetId } from '../services/localDb';

export default function AddPetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [petType, setPetType] = useState('dog');
  const [breed, setBreed] = useState('');

  const petTypes = [
    { id: 'dog', icon: 'paw', label: 'Dog' },
    { id: 'cat', icon: 'paw', label: 'Cat' },
    { id: 'bird', icon: 'leaf', label: 'Bird' },
    { id: 'other', icon: 'heart', label: 'Other' },
  ];

  const formatDateInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.substring(0, 4);
    if (cleaned.length > 4) formatted += '-' + cleaned.substring(4, 6);
    if (cleaned.length > 6) formatted += '-' + cleaned.substring(6, 8);
    return formatted;
  };

  const handleSave = async () => {
    if (!name.trim() || !birthDate.trim()) {
      Alert.alert('Missing Info', 'Please enter name and birth date');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    setLoading(true);
    try {
      const pet = await addPet({
        name: name.trim(),
        birth_date: birthDate,
        pet_type: petType,
        custom_pet_type: petType === 'other' ? null : null,
        breed: breed.trim() || null,
        weight: null,
        gender: null,
        photo: null,
      });

      await setCurrentPetId(pet.id);
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Error creating pet (local):', e);
      Alert.alert('Error', 'Could not create pet profile');
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
        <Text style={styles.headerTitle}>Add Pet</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pet Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter name"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Birth Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            value={birthDate}
            onChangeText={(text) => setBirthDate(formatDateInput(text))}
            keyboardType="numeric"
            maxLength={10}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pet Type</Text>
          <View style={styles.petTypeContainer}>
            {petTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.petTypeButton,
                  petType === type.id && styles.petTypeButtonActive,
                ]}
                onPress={() => setPetType(type.id)}
              >
                <Ionicons
                  name={type.icon as any}
                  size={20}
                  color={petType === type.id ? '#FFFFFF' : '#8B5CF6'}
                />
                <Text
                  style={[
                    styles.petTypeText,
                    petType === type.id && styles.petTypeTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Breed (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter breed"
            placeholderTextColor="#9CA3AF"
            value={breed}
            onChangeText={setBreed}
            autoCapitalize="words"
          />
        </View>
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
            <Text style={styles.saveButtonText}>Add Pet</Text>
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
  petTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  petTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    gap: 6,
  },
  petTypeButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  petTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  petTypeTextActive: {
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
