import { Redirect } from 'expo-router';
import React from 'react';

import { useAppState } from '@/src/store/AppState';

/** Boot gate: first run goes through onboarding, everyone else lands on Today. */
export default function Index() {
  const { onboarded } = useAppState();
  return <Redirect href={onboarded ? '/(tabs)' : '/onboarding'} />;
}
