/**
 * components/layout/PageContainer.tsx
 * OpusHunter — Screen Width / Safe-Area Wrapper
 * 2026-07-01
 *
 * Previously this imported `cn` from `lib/utils`, which didn't exist, so it
 * would fail to build the moment anything imported it (nothing did). Now
 * that lib/utils.ts exists, this is fixed and aligned to the maxWidth
 * tokens already defined in tailwind.config.js (`auth`, `panel`, `content`)
 * instead of a one-off hardcoded background color.
 *
 * Wrap any screen's scroll content in this instead of hand-rolling
 * `maxWidth: 640, alignSelf: 'center'` StyleSheet objects per-file — that
 * duplication across profile.tsx / security.tsx / api-keys.tsx etc. is a
 * big part of why spacing/width drifts screen to screen.
 *
 *   <PageContainer width="panel">{...}</PageContainer>
 */

import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../lib/utils';

type Width = 'auth' | 'panel' | 'content' | 'full';

const WIDTH_CLASS: Record<Width, string> = {
  auth: 'max-w-auth',
  panel: 'max-w-panel',
  content: 'max-w-content',
  full: '',
};

interface PageContainerProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  width?: Width;
  safeAreaTop?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className,
  width = 'content',
  safeAreaTop = true,
  ...props
}) => {
  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={safeAreaTop ? ['top', 'left', 'right'] : ['left', 'right']}
    >
      <View
        className={cn('w-full flex-1 self-center px-5', WIDTH_CLASS[width], className)}
        {...props}
      >
        {children}
      </View>
    </SafeAreaView>
  );
};