import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Pet {
  id: string;
  name: string;
  birth_date: string;
  pet_type: string;
  custom_pet_type?: string;
  breed?: string;
  weight?: number;
  photo?: string;
}

interface Checklist {
  id: string;
  title: string;
  category: string;
  items: { id: string; text: string; completed: boolean }[];
}

interface Reminder {
  id: string;
  title: string;
  reminder_time: string;
  category: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<Pet | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const savedPet = await AsyncStorage.getItem('currentPet');
      if (savedPet) {
        const petData = JSON.parse(savedPet);
        setPet(petData);

        // Load checklists
        const clRes = await fetch(`${API_URL}/api/checklists?pet_id=${petData.id}`);
        if (clRes.ok) {
          const data = await clRes.json();
          setChecklists(data.slice(0, 3)); // Show top 3
        }

        // Load reminders
        const remRes = await fetch(`${API_URL}/api/reminders?pet_id=${petData.id}`);
        if (remRes.ok) {
          const data = await remRes.json();
          setReminders(data.slice(0, 3)); // Show top 3
        }
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPetAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} old`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} old`;
    } else {
      const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} day${days !== 1 ? 's' : ''} old`;
    }
  };

  const getPetIcon = (type: string) => {
    switch (type) {
      case 'cat': return 'paw';
      case 'bird': return 'leaf';
      case 'other': return 'heart';
      default: return 'paw';
    }
  };

  const getPetDisplayType = (pet: Pet) => {
    if (pet.pet_type === 'other' && pet.custom_pet_type) {
      return pet.custom_pet_type.charAt(0).toUpperCase() + pet.custom_pet_type.slice(1);
    }
    return pet.pet_type.charAt(0).toUpperCase() + pet.pet_type.slice(1);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication': return 'medical';
      case 'feeding': return 'restaurant';
      case 'walk': return 'walk';
      case 'vet': return 'medkit';
      default: return 'checkbox';
    }
  };

  const getCompletionRate = (items: { completed: boolean }[]) => {
    if (!items || items.length === 0) return 0;
    const completed = items.filter(i => i.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  if (!pet) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good day!</Text>
          <Text style={styles.headerTitle}>{pet.name}'s Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push('/edit-pet')}
        >
          <Ionicons name="create-outline" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Pet Card */}
      <View style={styles.petCard}>
        <View style={styles.petImageContainer}>
          {pet.photo ? (
            <Image source={{ uri: pet.photo }} style={styles.petImage} />
          ) : (
            <View style={styles.petImagePlaceholder}>
              <Ionicons name={getPetIcon(pet.pet_type)} size={48} color="#8B5CF6" />
            </View>
          )}
        </View>
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Text style={styles.petDetails}>
            {pet.pet_type.charAt(0).toUpperCase() + pet.pet_type.slice(1)}
            {pet.breed ? ` • ${pet.breed}` : ''}
          </Text>
          <Text style={styles.petAge}>{getPetAge(pet.birth_date)}</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/add-checklist')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#EDE9FE' }]}>
            <Ionicons name="add" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.quickActionText}>Checklist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/add-vet-visit')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FCE7F3' }]}>
            <Ionicons name="medical" size={24} color="#EC4899" />
          </View>
          <Text style={styles.quickActionText}>Vet Visit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/add-reminder')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="notifications" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.quickActionText}>Reminder</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/(tabs)/ai')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="sparkles" size={24} color="#10B981" />
          </View>
          <Text style={styles.quickActionText}>Ask AI</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Tasks */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Checklists</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/checklists')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {checklists.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkbox-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyCardText}>No checklists yet</Text>
            <TouchableOpacity
              style={styles.emptyCardButton}
              onPress={() => router.push('/add-checklist')}
            >
              <Text style={styles.emptyCardButtonText}>Create one</Text>
            </TouchableOpacity>
          </View>
        ) : (
          checklists.map((cl) => (
            <TouchableOpacity
              key={cl.id}
              style={styles.checklistCard}
              onPress={() => router.push('/(tabs)/checklists')}
            >
              <View style={styles.checklistIcon}>
                <Ionicons name={getCategoryIcon(cl.category) as any} size={20} color="#8B5CF6" />
              </View>
              <View style={styles.checklistInfo}>
                <Text style={styles.checklistTitle}>{cl.title}</Text>
                <Text style={styles.checklistProgress}>
                  {cl.items.filter(i => i.completed).length}/{cl.items.length} completed
                </Text>
              </View>
              <View style={styles.progressCircle}>
                <Text style={styles.progressText}>{getCompletionRate(cl.items)}%</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Upcoming Reminders */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/settings')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyCardText}>No reminders set</Text>
            <TouchableOpacity
              style={styles.emptyCardButton}
              onPress={() => router.push('/add-reminder')}
            >
              <Text style={styles.emptyCardButtonText}>Add reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reminders.map((rem) => (
            <View key={rem.id} style={styles.reminderCard}>
              <View style={styles.reminderIcon}>
                <Ionicons name={getCategoryIcon(rem.category) as any} size={18} color="#3B82F6" />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTitle}>{rem.title}</Text>
                <Text style={styles.reminderTime}>{rem.reminder_time}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  petImageContainer: {
    marginRight: 16,
  },
  petImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  petImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  petDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  petAge: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickActionButton: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAll: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyCardText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptyCardButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  emptyCardButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  checklistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  checklistIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checklistInfo: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  checklistProgress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  reminderTime: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
});
