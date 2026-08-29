// components/layout/AdaptiveLayout.tsx
import React from 'react';
import { View, Text, useWindowDimensions, TouchableOpacity, Image, Platform, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { BlurView } from 'expo-blur';
import { ProfileDropdown } from '../shared/ProfileDropdown';
import { cn } from '../../lib/utils';
import { C } from '../../lib/theme';
import { Search, Kanban, FolderOpen, User, Settings, ShieldCheck } from 'lucide-react-native';

export const AdaptiveLayout = ({ children }: { children: React.ReactNode }) => {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const pathname = usePathname();

  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = !isDesktop && !isTablet;

  const isChatScreen = pathname.includes('/settings/chat');
  const showMobileNav = isMobile && !isChatScreen;

  const navItems = [
    { Icon: Search, path: '/(tabs)', id: 'discover', title: 'DISCOVER' },
    { Icon: Kanban, path: '/(tabs)/pipeline', id: 'pipeline', title: 'PIPELINE' },
    { Icon: FolderOpen, path: '/(tabs)/vault', id: 'vault', title: 'VAULT' },
    { Icon: User, path: '/(tabs)/profile', id: 'profile', title: 'PROFILE' },
    { Icon: Settings, path: '/(tabs)/settings', id: 'settings', title: 'SETTINGS' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }} className="relative overflow-hidden">
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{ __html: `
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          *::-webkit-scrollbar { display: none !important; }
          html, body { overflow: hidden; height: 100%; width: 100%; margin: 0; padding: 0; background-color: #05070a; }
        `}} />
      )}

      {/* Profile Dropdown Header Anchor */}
      <View className="absolute top-12 right-6 z-[1000]" pointerEvents="box-none">
        <ProfileDropdown />
      </View>

      <View className="flex-row flex-1">
        {/* Desktop / Tablet Sidebar */}
        {(isDesktop || isTablet) && (
          <View style={{ backgroundColor: 'rgba(5, 8, 17, 0.85)', borderRightColor: C.border }} className={cn('border-r pt-12 items-center z-50', isDesktop ? 'w-24' : 'w-20')}>
            <TouchableOpacity onPress={() => router.push('/(tabs)')} className="mb-14">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#22D3EE] to-[#3B82F6] flex items-center justify-center shadow-glow-cyan">
                <Search size={20} color="#05070a" />
              </div>
            </TouchableOpacity>

            <View className="flex-1 mt-4 gap-y-8">
              {navItems.map((item) => {
                const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/(tabs)');
                const iconColor = isActive ? '#22D3EE' : 'rgba(237, 234, 247, 0.6)';

                return (
                  <TouchableOpacity key={item.id} onPress={() => router.push(item.path as any)} className="items-center group">
                    <View className={cn('w-12 h-12 rounded-2xl items-center justify-center transition-all', isActive ? 'bg-[#22D3EE]/10 border border-[#22D3EE]/30 shadow-glow-cyan' : 'bg-transparent')}>
                      <item.Icon size={22} color={iconColor} strokeWidth={isActive ? 2.5 : 1.5} />
                    </View>
                    <Text className={cn('mt-1.5 text-[8px] font-extrabold tracking-[2px] uppercase', isActive ? 'text-[#22D3EE]' : 'text-slate-400')}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Main Application Viewport */}
        <View className="flex-1 h-full overflow-hidden">{children}</View>
      </View>

      {/* Mobile Floating Bottom Navigation */}
      {showMobileNav && (
        <View className="absolute bottom-4 left-6 right-6 h-20 z-[100]" pointerEvents="box-none">
          <BlurView intensity={Platform.OS === 'web' ? 30 : 60} tint="dark" className="flex-row items-center justify-around h-full rounded-[28px] border border-white/10 bg-[#05080d]/80 overflow-hidden shadow-2xl">
            {navItems.map((item) => {
              const isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== '/(tabs)');
              const iconColor = isActive ? '#22D3EE' : 'rgba(237, 234, 247, 0.6)';

              return (
                <TouchableOpacity key={item.id} onPress={() => router.push(item.path as any)} className="items-center justify-center w-16 h-full">
                  <item.Icon size={22} color={iconColor} strokeWidth={isActive ? 2.5 : 1.5} />
                  {isActive && <View className="absolute bottom-3 w-1.5 h-1.5 rounded-full bg-[#22D3EE] shadow-glow-cyan" />}
                </TouchableOpacity>
              );
            })}
          </BlurView>
        </View>
      )}
    </View>
  );
};