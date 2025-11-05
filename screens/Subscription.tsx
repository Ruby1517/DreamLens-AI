import React from 'react';
import { View, Text } from 'react-native';
import { SafeScreen } from '../components/SafeScreen';

export default function Subscription(){
  return (
   <SafeScreen scroll>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050812', padding: 24 }}>
      <Text style={{ color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 10 }}>DreamLens Pro</Text>
      <Text style={{ color: '#cbd5e1' }}>$9.99/month • HD export • No watermark</Text>
    </View>
    </SafeScreen>
  );
}