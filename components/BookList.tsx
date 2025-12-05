/**
 * Book List Component
 * Extracted from home.tsx for better maintainability
 */

import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import BookCard from './BookCard';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import type { Book, Review } from '../types/common';

interface BookListProps {
  books: Book[];
  loading: boolean;
  searchQuery?: string;
  onEdit?: (book: Book) => void;
  onDelete: (id: string) => void;
  onPress?: (book: Book) => void;
  getCategoryName?: (categoryId?: string | null) => string;
  renderStars?: (bookId: string) => React.ReactNode;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  showSortControls?: boolean;
  emptyMessage?: string;
}

export const BookList: React.FC<BookListProps> = ({
  books,
  loading,
  searchQuery,
  onEdit,
  onDelete,
  onPress,
  getCategoryName,
  renderStars,
  onMoveUp,
  onMoveDown,
  showSortControls = false,
  emptyMessage = 'No books found',
}) => {
  if (loading) {
    return <LoadingState message="Loading books..." />;
  }

  if (books.length === 0) {
    return (
      <EmptyState
        icon="book-outline"
        title={searchQuery ? 'No matching books' : 'No books yet'}
        description={
          searchQuery
            ? 'Try a different search term'
            : 'Add your first book to get started'
        }
      />
    );
  }

  return (
    <FlatList
      data={books}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <View>
          <BookCard
            book={item}
            categoryName={getCategoryName?.(item.category_id)}
            onEdit={onEdit}
            onDelete={onDelete}
            onPress={onPress}
            renderStars={renderStars || (() => null)}
          />
          {showSortControls && (
            <View style={styles.sortControls}>
              {/* Sort controls implementation */}
            </View>
          )}
        </View>
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 20,
  },
  sortControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
});
