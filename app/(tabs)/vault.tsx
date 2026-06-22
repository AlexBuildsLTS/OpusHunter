import React, { useState } from 'react';
import { View, Text, Image, Pressable, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { usePipelineStore } from '../../store/usePipelineStore';
import Animated, { FadeInDown } from 'react-native-reanimated';

const C = { cyan: '#00D4FF', purple: '#7B5EA7', bg: '#0A1419', border: 'rgba(120,200,240,0.09)' };

function AmbientBg() {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 45% at 100% 100%, rgba(0,180,210,0.07) 0%, transparent 65%)' }} />
      {/* @ts-ignore */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 35% at 0% 0%, rgba(90,40,160,0.06) 0%, transparent 60%)' }} />
    </View>
  );
}

export default function VaultScreen() {
  const { setCurrentCV } = usePipelineStore();
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      setUploading(true);
      setStatus({ msg: 'Encrypting & uploading...', ok: true });
      const file = result.assets[0];
      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(file.uri)).blob();
        const { data, error } = await supabase.storage.from('vault').upload(fileName, blob, { contentType: 'application/pdf' });
        if (error) throw error;
        setCurrentCV(data.path);
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const arrayBuffer = decode(base64);
        const { data, error } = await supabase.storage.from('vault').upload(fileName, arrayBuffer, { contentType: 'application/pdf' });
        if (error) throw error;
        setCurrentCV(data.path);
      }
      setStatus({ msg: 'CV vaulted successfully.', ok: true });
    } catch (e: any) {
      setStatus({ msg: e.message, ok: false });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <AmbientBg />
      <View style={{ flex: 1, paddingTop: Platform.OS === 'web' ? 40 : 60, paddingHorizontal: 22 }}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 36, gap: 14 }}>
          <Image source={require('../../assets/icon.png')} style={{ width: 38, height: 38, borderRadius: 10 }} resizeMode="contain" />
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#D8E4EC', letterSpacing: -0.5 }}>Secure Vault</Text>
            <Text style={{ marginTop: 3, fontSize: 12, color: 'rgba(216,228,236,0.4)' }}>Upload your base CV for pipeline matching.</Text>
          </View>
        </Animated.View>

        {/* Upload card */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Pressable
            onPress={handleFileUpload}
            disabled={uploading}
            style={({ pressed }) => ({
              borderRadius: 24,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: pressed ? C.purple : `${C.purple}50`,
              backgroundColor: pressed ? `${C.purple}0A` : `${C.purple}07`,
              padding: 40,
              alignItems: 'center',
            })}
          >
            {uploading ? (
              <>
                <ActivityIndicator size="large" color={C.cyan} style={{ marginBottom: 16 }} />
                <Text style={{ color: C.cyan, fontWeight: '600', fontSize: 13 }}>Uploading...</Text>
              </>
            ) : (
              <>
                <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: `${C.purple}18`, borderWidth: 1, borderColor: `${C.purple}35`, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 26, color: C.purple }}>⇪</Text>
                </View>
                <Text style={{ color: '#D8E4EC', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Core CV Document</Text>
                <Text style={{ color: 'rgba(216,228,236,0.38)', fontSize: 12, marginBottom: 24 }}>PDF only · Max 5MB</Text>
                <View style={{ paddingHorizontal: 28, paddingVertical: 11, borderRadius: 100, borderWidth: 1, borderColor: `${C.cyan}50`, backgroundColor: `${C.cyan}0D` }}>
                  <Text style={{ color: C.cyan, fontWeight: '700', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Select File</Text>
                </View>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Status */}
        {status && (
          <Animated.View entering={FadeInDown.springify()} style={{ marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: status.ok ? `${C.cyan}30` : 'rgba(232,67,106,0.3)', backgroundColor: status.ok ? `${C.cyan}08` : 'rgba(232,67,106,0.08)' }}>
            <Text style={{ color: status.ok ? C.cyan : '#E8436A', fontSize: 13, fontWeight: '500' }}>{status.msg}</Text>
          </Animated.View>
        )}

      </View>
    </View>
  );
}

function decode(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
