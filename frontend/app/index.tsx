import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'welcome' | 'access' | 'new'>('welcome');
  const [petName, setPetName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [petType, setPetType] = useState('dog');
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    checkExistingAccess();
  }, []);

  const checkExistingAccess = async () => {
    try {
      const savedPet = await AsyncStorage.getItem('currentPet');
      if (savedPet) {
        router.replace('/(tabs)');
      }
    } catch (e) {
      console.log('No saved access');
    } finally {
      setCheckingAccess(false);
    }
  };

  const handleAccess = async () => {
    if (!petName.trim() || !birthDate.trim()) {
      Alert.alert('Missing Info', 'Please enter pet name and birth date');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pet_name: petName, birth_date: birthDate }),
      });

      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('currentPet', JSON.stringify(data.pet));
        router.replace('/(tabs)');
      } else {
        Alert.alert('Not Found', 'Pet not found. Check the name and birth date, or create a new profile.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setLoading(false);
    }
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

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: petName,
          birth_date: birthDate,
          pet_type: petType,
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
      setLoading(false);
    }
  };

  const formatDateInput = (text: string) => {
    // Auto-format as user types
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 4);
    }
    if (cleaned.length > 4) {
      formatted += '-' + cleaned.substring(4, 6);
    }
    if (cleaned.length > 6) {
      formatted += '-' + cleaned.substring(6, 8);
    }
    return formatted;
  };

  if (checkingAccess) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const petTypes = [
    { id: 'dog', icon: 'paw', label: 'Dog' },
    { id: 'cat', icon: 'paw', label: 'Cat' },
    { id: 'bird', icon: 'leaf', label: 'Bird' },
    { id: 'other', icon: 'heart', label: 'Other' },
  ];

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

        {mode === 'welcome' && (
          <View style={styles.welcomeContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setMode('access')}
            >
              <Ionicons name="log-in-outline" size={24} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Access My Pet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setMode('new')}
            >
              <Ionicons name="add-circle-outline" size={24} color="#8B5CF6" />
              <Text style={styles.secondaryButtonText}>Add New Pet</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'access' && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Access Your Pet</Text>
            <Text style={styles.formSubtitle}>
              Enter your pet's name and birth date
            </Text>

            <View style={styles.inputContainer}>
              <Ionicons name="paw" size={20} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Pet Name"
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
                placeholder="Birth Date (YYYY-MM-DD)"
                placeholderTextColor="#A0A0A0"
                value={birthDate}
                onChangeText={(text) => setBirthDate(formatDateInput(text))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleAccess}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => {
                setMode('welcome');
                setPetName('');
                setBirthDate('');
              }}
            >
              <Text style={styles.linkText}>Back</Text>
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
                placeholder="Pet Name"
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
                placeholder="Birth Date (YYYY-MM-DD)"
                placeholderTextColor="#A0A0A0"
                value={birthDate}
                onChangeText={(text) => setBirthDate(formatDateInput(text))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <Text style={styles.petTypeLabel}>Pet Type</Text>
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
                    size={24}
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

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleCreatePet}
              disabled={loading}
            >
              {loading ? (
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
              onPress={() => {
                setMode('welcome');
                setPetName('');
                setBirthDate('');
              }}
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
    marginBottom: 48,
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
  welcomeContainer: {
    gap: 16,
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
  petTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
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
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
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
