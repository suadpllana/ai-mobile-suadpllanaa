/**
 * Chat History Service
 * Handles all Supabase operations for chat conversations and messages
 */

import { supabase } from '../supabase';
import { logger } from '../utils/logger';

export interface ChatMessage {
  id?: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  preview?: string;
  message_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithMessages extends ChatConversation {
  messages: ChatMessage[];
}

class ChatHistoryService {
  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title?: string): Promise<ChatConversation | null> {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title: title || 'New Chat',
          message_count: 0,
          is_pinned: false,
          is_archived: false,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create conversation:', error);
        return null;
      }

      return data;
    } catch (err) {
      logger.error('Error creating conversation:', err);
      return null;
    }
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(
    userId: string,
    options?: {
      includeArchived?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ChatConversation[]> {
    try {
      let query = supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (!options?.includeArchived) {
        query = query.eq('is_archived', false);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to fetch conversations:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Error fetching conversations:', err);
      return [];
    }
  }

  /**
   * Get a single conversation with all messages
   */
  async getConversationWithMessages(conversationId: string): Promise<ConversationWithMessages | null> {
    try {
      // Get conversation
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError || !conversation) {
        logger.error('Failed to fetch conversation:', convError);
        return null;
      }

      // Get messages
      const { data: messages, error: msgError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        logger.error('Failed to fetch messages:', msgError);
        return null;
      }

      return {
        ...conversation,
        messages: messages || [],
      };
    } catch (err) {
      logger.error('Error fetching conversation with messages:', err);
      return null;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to add message:', error);
        return null;
      }

      // Update conversation metadata
      await this.updateConversationMetadata(conversationId, content, role);

      return data;
    } catch (err) {
      logger.error('Error adding message:', err);
      return null;
    }
  }

  /**
   * Add multiple messages at once (for batch saving)
   */
  async addMessages(
    conversationId: string,
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<boolean> {
    try {
      const messagesToInsert = messages.map((msg) => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
      }));

      const { error } = await supabase
        .from('chat_messages')
        .insert(messagesToInsert);

      if (error) {
        logger.error('Failed to add messages:', error);
        return false;
      }

      // Update conversation with last message preview
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        await this.updateConversationMetadata(
          conversationId,
          lastMessage.content,
          lastMessage.role,
          messages.length
        );
      }

      return true;
    } catch (err) {
      logger.error('Error adding messages:', err);
      return false;
    }
  }

  /**
   * Update conversation metadata (title, preview, message count)
   */
  private async updateConversationMetadata(
    conversationId: string,
    lastContent: string,
    lastRole: 'user' | 'assistant',
    incrementBy: number = 1
  ): Promise<void> {
    try {
      // Get current conversation
      const { data: current } = await supabase
        .from('chat_conversations')
        .select('title, message_count')
        .eq('id', conversationId)
        .single();

      const updates: any = {
        preview: lastContent.substring(0, 100) + (lastContent.length > 100 ? '...' : ''),
        message_count: (current?.message_count || 0) + incrementBy,
        updated_at: new Date().toISOString(),
      };

      // Auto-generate title from first user message if still "New Chat"
      if (current?.title === 'New Chat' && lastRole === 'user') {
        updates.title = this.generateTitle(lastContent);
      }

      await supabase
        .from('chat_conversations')
        .update(updates)
        .eq('id', conversationId);
    } catch (err) {
      logger.error('Error updating conversation metadata:', err);
    }
  }

  /**
   * Generate a title from the first message
   */
  private generateTitle(content: string): string {
    // Clean and truncate the content for a title
    const cleaned = content.replace(/[^\w\s]/g, ' ').trim();
    const words = cleaned.split(/\s+/).slice(0, 5);
    let title = words.join(' ');
    
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    } else if (words.length === 5) {
      title += '...';
    }
    
    return title || 'Chat';
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        logger.error('Failed to update title:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error updating title:', err);
      return false;
    }
  }

  /**
   * Toggle pin status of a conversation
   */
  async togglePin(conversationId: string, isPinned: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        logger.error('Failed to toggle pin:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error toggling pin:', err);
      return false;
    }
  }

  /**
   * Archive/unarchive a conversation
   */
  async toggleArchive(conversationId: string, isArchived: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        logger.error('Failed to toggle archive:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error toggling archive:', err);
      return false;
    }
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      // Delete messages first (cascade should handle this, but being explicit)
      await supabase
        .from('chat_messages')
        .delete()
        .eq('conversation_id', conversationId);

      // Delete conversation
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        logger.error('Failed to delete conversation:', error);
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Error deleting conversation:', err);
      return false;
    }
  }

  /**
   * Search conversations by title or message content
   */
  async searchConversations(userId: string, query: string): Promise<ChatConversation[]> {
    try {
      // Search in conversation titles
      const { data: titleMatches, error: titleError } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .ilike('title', `%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (titleError) {
        logger.error('Failed to search conversations:', titleError);
        return [];
      }

      // Search in messages
      const { data: messageMatches, error: msgError } = await supabase
        .from('chat_messages')
        .select('conversation_id')
        .ilike('content', `%${query}%`)
        .limit(50);

      if (msgError) {
        logger.error('Failed to search messages:', msgError);
        return titleMatches || [];
      }

      // Get unique conversation IDs from message search
      const messageConvIds = [...new Set(messageMatches?.map(m => m.conversation_id) || [])];
      
      if (messageConvIds.length === 0) {
        return titleMatches || [];
      }

      // Fetch conversations for message matches
      const { data: convFromMessages } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .in('id', messageConvIds);

      // Merge and deduplicate results
      const allConversations = [...(titleMatches || []), ...(convFromMessages || [])];
      const uniqueConversations = allConversations.reduce((acc: ChatConversation[], conv: ChatConversation) => {
        if (!acc.find((c: ChatConversation) => c.id === conv.id)) {
          acc.push(conv);
        }
        return acc;
      }, [] as ChatConversation[]);

      return uniqueConversations.sort((a: ChatConversation, b: ChatConversation) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } catch (err) {
      logger.error('Error searching conversations:', err);
      return [];
    }
  }

  /**
   * Get conversation statistics for a user
   */
  async getStats(userId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    pinnedCount: number;
    archivedCount: number;
  }> {
    try {
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id, message_count, is_pinned, is_archived')
        .eq('user_id', userId);

      if (!conversations) {
        return {
          totalConversations: 0,
          totalMessages: 0,
          pinnedCount: 0,
          archivedCount: 0,
        };
      }

      return {
        totalConversations: conversations.length,
        totalMessages: conversations.reduce((sum, c) => sum + (c.message_count || 0), 0),
        pinnedCount: conversations.filter(c => c.is_pinned).length,
        archivedCount: conversations.filter(c => c.is_archived).length,
      };
    } catch (err) {
      logger.error('Error getting stats:', err);
      return {
        totalConversations: 0,
        totalMessages: 0,
        pinnedCount: 0,
        archivedCount: 0,
      };
    }
  }
}

export const chatHistoryService = new ChatHistoryService();
