// app/(tabs)/_layout.tsx
import { Slot } from 'expo-router';
import { ResponsiveNavShell } from '../../components/shared/ResponsiveNavShell';

export default function TabsLayout() {
  return (
    <ResponsiveNavShell>
      <Slot />
    </ResponsiveNavShell>
  );
}