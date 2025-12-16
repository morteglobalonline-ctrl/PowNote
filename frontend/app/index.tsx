import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Pet {
  id: string;
  name: string;
  birth_date: string;
  pet_type: string;
  custom_pet_type?: string;
  breed?: string;
  weight?: number;
  gender?: string;
  photo?: string;
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'list' | 'new'>('list');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  
  // New pet form
  const [petName, setPetName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [petType, setPetType] = useState('dog');
  const [customPetType, setCustomPetType] = useState('');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadPets();
    }, [])
  );

  const loadPets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pets`);
      if (response.ok) {
        const data = await response.json();
        setPets(data);
      }
    } catch (e) {
      console.error('Error loading pets:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectPet = async (pet: Pet) => {
    await AsyncStorage.setItem('currentPet', JSON.stringify(pet));
    router.replace('/(tabs)');
  };

  const handleCreatePet = async () => {
    if (!petName.trim() || !birthDate.trim()) {
      Alert.alert('Missing Info', 'Please enter pet name and birth date');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      Alert.alert('Invalid Date', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: petName.trim(),
          birth_date: birthDate,
          pet_type: petType,
          custom_pet_type: petType === 'other' ? customPetType.trim() || null : null,
          breed: breed.trim() || null,
          weight: weight ? parseFloat(weight) : null,
          gender: gender,
        }),
      });

      if (response.ok) {
        const pet = await response.json();
        await AsyncStorage.setItem('currentPet', JSON.stringify(pet));
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Could not create pet profile');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setCreating(false);
    }
  };

  const formatDateInput = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted = cleaned.substring(0, 4);
    if (cleaned.length > 4) formatted += '-' + cleaned.substring(4, 6);
    if (cleaned.length > 6) formatted += '-' + cleaned.substring(6, 8);
    return formatted;
  };

  const getPetDisplayType = (pet: Pet) => {
    if (pet.pet_type === 'other' && pet.custom_pet_type) {
      return pet.custom_pet_type.charAt(0).toUpperCase() + pet.custom_pet_type.slice(1);
    }
    return pet.pet_type.charAt(0).toUpperCase() + pet.pet_type.slice(1);
  };

  const getPetIcon = (type: string) => {
    switch (type) {
      case 'cat': return 'paw';
      case 'bird': return 'leaf';
      case 'other': return 'heart';
      default: return 'paw';
    }
  };

  const petTypes = [
    { id: 'dog', icon: 'paw', label: 'Dog' },
    { id: 'cat', icon: 'paw', label: 'Cat' },
    { id: 'bird', icon: 'leaf', label: 'Bird' },
    { id: 'other', icon: 'heart', label: 'Other' },
  ];

  const resetForm = () => {
    setPetName('');
    setBirthDate('');
    setPetType('dog');
    setCustomPetType('');
    setBreed('');
    setWeight('');
    setGender(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="paw" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>Pawnote</Text>
          <Text style={styles.tagline}>Your pet's care companion</Text>
        </View>

        {mode === 'list' && (
          <View style={styles.listContainer}>
            {pets.length === 0 ? (
              // No pets - show only Create button
              <View style={styles.emptyState}>
                <Ionicons name="paw-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No pets yet</Text>
                <Text style={styles.emptySubtitle}>Add your first pet to get started</Text>
              </View>
            ) : (
              // Show pet list
              <>
                <Text style={styles.listTitle}>Your Pets</Text>
                {pets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    style={styles.petCard}
                    onPress={() => selectPet(pet)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.petCardLeft}>
                      {pet.photo ? (
                        <Image source={{ uri: pet.photo }} style={styles.petCardImage} />
                      ) : (
                        <View style={styles.petCardImagePlaceholder}>
                          <Ionicons name={getPetIcon(pet.pet_type)} size={28} color="#8B5CF6" />
                        </View>
                      )}
                      <View style={styles.petCardInfo}>
                        <Text style={styles.petCardName}>{pet.name}</Text>
                        <Text style={styles.petCardType}>
                          {getPetDisplayType(pet)}
                          {pet.breed ? ` \u2022 ${pet.breed}` : ''}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Create New Pet Button - always visible */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                resetForm();
                setMode('new');
              }}
            >
              <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
              <Text style={styles.createButtonText}>Create New Pet</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'new' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Add Your Pet</Text>
            <Text style={styles.formSubtitle}>
              Create a profile for your furry friend
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="paw" size={20} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Pet Name *"
                placeholderTextColor="#A0A0A0"
                value={petName}
                onChangeText={setPetName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="calendar" size={20} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Birth Date (YYYY-MM-DD) *"
                placeholderTextColor="#A0A0A0"
                value={birthDate}
                onChangeText={(text) => setBirthDate(formatDateInput(text))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <Text style={styles.fieldLabel}>Pet Type</Text>
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

            {/* Custom pet type input - only show when "Other" is selected */}
            {petType === 'other' && (
              <View style={styles.inputContainer}>
                <Ionicons name="help-circle" size={20} color="#8B5CF6" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Pet type (e.g., Rabbit, Turtle, Hamster)"
                  placeholderTextColor="#A0A0A0"
                  value={customPetType}
                  onChangeText={setCustomPetType}
                  autoCapitalize="words"
                />
              </View>
            )}

            {/* Breed field - shown after pet type selected */}
            <View style={styles.inputContainer}>
              <Ionicons name="ribbon" size={20} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Breed (optional)"
                placeholderTextColor="#A0A0A0"
                value={breed}
                onChangeText={setBreed}
                autoCapitalize="words"
              />
            </View>

            {/* Weight field */}
            <View style={styles.inputContainer}>
              <Ionicons name="scale" size={20} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Weight in lb (optional)"
                placeholderTextColor="#A0A0A0"
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
              />
              {weight ? <Text style={styles.unitLabel}>lb</Text> : null}
            </View>

            {/* Gender field */}
            <Text style={styles.fieldLabel}>Gender (optional)</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'male' && styles.genderButtonActive,
                ]}
                onPress={() => setGender(gender === 'male' ? null : 'male')}
              >
                <Ionicons
                  name="male"
                  size={20}
                  color={gender === 'male' ? '#FFFFFF' : '#8B5CF6'}
                />
                <Text
                  style={[
                    styles.genderText,
                    gender === 'male' && styles.genderTextActive,
                  ]}
                >
                  Male
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'female' && styles.genderButtonActive,
                ]}
                onPress={() => setGender(gender === 'female' ? null : 'female')}
              >
                <Ionicons
                  name="female"
                  size={20}
                  color={gender === 'female' ? '#FFFFFF' : '#8B5CF6'}
                />
                <Text
                  style={[
                    styles.genderText,
                    gender === 'female' && styles.genderTextActive,
                  ]}
                >
                  Female
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, creating && styles.disabledButton]}
              onPress={handleCreatePet}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Create Profile</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setMode('list')}
            >
              <Text style={styles.linkText}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    gap: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  petCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  petCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  petCardImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  petCardImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petCardInfo: {
    marginLeft: 14,
    flex: 1,
  },
  petCardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  petCardType: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  formContainer: {
    gap: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#1F2937',
  },
  unitLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
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
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    gap: 8,
  },
  genderButtonActive: {
    backgroundColor: '#8B5CF6',
  },
  genderText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  genderTextActive: {
    color: '#FFFFFF',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.7,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
