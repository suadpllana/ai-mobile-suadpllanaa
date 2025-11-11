import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
const menuItems = [
  {
    title: 'Profile',
    icon: 'person',
    route: '/(tabs)/profile',
  },
  {
    title: 'Authors',
    icon: 'people',
    route: '/authors',
  },
  {
    title: 'Reading Progress',
    icon: 'book',
    route: '/(tabs)/reading-progress',
  },
];





export default function More() {
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <ThemedView style={styles.menuItem}>
                <Ionicons name={item.icon as any} size={24} style={styles.icon} />
                <ThemedText style={styles.menuText}>{item.title}</ThemedText>
                <Ionicons name="chevron-forward" size={24} style={styles.chevron} />
              </ThemedView>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    padding: 0,
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 0,
    width: 390,
    height: 669,
    backgroundColor: 'rgba(0, 0, 0, 0.83)',

    paddingVertical: 24,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  screen: {
    flex: 1,
    width: 390,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white'
  },
  menuText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 16,
    color: '#333',
  },
  icon: {
    width: 24,
    color: 'gray',
  },
  chevron: {
    color: '#999',
  },
  closeButton: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  closeText: {
    fontSize: 16,
    color: '#333',
  },
});