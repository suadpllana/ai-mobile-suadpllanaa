import React from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  book: {
    title?: string;
    author?: string;
    description?: string;
    imageUrl?: string | null;
    source?: string;
  } | null;
};

export default function BookModal({ visible, onClose, book }: Props) {
  if (!book) return null;
  const imageSrc = (book as any).imageUrl || (book as any).image || (book as any).image_url || (book as any).cover_image || null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ScrollView>
            {imageSrc ? (
              <Image source={{ uri: imageSrc }} style={styles.image} resizeMode="contain" />
            ) : null}
            <Text style={styles.title}>{book.title}</Text>
            <Text style={styles.author}>{book.author}</Text>
            {book.description ? <Text style={styles.description}>{book.description}</Text> : <Text style={styles.description}>No description available.</Text>}
            {book.source ? <Text style={styles.source}>Source: {book.source}</Text> : null}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  card: { width: '100%', maxWidth: 600, backgroundColor: '#fff', borderRadius: 12, padding: 16, maxHeight: '90%' },
  image: { width: '100%', height: 220, marginBottom: 12, borderRadius: 8 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  author: { color: '#666', marginBottom: 12 },
  description: { color: '#333', marginBottom: 12 },
  source: { color: '#999', fontSize: 12, marginTop: 8 },
  closeButton: { backgroundColor: '#6b7280', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  closeText: { color: '#fff', fontWeight: '600' },
});
