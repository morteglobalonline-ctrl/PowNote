import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface VetVisit {
  id: string;
  pet_id: string;
  visit_date: string;
  vet_name?: string;
  reason: string;
  notes?: string;
  instructions: string[];
  follow_up_date?: string;
}

export default function VetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [visits, setVisits] = useState<VetVisit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadVisits = async () => {
    try {
      const savedPet = await AsyncStorage.getItem('currentPet');
      if (savedPet) {
        const pet = JSON.parse(savedPet);
        const response = await fetch(`${API_URL}/api/vet-visits?pet_id=${pet.id}`);
        if (response.ok) {
          const data = await response.json();
          setVisits(data);
        }
      }
    } catch (e) {
      console.error('Error loading vet visits:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadVisits();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadVisits();
    setRefreshing(false);
  };

  const convertToChecklist = async (visitId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/vet-visits/${visitId}/to-checklist`, {
        method: 'POST',
      });
      if (response.ok) {
        Alert.alert('Success', 'Vet instructions converted to checklist!');
        router.push('/(tabs)/checklists');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Could not convert to checklist');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not convert to checklist');
    }
  };

  const deleteVisit = async (visitId: string) => {
    Alert.alert('Delete Visit', 'Are you sure you want to delete this vet visit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/vet-visits/${visitId}`, { method: 'DELETE' });
            setVisits(prev => prev.filter(v => v.id !== visitId));
          } catch (e) {
            Alert.alert('Error', 'Could not delete visit');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isUpcoming = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const upcomingVisits = visits.filter(v => isUpcoming(v.visit_date));
  const pastVisits = visits.filter(v => !isUpcoming(v.visit_date));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vet Visits</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-vet-visit')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        {visits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No vet visits recorded</Text>
            <Text style={styles.emptySubtitle}>Track your pet's vet appointments and instructions</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/add-vet-visit')}
            >
              <Text style={styles.createButtonText}>Add Vet Visit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Upcoming Visits */}
            {upcomingVisits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Upcoming</Text>
                {upcomingVisits.map((visit) => (
                  <View key={visit.id} style={styles.visitCard}>
                    <View style={styles.visitHeader}>
                      <View style={[styles.statusBadge, styles.upcomingBadge]}>
                        <Ionicons name="calendar" size={14} color="#8B5CF6" />
                        <Text style={styles.upcomingText}>{formatDate(visit.visit_date)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteVisit(visit.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.visitReason}>{visit.reason}</Text>
                    {visit.vet_name && (
                      <Text style={styles.vetName}>Dr. {visit.vet_name}</Text>
                    )}
                    {visit.notes && (
                      <Text style={styles.visitNotes}>{visit.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Past Visits */}
            {pastVisits.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past Visits</Text>
                {pastVisits.map((visit) => (
                  <View key={visit.id} style={styles.visitCard}>
                    <View style={styles.visitHeader}>
                      <View style={[styles.statusBadge, styles.pastBadge]}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.pastText}>{formatDate(visit.visit_date)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => deleteVisit(visit.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.visitReason}>{visit.reason}</Text>
                    {visit.vet_name && (
                      <Text style={styles.vetName}>Dr. {visit.vet_name}</Text>
                    )}
                    {visit.notes && (
                      <Text style={styles.visitNotes}>{visit.notes}</Text>
                    )}

                    {visit.instructions.length > 0 && (
                      <View style={styles.instructionsSection}>
                        <Text style={styles.instructionsTitle}>Instructions:</Text>
                        {visit.instructions.map((instruction, index) => (
                          <View key={index} style={styles.instructionItem}>
                            <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
                            <Text style={styles.instructionText}>{instruction}</Text>
                          </View>
                        ))}
                        <TouchableOpacity
                          style={styles.convertButton}
                          onPress={() => convertToChecklist(visit.id)}
                        >
                          <Ionicons name="checkbox-outline" size={16} color="#8B5CF6" />
                          <Text style={styles.convertButtonText}>Convert to Checklist</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {visit.follow_up_date && (
                      <View style={styles.followUp}>
                        <Ionicons name="calendar-outline" size={14} color="#F59E0B" />
                        <Text style={styles.followUpText}>
                          Follow-up: {formatDate(visit.follow_up_date)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
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
    textAlign: 'center',
  },
  createButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  visitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  upcomingBadge: {
    backgroundColor: '#EDE9FE',
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  pastBadge: {
    backgroundColor: '#D1FAE5',
  },
  pastText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  visitReason: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  vetName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  visitNotes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  instructionsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
  },
  convertButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8B5CF6',
  },
  followUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  followUpText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
});
