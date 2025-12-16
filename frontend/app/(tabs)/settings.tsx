import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Pet {
  id: string;
  name: string;
  pet_type: string;
}

interface Reminder {
  id: string;
  title: string;
  reminder_time: string;
  category: string;
  is_active: boolean;
  is_recurring: boolean;
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pet, setPet] = useState<Pet | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const savedPet = await AsyncStorage.getItem('currentPet');
      if (savedPet) {
        const petData = JSON.parse(savedPet);
        setPet(petData);

        const response = await fetch(`${API_URL}/api/reminders?pet_id=${petData.id}&is_active=true`);
        if (response.ok) {
          const data = await response.json();
          setReminders(data);
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

  const toggleReminder = async (reminderId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/reminders/${reminderId}/toggle`, {
        method: 'PATCH',
      });
      if (response.ok) {
        const data = await response.json();
        setReminders(prev =>
          prev.map(r => (r.id === reminderId ? { ...r, is_active: data.is_active } : r))
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not toggle reminder');
    }
  };

  const deleteReminder = async (reminderId: string) => {
    Alert.alert('Delete Reminder', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/reminders/${reminderId}`, { method: 'DELETE' });
            setReminders(prev => prev.filter(r => r.id !== reminderId));
          } catch (e) {
            Alert.alert('Error', 'Could not delete reminder');
          }
        },
      },
    ]);
  };

  const handleSwitchPet = async () => {
    Alert.alert('Switch Pet', 'Do you want to switch to a different pet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          await AsyncStorage.removeItem('currentPet');
          await AsyncStorage.removeItem('chatSessionId');
          // Use dismissAll to clear the stack and navigate to root
          while (router.canGoBack()) {
            router.back();
          }
          router.replace('/');
        },
      },
    ]);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'medication': return 'medical';
      case 'feeding': return 'restaurant';
      case 'walk': return 'walk';
      default: return 'notifications';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medication': return '#EC4899';
      case 'feeding': return '#F59E0B';
      case 'walk': return '#10B981';
      default: return '#3B82F6';
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {/* Reminders Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/add-reminder')}
          >
            <Ionicons name="add" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyText}>No reminders set</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/add-reminder')}
            >
              <Text style={styles.emptyButtonText}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderLeft}>
                <View
                  style={[
                    styles.reminderIcon,
                    { backgroundColor: getCategoryColor(reminder.category) + '20' },
                  ]}
                >
                  <Ionicons
                    name={getCategoryIcon(reminder.category) as any}
                    size={18}
                    color={getCategoryColor(reminder.category)}
                  />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderTitle}>{reminder.title}</Text>
                  <View style={styles.reminderMeta}>
                    <Ionicons name="time-outline" size={12} color="#6B7280" />
                    <Text style={styles.reminderTime}>{reminder.reminder_time}</Text>
                    {reminder.is_recurring && (
                      <>
                        <Ionicons name="repeat" size={12} color="#8B5CF6" />
                        <Text style={styles.recurringLabel}>Recurring</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.reminderRight}>
                <Switch
                  value={reminder.is_active}
                  onValueChange={() => toggleReminder(reminder.id)}
                  trackColor={{ false: '#E5E7EB', true: '#C4B5FD' }}
                  thumbColor={reminder.is_active ? '#8B5CF6' : '#9CA3AF'}
                />
                <TouchableOpacity
                  onPress={() => deleteReminder(reminder.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-pet')}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="paw" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.menuText}>Edit Pet Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="swap-horizontal" size={20} color="#EF4444" />
            </View>
            <Text style={styles.menuText}>Switch Pet</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Pawnote</Text>
        <Text style={styles.infoText}>Your pet's care companion</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  reminderTime: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 8,
  },
  recurringLabel: {
    fontSize: 12,
    color: '#8B5CF6',
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
