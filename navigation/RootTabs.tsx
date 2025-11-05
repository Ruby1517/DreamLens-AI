import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feed from '../screens/Feed';
import Editor from '../screens/Editor';
import Challenges from '../screens/Challenges';
import Profile from '../screens/Profile';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();

export default function RootTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#0b1026', 
          borderTopColor: '#1f2937' ,
          paddingBottom: Math.max(insets.bottom - 4, 6), // lift above home indicator
          height: 56 + Math.max(insets.bottom - 4, 6),
        },  
        tabBarActiveTintColor: '#a78bfa',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabel: ({ color, children }) => (
          <Text style={{ color, fontSize: 12 }}>{children}</Text>
        ),
      }}
    >
      <Tab.Screen name="Feed" component={Feed} />
      <Tab.Screen name="Editor" component={Editor} />
      <Tab.Screen name="Challenges" component={Challenges} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}