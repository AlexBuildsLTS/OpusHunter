import React from 'react';
import { Text, TextProps } from 'react-native';

interface LiquidNeonTextProps extends TextProps {
  variant?: 'cyan' | 'purple' | 'pink' | 'white';
  children: React.ReactNode;
  style?: any;
}

const variants = {
  cyan: { color: '#00D4FF' },
  purple: { color: '#7B5EA7' },
  pink: { color: '#E8436A' },
  white: { color: '#D8E4EC' },
};

export function LiquidNeonText({
  variant = 'cyan',
  children,
  style,
  ...props
}: LiquidNeonTextProps) {
  return (
    <Text
      style={[{ fontWeight: '700', letterSpacing: 0.3 }, variants[variant], style]}
      {...props}
    >
      {children}
    </Text>
  );
}