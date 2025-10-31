import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  book: any;
  categoryName?: string;
  rating?: number;
  onEdit: (book: any) => void;
  onDelete: (id: string) => void;
  renderStars: (bookId: string) => React.ReactNode;
  onPress?: (book: any) => void;
  imageUrl?: string | null;
};
export default function BookCard({ book, categoryName, onEdit, onDelete, renderStars, onPress, imageUrl }: Props) {
  return (
    <TouchableOpacity onPress={() => onPress?.(book)} activeOpacity={0.85}>
      <View style={styles.bookCard}>
  <Image
    source={imageUrl ? { uri: imageUrl } : require('../assets/images/image.png')}
    style={styles.thumbnail}
    resizeMode="cover"
  />
        <Text style={styles.bookTitle}>{book.title}</Text>
        <Text style={styles.bookAuthor}>{book.author}</Text>
        {book.description ? <Text style={styles.bookDescription} numberOfLines={2}>{book.description}</Text> : null}
  <Text style={styles.bookCategory}>Category: {categoryName || 'Uncategorized'}</Text>
  {book.status ? <Text style={styles.bookStatus}>Status: {typeof book.status === 'string' ? book.status : String(book.status)}</Text> : null}
        {renderStars(book.id)}
        <View style={styles.bookActions}>
          <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={() => onEdit(book)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => onDelete(book.id)}>
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bookCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
  },
  bookTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
  bookAuthor: { fontSize: 16, color: '#666', marginBottom: 4 },
  bookDescription: { fontSize: 14, color: '#888', marginBottom: 8 },
  bookCategory: { fontSize: 14, color: '#666', marginBottom: 8 },
  bookActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginLeft: 8 },
  editButton: { backgroundColor: '#3b82f6' },
  deleteButton: { backgroundColor: '#dc2626' },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  thumbnail: { width: 100, height: 150, marginBottom: 8 },
  bookStatus: { fontSize: 14, color: '#4b5563', marginBottom: 8 },
});
