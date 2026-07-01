import React from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Settings, User } from 'lucide-react-native';
import { C } from '../../lib/theme';
import { ProfileDropdown } from '../ui/ProfileDropdown';

export function MobileHeader() {
  const isDesktop = Platform.OS === 'web' && window.innerWidth >= 768;
  const router = useRouter();
  
  if (isDesktop) return null; // WebSidebar handles desktop

  return (
    <View style={{
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Platform.OS === 'ios' ? 10 : 20, // rough safe area
      backgroundColor: 'transparent',
      zIndex: 50
    }}>
      {/* Left: Logo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,212,255,0.1)', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(0,212,255,0.2)', borderWidth: 1 }}>
            <Image source={require('../../assets/icon.png')} style={{ width: 18, height: 18 }} resizeMode="contain" />
        </View>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>OPUSHUNTER</Text>
      </View>

      {/* Right: Profile Dropdown or Settings */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <ProfileDropdown />
      </View>
    </View>
  );
}
