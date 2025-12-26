import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  FadeInDown,
  FadeInLeft,
  FadeOut,
  SlideInLeft,
  SlideOutLeft
} from 'react-native-reanimated';
import {
  ChatConversation,
  chatHistoryService,
} from '../services/chatHistoryService';
import { supabase } from '../supabase';

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ViewMode = 'chat' | 'history';

const HUGGING_FACE_API_TOKEN = process.env.EXPO_PUBLIC_HUGGINGFACE_API_KEY;
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-8B-Instruct';

export default function ChatModal({ visible, onClose, userId }: Props) {
  // Chat state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  // History state
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Load conversations when modal opens
  useEffect(() => {
    if (visible && userId) {
      loadConversations();
    }
  }, [visible, userId]);

  // Auto-save conversation when messages change
  useEffect(() => {
    if (currentConversation && chatHistory.length > 0 && userId) {
      saveCurrentConversation();
    }
  }, [chatHistory.length]);

  const loadConversations = async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const convs = await chatHistoryService.getConversations(userId, {
        includeArchived: showArchived,
      });
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const saveCurrentConversation = async () => {
    if (!currentConversation || chatHistory.length === 0) return;
    
    const existingCount = currentConversation.message_count || 0;
    const newMessages = chatHistory.slice(existingCount);
    
    if (newMessages.length > 0) {
      await chatHistoryService.addMessages(currentConversation.id, newMessages);
      setCurrentConversation(prev => prev ? {
        ...prev,
        message_count: chatHistory.length,
      } : null);
    }
  };

  const startNewConversation = async () => {
    if (!userId) return;
    
    if (currentConversation && chatHistory.length > 0) {
      await saveCurrentConversation();
    }
    
    const newConv = await chatHistoryService.createConversation(userId);
    if (newConv) {
      setCurrentConversation(newConv);
      setChatHistory([]);
      setViewMode('chat');
      loadConversations();
    }
  };

  const loadConversation = async (conversation: ChatConversation) => {
    setHistoryLoading(true);
    try {
      const fullConv = await chatHistoryService.getConversationWithMessages(conversation.id);
      if (fullConv) {
        setCurrentConversation(fullConv);
        setChatHistory(fullConv.messages.map(m => ({
          role: m.role,
          content: m.content,
        })));
        setViewMode('chat');
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    Alert.alert(
      'Delete Conversation',
      'Are you sure you want to delete this conversation? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await chatHistoryService.deleteConversation(conversationId);
            if (success) {
              if (currentConversation?.id === conversationId) {
                setCurrentConversation(null);
                setChatHistory([]);
              }
              loadConversations();
            }
          },
        },
      ]
    );
  };

  const handleTogglePin = async (conversation: ChatConversation) => {
    const success = await chatHistoryService.togglePin(conversation.id, !conversation.is_pinned);
    if (success) {
      loadConversations();
    }
  };

  const handleToggleArchive = async (conversation: ChatConversation) => {
    const success = await chatHistoryService.toggleArchive(conversation.id, !conversation.is_archived);
    if (success) {
      if (currentConversation?.id === conversation.id) {
        setCurrentConversation(null);
        setChatHistory([]);
      }
      loadConversations();
    }
  };

  const handleRenameConversation = async (conversationId: string) => {
    if (!newTitle.trim()) {
      setEditingTitle(null);
      return;
    }
    
    const success = await chatHistoryService.updateTitle(conversationId, newTitle.trim());
    if (success) {
      loadConversations();
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle.trim() } : null);
      }
    }
    setEditingTitle(null);
    setNewTitle('');
  };

  const handleSearch = async () => {
    if (!userId || !searchQuery.trim()) {
      loadConversations();
      return;
    }
    
    setHistoryLoading(true);
    try {
      const results = await chatHistoryService.searchConversations(userId, searchQuery);
      setConversations(results);
    } catch (err) {
      console.error('Failed to search:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const validateInput = (text: string) => text?.trim().length > 0;

  const buildLocalResponse = (book: any) => {
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

    // Create conversation if none exists
    if (!currentConversation) {
      const newConv = await chatHistoryService.createConversation(userId);
      if (newConv) {
        setCurrentConversation(newConv);
      }
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
        responseText = buildLocalResponse(book);
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
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
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
    </Animated.View>
  );

  const renderConversationItem = ({ item }: { item: ChatConversation }) => (
    <Animated.View entering={FadeInLeft.duration(300)}>
      <TouchableOpacity
        style={[
          styles.conversationItem,
          currentConversation?.id === item.id && styles.conversationItemActive,
        ]}
        onPress={() => loadConversation(item)}
        onLongPress={() => {
          Alert.alert(
            item.title,
            'What would you like to do?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: item.is_pinned ? 'Unpin' : 'Pin',
                onPress: () => handleTogglePin(item),
              },
              {
                text: 'Rename',
                onPress: () => {
                  setEditingTitle(item.id);
                  setNewTitle(item.title);
                },
              },
              {
                text: item.is_archived ? 'Unarchive' : 'Archive',
                onPress: () => handleToggleArchive(item),
              },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => handleDeleteConversation(item.id),
              },
            ]
          );
        }}
      >
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            {item.is_pinned && <Text style={styles.pinIcon}>📌 </Text>}
            {editingTitle === item.id ? (
              <TextInput
                style={styles.titleInput}
                value={newTitle}
                onChangeText={setNewTitle}
                onBlur={() => handleRenameConversation(item.id)}
                onSubmitEditing={() => handleRenameConversation(item.id)}
                autoFocus
              />
            ) : (
              <Text style={styles.conversationTitle} numberOfLines={1}>
                {item.title}
              </Text>
            )}
          </View>
          {item.preview && (
            <Text style={styles.conversationPreview} numberOfLines={2}>
              {item.preview}
            </Text>
          )}
          <View style={styles.conversationMeta}>
            <Text style={styles.conversationDate}>
              {formatDate(item.updated_at)}
            </Text>
            <Text style={styles.messageCount}>
              {item.message_count} {item.message_count === 1 ? 'message' : 'messages'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteConversation(item.id)}
        >
          <Text style={styles.deleteBtnText}>×</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHistoryView = () => (
    <Animated.View 
      entering={SlideInLeft.duration(300)} 
      exiting={SlideOutLeft.duration(300)}
      style={styles.historyContainer}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.searchClearBtn}
            onPress={() => {
              setSearchQuery('');
              loadConversations();
            }}
          >
            <Text style={styles.searchClearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, !showArchived && styles.filterBtnActive]}
          onPress={() => {
            setShowArchived(false);
            loadConversations();
          }}
        >
          <Text style={[styles.filterText, !showArchived && styles.filterTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, showArchived && styles.filterBtnActive]}
          onPress={() => {
            setShowArchived(true);
            loadConversations();
          }}
        >
          <Text style={[styles.filterText, showArchived && styles.filterTextActive]}>
            Archived
          </Text>
        </TouchableOpacity>
      </View>

      {/* Conversations List */}
      {historyLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryIcon}>💬</Text>
          <Text style={styles.emptyHistoryText}>
            {searchQuery ? 'No conversations found' : 'No chat history yet'}
          </Text>
          <Text style={styles.emptyHistorySubtext}>
            Start a new conversation to begin
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Animated.View>
  );

  const renderChatView = () => (
    <Animated.View 
      entering={FadeIn.duration(300)}
      style={{ flex: 1 }}
    >
      {/* Current Conversation Title */}
      {currentConversation && (
        <TouchableOpacity
          style={styles.currentConvHeader}
          onPress={() => {
            setEditingTitle(currentConversation.id);
            setNewTitle(currentConversation.title);
          }}
        >
          <Text style={styles.currentConvTitle} numberOfLines={1}>
            {currentConversation.title}
          </Text>
          <Text style={styles.editHint}>Tap to rename</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={chatHistory}
        renderItem={renderMessage}
        keyExtractor={(_, i) => `msg-${i}`}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Animated.View entering={FadeIn.duration(600)} style={styles.empty}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>Ask me about a book!</Text>
            <Text style={styles.emptySubtext}>
              I can help you discover new reads, discuss themes, or find similar books.
            </Text>
          </Animated.View>
        }
      />

      {chatLoading && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.loadingBubble}>
          <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFillObject} />
          <ActivityIndicator size="small" color="#8b5cf6" />
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
    </Animated.View>
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
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
              <Text style={styles.title}>AI Book Assistant</Text>
              <Text style={styles.subtitle}>
                {viewMode === 'history' ? 'Chat History' : 'Ask about any book'}
              </Text>
            </Animated.View>

            {/* Navigation Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, viewMode === 'chat' && styles.tabActive]}
                onPress={() => setViewMode('chat')}
              >
                <Text style={[styles.tabText, viewMode === 'chat' && styles.tabTextActive]}>
                  💬 Chat
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, viewMode === 'history' && styles.tabActive]}
                onPress={() => setViewMode('history')}
              >
                <Text style={[styles.tabText, viewMode === 'history' && styles.tabTextActive]}>
                  📜 History
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.newChatBtn}
                onPress={startNewConversation}
              >
                <Text style={styles.newChatText}>+ New</Text>
              </TouchableOpacity>
            </View>

            {/* Main Content */}
            {viewMode === 'history' ? renderHistoryView() : renderChatView()}

            {/* Close Button */}
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

  header: { padding: 20, paddingBottom: 8 },
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

  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#8b5cf6',
  },
  tabText: {
    color: '#a78bfa',
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
  },
  newChatBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  newChatText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Current Conversation Header
  currentConvHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  currentConvTitle: {
    color: '#e0d0ff',
    fontWeight: '600',
    fontSize: 14,
  },
  editHint: {
    color: '#a78bfa',
    fontSize: 10,
    marginTop: 2,
  },

  // History View
  historyContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
  },
  searchClearBtn: {
    paddingHorizontal: 12,
  },
  searchClearText: {
    color: '#888',
    fontSize: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  filterBtnActive: {
    backgroundColor: '#8b5cf6',
  },
  filterText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  conversationsList: {
    paddingBottom: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  conversationItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderColor: '#8b5cf6',
    borderWidth: 1,
  },
  conversationContent: {
    flex: 1,
    padding: 14,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIcon: {
    fontSize: 12,
  },
  conversationTitle: {
    flex: 1,
    color: '#e0d0ff',
    fontWeight: '600',
    fontSize: 15,
  },
  titleInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#8b5cf6',
  },
  conversationPreview: {
    color: '#a0a0a0',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  conversationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  conversationDate: {
    color: '#888',
    fontSize: 12,
  },
  messageCount: {
    color: '#888',
    fontSize: 12,
  },
  deleteBtn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  deleteBtnText: {
    color: '#ef4444',
    fontSize: 24,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#a78bfa',
    marginTop: 12,
    fontSize: 14,
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  emptyHistoryIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyHistoryText: {
    color: '#e0d0ff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyHistorySubtext: {
    color: '#a78bfa',
    fontSize: 14,
    marginTop: 8,
  },

  // Chat View
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
    overflow: 'hidden',
  },
  thinking: { color: '#a78bfa', marginLeft: 8, fontStyle: 'italic' },

  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
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

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, color: '#e0d0ff', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#a78bfa', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
});
