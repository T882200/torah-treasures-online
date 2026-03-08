import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";

const AdminChatConversations = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ["admin-chat-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chatbot_conversations")
        .select("*, customers(full_name, email)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["admin-chat-messages", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data, error } = await supabase
        .from("chatbot_messages")
        .select("*")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedId,
  });

  const selectedConvo = conversations.find((c: any) => c.id === selectedId);

  return (
    <AdminLayout title="שיחות צ׳אטבוט">
      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-160px)]">
        {/* Conversation list */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-bold text-sm">שיחות ({conversations.length})</h2>
          </div>
          <ScrollArea className="h-[calc(100%-56px)]">
            {conversations.map((conv: any) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-right p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedId === conv.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">
                    {conv.customers?.full_name || conv.customers?.email || "אורח"}
                  </span>
                  <Badge variant={conv.status === "bot" ? "secondary" : "default"} className="text-[10px]">
                    {conv.status === "bot" ? "בוט" : "נציג"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {conv.updated_at ? format(new Date(conv.updated_at), "dd/MM HH:mm") : "—"}
                </div>
              </button>
            ))}
            {conversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                אין שיחות עדיין
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Messages */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
          {selectedId ? (
            <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">
                    {selectedConvo?.customers?.full_name || selectedConvo?.customers?.email || "אורח"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConvo?.created_at ? format(new Date(selectedConvo.created_at), "dd/MM/yyyy HH:mm") : ""}
                  </p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === "user"
                          ? "bg-accent text-accent-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm">אין הודעות בשיחה</p>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                בחר שיחה מהרשימה
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminChatConversations;
