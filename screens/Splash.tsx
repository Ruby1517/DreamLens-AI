import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function Splash({ navigation }: any) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace('Auth'), 900);
    return () => clearTimeout(t);
  }, [navigation]);
  return (
    <SafeScreen scroll>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050812' }}>
      <Text style={{ color: '#fff', fontSize: 36, fontWeight: '900' }}>DreamLens AI</Text>
      <Text style={{ color: '#cbd5e1', marginTop: 6 }}>Turn your photos & videos into living stories.</Text>
    </View>
    </SafeScreen>
  );
}