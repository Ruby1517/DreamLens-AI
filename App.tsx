import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Splash from './screens/Splash';
import Auth from './screens/Auth';
import RootTabs from './navigation/RootTabs';
import Settings from './screens/Settings';
import Subscription from './screens/Subscription';
import AuthProvider from './state/AuthContext';
import Comments from './screens/Comments';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const qc = new QueryClient();

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    // analytics or splash init later
  }, []);

  return (
    <SafeAreaProvider>
      {/* 👇 Make sure StatusBar is non-translucent so screens start below it */}
      <StatusBar barStyle="light-content" translucent={false} backgroundColor="#050812" />
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <NavigationContainer
          theme={{
            ...DefaultTheme,
            colors: { ...DefaultTheme.colors, background: '#050812' },
          }}
        >
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Splash" component={Splash} />
            <Stack.Screen name="Auth" component={Auth} />
            <Stack.Screen name="RootTabs" component={RootTabs} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="Subscription" component={Subscription} />
            <Stack.Screen name="Comments" component={Comments} />
          </Stack.Navigator>
        </NavigationContainer>
      </AuthProvider>
    </QueryClientProvider>  
    </SafeAreaProvider>
  );
}
