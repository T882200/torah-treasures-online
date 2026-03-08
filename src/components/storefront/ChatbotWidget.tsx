import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "שלום! 👋 איך אוכל לעזור לך?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: { messages: newMessages, sessionId: crypto.randomUUID() },
      });

      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "מצטער, משהו השתבש. נסה שוב." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-3 w-[360px] max-h-[500px] bg-card border border-border rounded-xl shadow-elegant flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                <span className="font-display font-bold text-sm">עוזר החנות</span>
              </div>
              <button onClick={() => setOpen(false)} className="hover:opacity-70 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[340px]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-foreground"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground">
                    <span className="animate-pulse">מקליד...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border p-3 flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="כתוב הודעה..."
                className="text-sm"
                disabled={loading}
              />
              <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()} className="flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className="h-14 w-14 rounded-full shadow-gold bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
};

export default ChatbotWidget;
