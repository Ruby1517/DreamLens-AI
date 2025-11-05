import React from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function Settings(){
  return (
    <SafeScreen>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 }}>Settings</Text>
    </SafeScreen>
  );
}