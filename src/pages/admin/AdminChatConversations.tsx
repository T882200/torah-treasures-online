import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Clock, User, Send, Bot, Play, Plus, Save, Trash2, TestTube, Eye, Settings } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

// ---- Scripts storage (localStorage-based for now) ----
interface ChatScript {
  id: string;
  name: string;
  triggers: string[];
  response: string;
  isActive: boolean;
}

const SCRIPTS_KEY = "chatbot_scripts";
const getScripts = (): ChatScript[] => {
  try { return JSON.parse(localStorage.getItem(SCRIPTS_KEY) || "[]"); } catch { return []; }
};
const saveScripts = (s: ChatScript[]) => localStorage.setItem(SCRIPTS_KEY, JSON.stringify(s));

const AdminChatConversations = () => {
  const [tab, setTab] = useState("conversations");

  return (
    <AdminLayout title="ניהול צ׳אטבוט">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="conversations" className="gap-2"><Eye className="h-3.5 w-3.5" />שיחות חיות</TabsTrigger>
          <TabsTrigger value="scripts" className="gap-2"><Settings className="h-3.5 w-3.5" />תסריטים</TabsTrigger>
          <TabsTrigger value="test" className="gap-2"><TestTube className="h-3.5 w-3.5" />שיחת דמה</TabsTrigger>
        </TabsList>

        <TabsContent value="conversations"><ConversationsPanel /></TabsContent>
        <TabsContent value="scripts"><ScriptsPanel /></TabsContent>
        <TabsContent value="test"><TestChatPanel /></TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

// ========================= CONVERSATIONS =========================
function ConversationsPanel() {
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
    <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-display font-bold text-sm">שיחות ({conversations.length})</h2>
        </div>
        <ScrollArea className="h-[calc(100%-56px)]">
          {conversations.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={`w-full text-right p-4 border-b border-border hover:bg-muted/50 transition-colors ${selectedId === conv.id ? "bg-muted" : ""}`}
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

      <div className="lg:col-span-2 bg-card border border-border rounded-lg flex flex-col overflow-hidden">
        {selectedId ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{selectedConvo?.customers?.full_name || selectedConvo?.customers?.email || "אורח"}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedConvo?.created_at ? format(new Date(selectedConvo.created_at), "dd/MM/yyyy HH:mm") : ""}
                </p>
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-muted-foreground text-sm">אין הודעות בשיחה</p>}
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
  );
}

// ========================= SCRIPTS =========================
function ScriptsPanel() {
  const [scripts, setScripts] = useState<ChatScript[]>(getScripts);
  const [editScript, setEditScript] = useState<ChatScript | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSave = () => {
    if (!editScript?.name || !editScript?.response) {
      toast.error("נא למלא שם ותגובה");
      return;
    }
    let updated: ChatScript[];
    if (scripts.find(s => s.id === editScript.id)) {
      updated = scripts.map(s => s.id === editScript.id ? editScript : s);
    } else {
      updated = [...scripts, editScript];
    }
    setScripts(updated);
    saveScripts(updated);
    setDialogOpen(false);
    toast.success("תסריט נשמר");
  };

  const handleDelete = (id: string) => {
    const updated = scripts.filter(s => s.id !== id);
    setScripts(updated);
    saveScripts(updated);
    toast.success("תסריט נמחק");
  };

  const newScript = (): ChatScript => ({
    id: crypto.randomUUID(),
    name: "",
    triggers: [],
    response: "",
    isActive: true,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold">תסריטים אוטומטיים</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditScript(newScript())} className="gap-2"><Plus className="h-4 w-4" />תסריט חדש</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editScript?.name ? "עריכת תסריט" : "תסריט חדש"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">שם התסריט</label>
                <Input value={editScript?.name || ""} onChange={e => setEditScript(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="למשל: ברכת פתיחה" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">מילות מפתח (מופרדות בפסיקים)</label>
                <Input value={editScript?.triggers.join(", ") || ""} onChange={e => setEditScript(prev => prev ? { ...prev, triggers: e.target.value.split(",").map(t => t.trim()).filter(Boolean) } : prev)} placeholder="שלום, היי, בוקר טוב" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">תגובה</label>
                <Textarea value={editScript?.response || ""} onChange={e => setEditScript(prev => prev ? { ...prev, response: e.target.value } : prev)} placeholder="שלום וברוכים הבאים! איך אוכל לעזור?" rows={4} />
              </div>
              <Button onClick={handleSave} className="w-full gap-2"><Save className="h-4 w-4" />שמור</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {scripts.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">אין תסריטים. צור תסריט חדש כדי להתחיל.</CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {scripts.map(s => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">{s.name}</CardTitle>
                <Badge variant={s.isActive ? "default" : "secondary"}>{s.isActive ? "פעיל" : "כבוי"}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-1">מילות מפתח: {s.triggers.join(", ") || "—"}</p>
                <p className="text-sm bg-muted rounded p-2 mb-3 line-clamp-2">{s.response}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditScript(s); setDialogOpen(true); }}>ערוך</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================= TEST CHAT =========================
function TestChatPanel() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<"general" | "products" | "orders">("general");

  const sendTest = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      // Build context-enriched message
      let contextInfo = "";
      if (context === "products") {
        const { data } = await supabase.from("products").select("name, price, stock, slug").eq("is_active", true).limit(20);
        contextInfo = `\n\nמידע על מוצרים בחנות:\n${(data || []).map(p => `- ${p.name}: ₪${p.price}, מלאי: ${p.stock}`).join("\n")}`;
      } else if (context === "orders") {
        const { data } = await supabase.from("orders").select("order_number, status, total, created_at").order("created_at", { ascending: false }).limit(10);
        contextInfo = `\n\nהזמנות אחרונות:\n${(data || []).map(o => `- #${o.order_number}: ${o.status}, ₪${o.total}`).join("\n")}`;
      }

      const { data, error } = await supabase.functions.invoke("chatbot", {
        body: {
          messages: newMsgs.map(m => ({ role: m.role, content: m.content + (m.role === "user" && m === userMsg ? contextInfo : "") })),
          sessionId: "test-" + crypto.randomUUID(),
        },
      });
      if (error) throw error;
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "שגיאה בחיבור לבוט." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="font-display font-bold">שיחת דמה</h2>
        <Select value={context} onValueChange={(v: any) => setContext(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="general">כללי</SelectItem>
            <SelectItem value="products">עם מידע מוצרים</SelectItem>
            <SelectItem value="orders">עם מידע הזמנות</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setMessages([])}>נקה</Button>
      </div>

      <Card className="h-[500px] flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">מקליד...</div>
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-16">
                <TestTube className="h-8 w-8 mx-auto mb-2 opacity-40" />
                כתוב הודעה כדי לבדוק את הבוט
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendTest()} placeholder="כתוב הודעה לבדיקה..." disabled={loading} />
          <Button onClick={sendTest} disabled={loading || !input.trim()} size="icon"><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
}

export default AdminChatConversations;
