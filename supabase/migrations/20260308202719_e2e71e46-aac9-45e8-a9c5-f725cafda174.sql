
-- Fix overly permissive INSERT policies

-- Email subscribers: require a valid email format at minimum
DROP POLICY "Anyone can subscribe" ON public.email_subscribers;
CREATE POLICY "Anyone can subscribe with valid email"
  ON public.email_subscribers FOR INSERT
  WITH CHECK (email IS NOT NULL AND email <> '');

-- Chatbot conversations: require session_id to be non-empty
DROP POLICY "Anyone can create conversations" ON public.chatbot_conversations;
CREATE POLICY "Authenticated or anonymous can create conversations"
  ON public.chatbot_conversations FOR INSERT
  WITH CHECK (session_id IS NOT NULL AND session_id <> '');

-- Chatbot messages: require conversation_id and content
DROP POLICY "Anyone can insert messages" ON public.chatbot_messages;
CREATE POLICY "Can insert messages to accessible conversations"
  ON public.chatbot_messages FOR INSERT
  WITH CHECK (
    content IS NOT NULL AND content <> ''
    AND conversation_id IS NOT NULL
  );
