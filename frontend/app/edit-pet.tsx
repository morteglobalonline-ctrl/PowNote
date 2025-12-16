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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

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

export default function EditPetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pet, setPet] = useState<Pet | null>(null);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [petType, setPetType] = useState('dog');
  const [customPetType, setCustomPetType] = useState('');
  const [breed, setBreed] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  const petTypes = [
    { id: 'dog', icon: 'paw', label: 'Dog' },
    { id: 'cat', icon: 'paw', label: 'Cat' },
    { id: 'bird', icon: 'leaf', label: 'Bird' },
    { id: 'other', icon: 'heart', label: 'Other' },
  ];

  useEffect(() => {
    loadPet();
  }, []);

  const loadPet = async () => {
    const savedPet = await AsyncStorage.getItem('currentPet');
    if (savedPet) {
      const petData = JSON.parse(savedPet);
      setPet(petData);
      setName(petData.name);
      setBirthDate(petData.birth_date);
      setPetType(petData.pet_type);
      setCustomPetType(petData.custom_pet_type || '');
      setBreed(petData.breed || '');
      setWeight(petData.weight ? String(petData.weight) : '');
      setPhoto(petData.photo || null);
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

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your photos to add a pet picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSave = async () => {
    if (!pet) return;
    if (!name.trim() || !birthDate.trim()) {
      Alert.alert('Missing Info', 'Please enter name and birth date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pets/${pet.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          birth_date: birthDate,
          pet_type: petType,
          custom_pet_type: petType === 'other' ? customPetType.trim() || null : null,
          breed: breed.trim() || null,
          weight: weight ? parseFloat(weight) : null,
          photo: photo,
        }),
      });

      if (response.ok) {
        const updatedPet = await response.json();
        await AsyncStorage.setItem('currentPet', JSON.stringify(updatedPet));
        router.back();
      } else {
        Alert.alert('Error', 'Could not update pet profile');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pet) return;

    Alert.alert(
      'Delete Pet',
      'Are you sure you want to delete this pet? This will remove all checklists, vet visits, and reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fetch(`${API_URL}/api/pets/${pet.id}`, { method: 'DELETE' });
              await AsyncStorage.removeItem('currentPet');
              await AsyncStorage.removeItem('chatSessionId');
              router.replace('/');
            } catch (e) {
              Alert.alert('Error', 'Could not delete pet');
            }
          },
        },
      ]
    );
  };

  if (!pet) {
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
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Pet</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={32} color="#9CA3AF" />
              <Text style={styles.photoText}>Add Photo</Text>
            </View>
          )}
          <View style={styles.editPhotoButton}>
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Pet Name *</Text>
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
          <Text style={styles.label}>Birth Date *</Text>
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

        {/* Custom pet type - only for "Other" */}
        {petType === 'other' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pet Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Rabbit, Turtle, Hamster"
              placeholderTextColor="#9CA3AF"
              value={customPetType}
              onChangeText={setCustomPetType}
              autoCapitalize="words"
            />
          </View>
        )}

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Weight (Optional)</Text>
          <View style={styles.weightInputContainer}>
            <TextInput
              style={styles.weightInput}
              placeholder="Enter weight"
              placeholderTextColor="#9CA3AF"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
            <Text style={styles.weightUnit}>lb</Text>
          </View>
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
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  weightInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  weightUnit: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
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
