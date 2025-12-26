-- =====================================================
-- Chat History Tables for Supabase
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    preview TEXT,
    message_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id 
    ON public.chat_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at 
    ON public.chat_conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_pinned 
    ON public.chat_conversations(is_pinned DESC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id 
    ON public.chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
    ON public.chat_messages(conversation_id, created_at ASC);

-- Full-text search index for searching messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search 
    ON public.chat_messages USING GIN(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_chat_conversations_title_search 
    ON public.chat_conversations USING GIN(to_tsvector('english', title));

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat Conversations Policies
-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
    ON public.chat_conversations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
    ON public.chat_conversations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
    ON public.chat_conversations
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
    ON public.chat_conversations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Chat Messages Policies
-- Users can view messages from their conversations
CREATE POLICY "Users can view messages from own conversations"
    ON public.chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations
            WHERE id = chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Users can create messages in their conversations
CREATE POLICY "Users can create messages in own conversations"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_conversations
            WHERE id = chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Users can delete messages from their conversations
CREATE POLICY "Users can delete messages from own conversations"
    ON public.chat_messages
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_conversations
            WHERE id = chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- =====================================================
-- Functions and Triggers
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on conversations
DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON public.chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Utility Functions
-- =====================================================

-- Function to search conversations and messages
CREATE OR REPLACE FUNCTION search_chat_history(
    p_user_id UUID,
    p_search_query TEXT
)
RETURNS TABLE (
    conversation_id UUID,
    title TEXT,
    preview TEXT,
    updated_at TIMESTAMPTZ,
    match_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Search in conversation titles
    SELECT 
        c.id as conversation_id,
        c.title,
        c.preview,
        c.updated_at,
        'title'::TEXT as match_type
    FROM public.chat_conversations c
    WHERE c.user_id = p_user_id
    AND c.title ILIKE '%' || p_search_query || '%'
    
    UNION
    
    -- Search in message content
    SELECT DISTINCT
        c.id as conversation_id,
        c.title,
        c.preview,
        c.updated_at,
        'message'::TEXT as match_type
    FROM public.chat_conversations c
    JOIN public.chat_messages m ON m.conversation_id = c.id
    WHERE c.user_id = p_user_id
    AND m.content ILIKE '%' || p_search_query || '%'
    
    ORDER BY updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation statistics for a user
CREATE OR REPLACE FUNCTION get_chat_stats(p_user_id UUID)
RETURNS TABLE (
    total_conversations BIGINT,
    total_messages BIGINT,
    pinned_count BIGINT,
    archived_count BIGINT,
    avg_messages_per_conversation NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT c.id)::BIGINT as total_conversations,
        COALESCE(SUM(c.message_count), 0)::BIGINT as total_messages,
        COUNT(DISTINCT CASE WHEN c.is_pinned THEN c.id END)::BIGINT as pinned_count,
        COUNT(DISTINCT CASE WHEN c.is_archived THEN c.id END)::BIGINT as archived_count,
        COALESCE(AVG(c.message_count), 0)::NUMERIC as avg_messages_per_conversation
    FROM public.chat_conversations c
    WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION search_chat_history(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_stats(UUID) TO authenticated;

-- =====================================================
-- Sample Data (Optional - for testing)
-- Uncomment if you want to add test data
-- =====================================================

/*
-- Insert a sample conversation (replace YOUR_USER_ID with actual user ID)
INSERT INTO public.chat_conversations (user_id, title, preview, message_count)
VALUES 
    ('YOUR_USER_ID', 'Discussion about Harry Potter', 'What makes Harry Potter so special?', 4);

-- Get the conversation ID and insert sample messages
-- INSERT INTO public.chat_messages (conversation_id, role, content)
-- VALUES 
--     ('CONVERSATION_ID', 'user', 'Tell me about Harry Potter'),
--     ('CONVERSATION_ID', 'assistant', 'Harry Potter is a beloved fantasy series...'),
--     ('CONVERSATION_ID', 'user', 'What makes it special?'),
--     ('CONVERSATION_ID', 'assistant', 'The series resonates with readers because...');
*/

-- =====================================================
-- Verification Queries (Run after migration)
-- =====================================================

-- Check tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('chat_conversations', 'chat_messages');

-- Check indexes
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename IN ('chat_conversations', 'chat_messages');

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('chat_conversations', 'chat_messages');
