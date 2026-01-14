import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrateIfNeeded } from '../services/localDb';

export default function RootLayout() {
  useEffect(() => {
    migrateIfNeeded().catch(() => {
      // intentionally silent – migration must never crash app
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FFFFFF' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-pet" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-pet" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-checklist" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-vet-visit" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-reminder" options={{ presentation: 'modal' }} />
        <Stack.Screen name="alarm-sounds" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
