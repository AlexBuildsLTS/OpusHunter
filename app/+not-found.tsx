import { Link, Stack } from 'expo-router';
import { View, Text } from 'react-native';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: 'Oops!' }} />
            <View className="flex-1 bg-surface-bg items-center justify-center p-6">
                <Text className="text-pink-500 text-6xl font-black mb-4">404</Text>
                <Text className="text-white text-lg mb-8">This page does not exist in the pipeline.</Text>
                <Link href="/" className="px-8 py-4 bg-brand-cyan/10 border border-brand-cyan/30 rounded-2xl">
                    <Text className="text-cyan-400">Go Home</Text>
                </Link>
            </View>
        </>
    );
}
