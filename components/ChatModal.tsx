import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown
} from 'react-native-reanimated';
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
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    setSpinning(chatLoading);
  }, [chatLoading]);

  const validateInput = (text: string) => text?.trim().length > 0;

  const buildLocalResponse = (book: any, userQuestion: string) => {
    const desc = book.description || 'No description available.';
    return `Here's what I found for "${book.title}" by ${book.author}:\n\n${desc}\n\nWant a spoiler-free summary, themes, or similar books? Just ask!`;
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!validateInput(chatInput)) return;
    if (!userId) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'Please sign in to use the chat.' }]);
      return;
    }

    const userMessage = chatInput.trim();
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);
    scrollToBottom();

    try {
      let book: any = null;

      try {
        const { data, error } = await supabase
          .from('books')
          .select('title, author, description')
          .eq('user_id', userId)
          .ilike('title', `%${userMessage}%`)
          .limit(1);
        if (!error && data?.length) book = data[0];
      } catch (_) {}

      if (!book) {
        try {
          const resp = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(userMessage)}&maxResults=1`);
          if (resp.ok) {
            const { items } = await resp.json();
            const vi = items?.[0]?.volumeInfo;
            if (vi) {
              book = {
                title: vi.title || userMessage,
                author: vi.authors?.[0] || 'Unknown',
                description: vi.description || vi.subtitle || 'No description.',
                source: 'google',
              };
            }
          }
        } catch (_) {}
      }

      const prompt = book
        ? `You are a friendly, knowledgeable librarian. User asked: "${userMessage}". Book: "${book.title}" by ${book.author}. Description: ${book.description}. Respond conversationally, avoid spoilers, highlight themes or fun facts. Keep it under 120 words.`
        : `You are a helpful librarian. User asked: "${userMessage}". No book found. Suggest searching the library or Google Books. Be kind and encouraging.`;

      let responseText = '';

      try {
        const hfResp = await fetch(HUGGING_FACE_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { max_new_tokens: 180, temperature: 0.7, return_full_text: false },
          }),
        });

        if (hfResp.ok) {
          const data = await hfResp.json();
          responseText = data[0]?.generated_text?.trim() || '';
        }
      } catch (_) {}

      if (!responseText && book) {
        responseText = buildLocalResponse(book, userMessage);
        if (book.source === 'google') responseText += '\n\n*(From Google Books)*';
      } else if (!responseText) {
        responseText = "I couldn't find that book. Try adding it to your library or searching by exact title!";
      }

      setChatHistory(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: `Error: ${err.message || 'Something went wrong.'}` }]);
    } finally {
      setChatLoading(false);
      scrollToBottom();
    }
  };

  const clearInput = () => {
    setChatInput('');
    inputRef.current?.focus();
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <View
      style={[
        styles.messageWrapper,
        item.role === 'user' ? styles.userWrapper : styles.assistantWrapper,
      ]}
    >
      {item.role === 'assistant' && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          item.role === 'user' ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text style={styles.messageText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.overlay}>
        <LinearGradient colors={['#2a0845', '#0f002b']} style={StyleSheet.absoluteFillObject} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
              <Text style={styles.title}>AI Book Assistant</Text>
              <Text style={styles.subtitle}>Ask about any book.</Text>
            </Animated.View>

            <FlatList
              ref={flatListRef}
              data={chatHistory}
              renderItem={renderMessage}
              keyExtractor={(_, i) => `msg-${i}`}
              contentContainerStyle={styles.chatList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Animated.View entering={FadeIn.duration(600)} style={styles.empty}>
                  <Text style={styles.emptyText}>Ask me about a book!</Text>
                </Animated.View>
              }
            />

            {chatLoading && (
              <Animated.View entering={FadeIn} style={styles.loadingBubble}>
                <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
                <Animated.View>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                </Animated.View>
                <Text style={styles.thinking}>Thinking...</Text>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.inputContainer}>
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder="Ask about a book..."
                  placeholderTextColor="#aaa"
                  value={chatInput}
                  onChangeText={setChatInput}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                  editable={!chatLoading}
                  autoFocus
                />
                {chatInput.length > 0 && (
                  <TouchableOpacity style={styles.clearBtn} onPress={clearInput} accessibilityLabel="Clear input">
                    <Text style={styles.clearText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, chatLoading && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={chatLoading || !validateInput(chatInput)}
              >
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={chatLoading}>
              <Text style={styles.closeText}>Close Chat</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  modalContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: 'rgba(26, 0, 51, 0.95)',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  header: { padding: 20, paddingBottom: 12 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#e0d0ff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#c0a9ff',
    textAlign: 'center',
    marginTop: 4,
  },

  chatList: { paddingHorizontal: 16, paddingTop: 8, flexGrow: 1 },
  messageWrapper: { flexDirection: 'row', marginVertical: 6, alignItems: 'flex-end' },
  userWrapper: { justifyContent: 'flex-end' },
  assistantWrapper: { justifyContent: 'flex-start' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  messageBubble: {
    maxWidth: '78%',
    padding: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  userBubble: {
    backgroundColor: '#8b5cf6',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },

  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thinking: { color: '#a78bfa', marginLeft: 8, fontStyle: 'italic' },

  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
  },
  clearBtn: {
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  clearText: { color: '#ccc', fontSize: 20, fontWeight: '600' },
  sendBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#6366f1' },
  sendText: { color: '#fff', fontWeight: '600' },

  closeBtn: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeText: { color: '#fff', fontWeight: '600' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#a78bfa', fontStyle: 'italic' },
});