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

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  due_time?: string;
}

interface Checklist {
  id: string;
  pet_id: string;
  title: string;
  category: string;
  items: ChecklistItem[];
  is_recurring: boolean;
}

export default function ChecklistsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', label: 'All', icon: 'list' },
    { id: 'daily', label: 'Daily', icon: 'sunny' },
    { id: 'medication', label: 'Meds', icon: 'medical' },
    { id: 'feeding', label: 'Food', icon: 'restaurant' },
    { id: 'vet', label: 'Vet', icon: 'medkit' },
  ];

  const loadChecklists = async () => {
    try {
      const savedPet = await AsyncStorage.getItem('currentPet');
      if (savedPet) {
        const pet = JSON.parse(savedPet);
        const query = activeCategory === 'all' ? '' : `&category=${activeCategory}`;
        const response = await fetch(`${API_URL}/api/checklists?pet_id=${pet.id}${query}`);
        if (response.ok) {
          const data = await response.json();
          setChecklists(data);
        }
      }
    } catch (e) {
      console.error('Error loading checklists:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChecklists();
    }, [activeCategory])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChecklists();
    setRefreshing(false);
  };

  const toggleItem = async (checklistId: string, itemId: string, currentValue: boolean) => {
    try {
      await fetch(
        `${API_URL}/api/checklists/${checklistId}/items/${itemId}?completed=${!currentValue}`,
        { method: 'PATCH' }
      );
      // Update local state
      setChecklists(prev =>
        prev.map(cl => {
          if (cl.id === checklistId) {
            return {
              ...cl,
              items: cl.items.map(item =>
                item.id === itemId ? { ...item, completed: !currentValue } : item
              ),
            };
          }
          return cl;
        })
      );
    } catch (e) {
      Alert.alert('Error', 'Could not update item');
    }
  };

  const deleteChecklist = async (checklistId: string) => {
    Alert.alert('Delete Checklist', 'Are you sure you want to delete this checklist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/checklists/${checklistId}`, { method: 'DELETE' });
            setChecklists(prev => prev.filter(cl => cl.id !== checklistId));
          } catch (e) {
            Alert.alert('Error', 'Could not delete checklist');
          }
        },
      },
    ]);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medication': return '#EC4899';
      case 'feeding': return '#F59E0B';
      case 'daily': return '#10B981';
      case 'vet': return '#6366F1';
      default: return '#8B5CF6';
    }
  };

  const filteredChecklists = activeCategory === 'all'
    ? checklists
    : checklists.filter(cl => cl.category === activeCategory);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Checklists</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-checklist')}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryButton,
              activeCategory === cat.id && styles.categoryButtonActive,
            ]}
            onPress={() => setActiveCategory(cat.id)}
          >
            <Ionicons
              name={cat.icon as any}
              size={16}
              color={activeCategory === cat.id ? '#FFFFFF' : '#6B7280'}
            />
            <Text
              style={[
                styles.categoryText,
                activeCategory === cat.id && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Checklists */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
      >
        {filteredChecklists.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No checklists yet</Text>
            <Text style={styles.emptySubtitle}>Create your first checklist to start tracking</Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/add-checklist')}
            >
              <Text style={styles.createButtonText}>Create Checklist</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredChecklists.map((checklist) => (
            <View key={checklist.id} style={styles.checklistCard}>
              <View style={styles.checklistHeader}>
                <View style={styles.checklistTitleRow}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: getCategoryColor(checklist.category) },
                    ]}
                  />
                  <Text style={styles.checklistTitle}>{checklist.title}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => deleteChecklist(checklist.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {checklist.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.checklistItem}
                  onPress={() => toggleItem(checklist.id, item.id, item.completed)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      item.completed && styles.checkboxChecked,
                    ]}
                  >
                    {item.completed && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.itemText,
                      item.completed && styles.itemTextCompleted,
                    ]}
                  >
                    {item.text}
                  </Text>
                  {item.due_time && (
                    <Text style={styles.itemTime}>{item.due_time}</Text>
                  )}
                </TouchableOpacity>
              ))}

              <View style={styles.checklistFooter}>
                <Text style={styles.completionText}>
                  {checklist.items.filter(i => i.completed).length}/{checklist.items.length} completed
                </Text>
                {checklist.is_recurring && (
                  <View style={styles.recurringBadge}>
                    <Ionicons name="repeat" size={12} color="#8B5CF6" />
                    <Text style={styles.recurringText}>Recurring</Text>
                  </View>
                )}
              </View>
            </View>
          ))
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
  categoriesContainer: {
    maxHeight: 48,
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#FFFFFF',
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
  checklistCard: {
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
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  checklistTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  itemTime: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  checklistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  completionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
  },
  recurringText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
});
