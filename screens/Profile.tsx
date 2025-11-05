import React from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function Profile({ navigation }: any){
  return (
    <SafeScreen scroll>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#0b1026', borderWidth: 1, borderColor: '#1f2937' }} />
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 }}>@you</Text>
        <Text style={{ color: '#94a3b8', marginTop: 6 }}>Pro trial — 7 days left</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ backgroundColor: '#0b1026', borderRadius: 16, padding: 16, marginVertical: 8, borderWidth: 1, borderColor: '#1f2937' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Settings</Text>
        <Text style={{ color: '#94a3b8', marginTop: 4 }}>Privacy, defaults, cache</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Subscription')} style={{ backgroundColor: '#0b1026', borderRadius: 16, padding: 16, marginVertical: 8, borderWidth: 1, borderColor: '#1f2937' }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Upgrade to Pro</Text>
        <Text style={{ color: '#94a3b8', marginTop: 4 }}>HD export, no watermark, faster renders</Text>
      </TouchableOpacity>
    </SafeScreen>
  );
}