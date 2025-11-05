import React from 'react';
import { ScrollView, View, ScrollViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export function SafeScreen({
  children,
  scroll = false,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}) {
  const insets = useSafeAreaInsets();

  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? {
        contentInsetAdjustmentBehavior: 'always' as const,
        contentContainerStyle: [{ padding: 16, paddingBottom: insets.bottom + 16 }, contentContainerStyle],
        style: { flex: 1, backgroundColor: '#050812' },
      }
    : {
        style: { flex: 1, padding: 16, paddingBottom: insets.bottom + 16, backgroundColor: '#050812' },
      };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050812' }} edges={['top', 'left', 'right']}>
      {/* We still add a small extra top padding for notched devices */}
      <View style={{ paddingTop: Math.max(insets.top, 8), flex: 1 }}>
        {/* @ts-ignore */}
        <Container {...containerProps}>{children}</Container>
      </View>
    </SafeAreaView>
  );
}
