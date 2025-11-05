import React from 'react';
import { ScrollView, Text } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function Challenges(){
  return (
    <SafeScreen scroll>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 }}>AI Challenges</Text>
      {/* populate later with API */}
    </SafeScreen>
  );
}