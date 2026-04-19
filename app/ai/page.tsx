'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { Bot, Send, Plus, Trash2, Sparkles, Scale, DollarSign, Calendar, Truck } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };
type Conversation = { id: string; title: string; module: string; messages: string; updatedAt: string };

const MODULES = [
  { id: 'general', label: 'Général', icon: Bot, color: 'text-indigo-400', description: 'Assistant polyvalent' },
  { id: 'events', label: 'Événements', icon: Calendar, color: 'text-blue-400', description: 'Planification et logistique' },
  { id: 'legal', label: 'Juridique', icon: Scale, color: 'text-purple-400', description: 'Contrats et droit des affaires' },
  { id: 'accounting', label: 'Comptabilité', icon: DollarSign, color: 'text-emerald-400', description: 'Finance et comptabilité' },
  { id: 'suppliers', label: 'Fournisseurs', icon: Truck, color: 'text-amber-400', description: 'Négociation et sélection' },
];

const SUGGESTIONS: Record<string, string[]> = {
  general: ['Comment organiser un événement de A à Z?', 'Quelles sont les meilleures pratiques pour un gala?', 'Comment gérer un événement avec un budget serré?'],
  events: ['Crée un plan d\'action pour un gala de 500 personnes', 'Quels sont les risques à anticiper pour un événement extérieur?', 'Comment gérer les no-show le jour J?'],
  legal: ['Rédige une clause d\'annulation standard', 'Quels sont mes droits si un fournisseur fait défaut?', 'Comment protéger mon entreprise contractuellement?'],
  accounting: ['Explique la TPS/TVQ pour les services événementiels', 'Comment calculer ma marge bénéficiaire par événement?', 'Quelles dépenses sont déductibles pour une entreprise événementielle?'],
  suppliers: ['Comment évaluer un nouveau fournisseur?', 'Stratégie de négociation avec un traiteur', 'Quelles questions poser lors d\'une visite de salle?'],
};

export default function AiPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConv, setCurrentConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [module, setModule] = useState('general');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState('claude-opus-4-7');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetch('/api/ai/model').then(r => r.json()).then(d => setCurrentModel(d.model));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    const r = await fetch('/api/ai/chat');
    const data = await r.json();
    setConversations(data);
  };

  const newConversation = () => {
    setCurrentConv(null);
    setMessages([]);
  };

  const loadConversation = (conv: Conversation) => {
    setCurrentConv(conv.id);
    setModule(conv.module);
    try {
      setMessages(JSON.parse(conv.messages));
    } catch {
      setMessages([]);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module,
          messages: newMessages,
          conversationId: currentConv,
        }),
      });
      const data = await r.json();
      const assistantMsg: Message = { role: 'assistant', content: data.content };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      if (data.conversationId) {
        setCurrentConv(data.conversationId);
        fetchConversations();
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Erreur de connexion. Vérifiez votre clé API Anthropic dans le fichier .env.' }]);
    }
    setLoading(false);
  };

  const activeModule = MODULES.find(m => m.id === module)!;

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ height: 'calc(100vh - 0px)' }}>
      <Header
        title="Assistant IA"
        subtitle={`Propulsé par ${currentModel}`}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-slate-800 flex flex-col bg-slate-900/50">
          {/* Module selector */}
          <div className="p-4 border-b border-slate-800">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Spécialité</p>
            <div className="space-y-1">
              {MODULES.map(m => (
                <button key={m.id} onClick={() => setModule(m.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${module === m.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}>
                  <m.icon size={15} className={module === m.id ? m.color : 'text-slate-500'} />
                  <div className="text-left">
                    <div className="font-medium">{m.label}</div>
                    <div className="text-xs text-slate-600">{m.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Historique</p>
              <button onClick={newConversation} className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-white hover:bg-slate-700 transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {conversations.map(conv => (
                <button key={conv.id} onClick={() => loadConversation(conv)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${currentConv === conv.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  <div className="truncate">{conv.title}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{MODULES.find(m => m.id === conv.module)?.label}</div>
                </button>
              ))}
              {conversations.length === 0 && <p className="text-xs text-slate-600 px-3">Aucune conversation</p>}
            </div>
          </div>

          {/* Model info */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
              <div>
                <div className="text-xs text-slate-400">Modèle actif</div>
                <div className="text-xs text-indigo-400 font-mono">{currentModel}</div>
              </div>
              <Sparkles size={14} className="ml-auto text-indigo-400" />
            </div>
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={`w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4`}>
                  <activeModule.icon size={28} className={activeModule.color} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Expert {activeModule.label}</h2>
                <p className="text-slate-400 text-sm mb-6 max-w-sm">{activeModule.description}</p>
                <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                  {SUGGESTIONS[module]?.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="text-left p-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-sm text-slate-300 hover:text-white transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-900 border border-slate-800`}>
                      <activeModule.icon size={16} className={activeModule.color} />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800">
                  <activeModule.icon size={16} className={activeModule.color} />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex gap-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder={`Demandez à l'expert ${activeModule.label}...`}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-11 h-11 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">Appuyez sur Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</p>
          </div>
        </div>
      </div>
    </div>
  );
}
