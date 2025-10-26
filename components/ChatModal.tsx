import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const HUGGING_FACE_API_TOKEN = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY;
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct';

export default function ChatModal({ visible, onClose, userId }: Props) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const validateInput = (text: string) => text && text.trim().length > 0;

  const buildLocalResponse = (book: any, userQuestion: string) => {
    const desc = book.description || 'No description available.';
    return `Here's what I found for "${book.title}" by ${book.author} — ${desc} \n\nIf you'd like, ask for themes, similar books, or a short spoiler-free summary.`;
  };

  const handleSend = async () => {
    if (!validateInput(chatInput)) return;
    if (!userId) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'No authenticated user found.' }]);
      return;
    }

    const userMessage = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      // Try Supabase first to find a book in the user's library
      let book: any = null;
      try {
        const { data: searchResults, error: searchError } = await supabase
          .from('books')
          .select('*')
          .eq('user_id', userId)
          .ilike('title', `%${userMessage}%`)
          .limit(1);
        if (searchError) throw searchError;
        if (searchResults && searchResults.length > 0) book = searchResults[0];
      } catch (err) {
        // ignore supabase lookup errors and continue to external lookup
        book = null;
      }

      // If not found in Supabase, try Google Books API (external)
      if (!book) {
        try {
          const gbResp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(userMessage)}&maxResults=1`);
          if (gbResp.ok) {
            const gbData = await gbResp.json();
            const item = gbData.items?.[0];
            if (item && item.volumeInfo) {
              const vi = item.volumeInfo;
              book = {
                title: vi.title || userMessage,
                author: (vi.authors && vi.authors[0]) || 'Unknown',
                description: vi.description || vi.subtitle || 'No description available.',
                source: 'google_books',
              };
            }
          }
        } catch (err) {
          // ignore external lookup errors
          book = null;
        }
      }

      let responseText = '';

      // Build a prompt including book details if available
      const promptBase = book
        ? `You are a friendly library assistant. The user asked: "${userMessage}". Book details: Title: ${book.title}, Author: ${book.author}, Description: ${book.description}\. Provide a concise, conversational response with key info (plot, themes, fun facts) and avoid spoilers.`
        : `You are a friendly library assistant. The user asked: "${userMessage}". No book details are available. If you don't know, be honest and offer suggestions on where to find the book.`;

      // Call Hugging Face with the prompt
      try {
        const hfResp = await fetch(HUGGING_FACE_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: promptBase, parameters: { max_new_tokens: 250, temperature: 0.7 } }),
        });

        if (hfResp.ok) {
          const data = await hfResp.json();
          if (typeof data === 'string') responseText = data;
          else if (Array.isArray(data) && data[0]) responseText = data[0].generated_text || data[0].text || JSON.stringify(data[0]);
          else if (data.generated_text) responseText = data.generated_text;
        }
      } catch (err) {
        responseText = '';
      }

      // If HF didn't return a usable answer, fallback to a local response using found book (if any)
      if (!responseText) {
        if (book) responseText = buildLocalResponse(book, userMessage) + (book.source === 'google_books' ? '\n\n(Details retrieved from Google Books)' : '');
        else responseText = "I couldn't find that book in your library or external sources. Try a different title or add the book to your library.";
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${err?.message || 'Failed to fetch assistant response'}` }]);
    } finally {
      setChatLoading(false);
      setChatInput('');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.chatMessage, item.role === 'user' ? styles.userMessage : styles.assistantMessage]}>
      <Text style={styles.chatText}>{item.content}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>AI Book Chat</Text>
          <FlatList data={chatHistory} renderItem={renderItem} keyExtractor={(item, idx) => `${item.role}-${idx}`} style={styles.chatList} />

          <View style={styles.chatInputContainer}>
            <TextInput style={[styles.input, styles.chatInput]} placeholder="Ask about a book..." value={chatInput} onChangeText={setChatInput} editable={!chatLoading} />
            <TouchableOpacity style={[styles.submitButton, chatLoading && styles.disabledButton]} onPress={handleSend} disabled={chatLoading}>
              {chatLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Send</Text>}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.cancelButton, { marginTop: 8 }]} onPress={onClose} disabled={chatLoading}>
            <Text style={styles.actionButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '100%', maxWidth: 600, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  chatList: { flexGrow: 0, maxHeight: '70%', marginBottom: 8 },
  chatMessage: { padding: 8, borderRadius: 8, marginBottom: 6, maxWidth: '85%' },
  userMessage: { backgroundColor: '#6366f1', alignSelf: 'flex-end' },
  assistantMessage: { backgroundColor: '#e5e7eb', alignSelf: 'flex-start' },
  chatText: { color: '#333' },
  chatInputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 10, backgroundColor: '#f9f9f9' },
  chatInput: { flex: 1, marginRight: 8 },
  submitButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 10, alignItems: 'center' },
  submitButtonText: { color: '#fff' },
  disabledButton: { backgroundColor: '#a5b4fc' },
  cancelButton: { backgroundColor: '#6b7280', borderRadius: 12, padding: 12, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '600' },
});
