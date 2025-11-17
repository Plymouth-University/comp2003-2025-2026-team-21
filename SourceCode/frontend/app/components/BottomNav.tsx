import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  activeTab: string;
  onTabPress: (tab: string) => void;
}

const TABS = ['events', 'tickets', 'social'];

export default function BottomNav({ activeTab, onTabPress }: Props) {
  return (
    <View style={styles.bottomNav} accessibilityRole="tablist">
      {TABS.map((tab, idx) => (
        <TouchableOpacity
          key={tab}
          accessibilityRole="button"
          accessibilityLabel={`${tab} tab`}
          onPress={() => onTabPress(tab)}
          style={[
            styles.navButton,
            idx !== 0 && styles.navButtonSeparator,
            activeTab === tab && styles.navButtonActive,
          ]}
        >
          <Text style={[styles.navButtonText, activeTab === tab && styles.navButtonTextActive]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    backgroundColor: '#3e0202ff',
    height: 64,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  navButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    borderRadius: 0,
    marginHorizontal: 0,
    backgroundColor: 'transparent',
  },
  navButtonActive: {
    backgroundColor: '#2e0101ff',
  },
  navButtonText: {
    color: '#555454ff',
    fontWeight: '600',
  },
  navButtonTextActive: {
    color: '#FFF',
  },
  navButtonSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
  },
});
