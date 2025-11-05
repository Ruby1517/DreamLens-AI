import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function Auth({ navigation }: any) {
  return (
   <SafeScreen scroll>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050812', padding: 24 }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 }}>Welcome</Text>
      <Text style={{ color: '#cbd5e1', marginBottom: 16 }}>Sign in to explore DreamLens AI</Text>
      <TouchableOpacity onPress={() => navigation.replace('RootTabs')} style={{ backgroundColor: '#4f46e5', paddingVertical: 14, paddingHorizontal: 22, borderRadius: 16, marginTop: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Continue</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.replace('RootTabs')} style={{ paddingVertical: 12, paddingHorizontal: 22, borderRadius: 16, marginTop: 10, borderColor: '#475569', borderWidth: 1 }}>
        <Text style={{ color: '#cbd5e1' }}>Continue as guest</Text>
      </TouchableOpacity>
    </View>
    </SafeScreen> 
  );
}