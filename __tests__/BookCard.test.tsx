/**
 * Example tests for BookCard component
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import BookCard from '../BookCard';

describe('BookCard', () => {
  const mockBook = {
    id: '1',
    title: 'Test Book',
    author: 'Test Author',
    description: 'Test Description',
    user_id: 'user-1',
  };

  const mockProps = {
    book: mockBook,
    onDelete: jest.fn(),
    renderStars: jest.fn(() => null),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders book information correctly', () => {
    const { getByText } = render(<BookCard {...mockProps} />);

    expect(getByText('Test Book')).toBeTruthy();
    expect(getByText('Test Author')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<BookCard {...mockProps} onPress={onPress} />);

    fireEvent.press(getByText('Test Book'));
    expect(onPress).toHaveBeenCalledWith(mockBook);
  });

  it('shows edit button when onEdit is provided', () => {
    const onEdit = jest.fn();
    const { getByLabelText } = render(<BookCard {...mockProps} onEdit={onEdit} />);

    const editButton = getByLabelText('Edit book');
    expect(editButton).toBeTruthy();
  });

  it('handles delete action', () => {
    const { getByLabelText } = render(<BookCard {...mockProps} />);

    const deleteButton = getByLabelText('Delete book');
    fireEvent.press(deleteButton);

    expect(mockProps.onDelete).toHaveBeenCalledWith(mockBook.id);
  });

  it('displays category name when provided', () => {
    const { getByText } = render(
      <BookCard {...mockProps} categoryName="Fiction" />
    );

    expect(getByText('Fiction')).toBeTruthy();
  });
});
