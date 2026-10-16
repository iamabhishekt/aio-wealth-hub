import React, { useState } from 'react';
import { 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Send, 
  RefreshCw,
  Zap,
} from 'lucide-react';

interface RAGSource {
  title: string;
  count: string;
  status: 'Ready' | 'Indexing';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  latency?: string;
  tokensPerSec?: number;
}

export const LocalRAGCopilot: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am your on-device **mini-cp5 (1B Parameter)** financial intelligence engine. I run 100% locally on your machine with zero cloud data transmission. My RAG pipeline has indexed your SimpleFIN accounts, Paychex payroll stubs, Wallos recurring subscriptions, and HDFC loan amortizations. What would you like to calculate today?`,
      sources: ['SimpleFIN Bridge (16 Accounts)', 'Paychex Flex Paystubs', 'Wallos Subscriptions'],
      latency: '12ms',
      tokensPerSec: 64.2
    }
  ]);

  const sources: RAGSource[] = [
    { title: 'SimpleFIN Bank Vault', count: '16 Accounts', status: 'Ready' },
    { title: 'Paychex Payroll Stubs', count: '14 Paystubs', status: 'Ready' },
    { title: 'Wallos Active Subscriptions', count: '8 Subscriptions', status: 'Ready' },
    { title: 'HDFC & Remittance Data', count: 'Cross-Border FX', status: 'Ready' },
  ];

  const suggestedQueries = [
    "What's my actual emergency runway if payroll stops tomorrow?",
    "Calculate my HDFC loan payoff if I remit an extra $1,200/month",
    "List all recurring subscriptions due in the next 14 days",
    "How does my debt-to-income ratio compare to FIRE targets?"
  ];

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    // Simulate on-device 1B SLM response with deterministic financial context
    setTimeout(() => {
      let reply = "";
      let sourcesUsed: string[] = [];

      const lower = q.toLowerCase();
      if (lower.includes('runway') || lower.includes('emergency')) {
        reply = `Based on your indexed liquid assets ($18,450.25 Chase Checking + $11,250.00 U.S. Bank Savings = **$29,700.25**) and your baseline monthly burn rate of **$3,840.00**:\n\n- **Current Liquid Runway:** **7.73 Months**\n- **With Wallos Subscriptions Trimmed (-$142/mo):** **8.03 Months**\n- **With Investment Liquidation ($42,180.75 Robinhood):** **18.72 Months**\n\nYour emergency buffer meets the standard 6-month safety threshold for financial independence.`;
        sourcesUsed = ['Chase Checking (SimpleFIN)', 'U.S. Bank Savings', 'Wallos Recurring Subscriptions'];
      } else if (lower.includes('hdfc') || lower.includes('loan') || lower.includes('remit')) {
        reply = `Analyzing your HDFC Home Loan (Principal: ₹4,850,000 / ~$51,050 USD @ 95.00 INR/USD, Rate: 8.55% p.a.):\n\n- Standard tenure remaining: **14.2 Years**\n- If you remit an extra **$1,200/mo (~₹114,000/mo)** via Crobo / Remitly:\n  - Interest saved: **₹1,842,500 (~$19,394 USD)**\n  - New payoff timeline: **Reduced to 3.8 Years** (Eliminates 10.4 years of compounding debt!)\n- Remittance tip: Utilize Crobo when USD/INR crosses 95.10 to maximize rupee principal reduction.`;
        sourcesUsed = ['HDFC Statement Amortization', 'Remitly FX Stream', 'Live INR/USD Feed'];
      } else if (lower.includes('subscription') || lower.includes('recurring') || lower.includes('renew')) {
        reply = `Here are your upcoming recurring subscriptions from Wallos:\n\n1. **GitHub Copilot / Cursor:** $20.00 (Renews Oct 18)\n2. **Netflix Premium 4K:** $22.99 (Renews Oct 22)\n3. **Spotify Family:** $16.99 (Renews Oct 25)\n4. **Google One 2TB:** $9.99 (Renews Oct 28)\n\nTotal upcoming in next 14 days: **$69.97**. All categorized under Discretionary Software/Media.`;
        sourcesUsed = ['Wallos SQLite Engine', 'Transactions Ledger'];
      } else {
        reply = `Synthesized query across your personal finance vector store:\n\n- **Net Worth:** Assets ($118,500) - Liabilities ($37,840) = **$80,660 USD**.\n- **Savings Rate:** 41.8% of net income.\n- **Tax Optimized:** 401(k) matches indexed and active.\n\nYour balance sheet is in prime position for continued compounding.`;
        sourcesUsed = ['SimpleFIN Aggregator', 'Paychex Payroll Record'];
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: reply,
          sources: sourcesUsed,
          latency: '24ms',
          tokensPerSec: 58.4
        }
      ]);
      setLoading(false);
    }, 650);
  };

  return (
    <div className="rounded-3xl sm:rounded-4xl p-6 sm:p-8 bg-gradient-to-br from-vault-900 via-vault-850 to-vault-900 border border-slate-800/80 shadow-2xl space-y-6 font-sans">
      
      {/* Header with On-Device Mini-CP5 Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white font-sans">
                Local RAG Copilot
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                <Zap className="w-3 h-3 text-cyan-400" />
                mini-cp5 (1B)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              100% On-Device Financial Intelligence. Zero cloud leakage.
            </p>
          </div>
        </div>

        {/* Security & RAG telemetry */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-vault-950/80 border border-slate-800 text-[11px] text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Air-Gapped Privacy</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 font-mono">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>VRAM: 840 MB</span>
          </div>
        </div>
      </div>

      {/* Indexed Knowledge Bases */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {sources.map((s, idx) => (
          <div
            key={idx}
            className="p-3 rounded-2xl bg-vault-950/60 border border-slate-800/80 flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] font-bold text-slate-300 truncate">{s.title}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">{s.count}</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400" title="Vectorized in memory" />
          </div>
        ))}
      </div>

      {/* Chat Transcript Container */}
      <div className="space-y-4 max-h-[360px] overflow-y-auto pr-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium shadow-md shadow-cyan-600/10'
                  : 'bg-vault-950/80 border border-slate-800/80 text-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Citations & Performance Telemetry for Assistant */}
              {msg.role === 'assistant' && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500">Grounded in:</span>
                      {msg.sources.map((src, si) => (
                        <span
                          key={si}
                          className="px-2 py-0.5 rounded-md bg-slate-800/90 text-cyan-300 border border-slate-700/60"
                        >
                          {src}
                        </span>
                      ))}
                    </div>
                  )}
                  {msg.latency && (
                    <div className="flex items-center gap-2 text-slate-500 ml-auto">
                      <span>TTFT: {msg.latency}</span>
                      <span>•</span>
                      <span>{msg.tokensPerSec} tok/s</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 p-4 rounded-3xl bg-vault-950/60 border border-slate-800 text-slate-400 text-xs">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            <span>mini-cp5 performing vectorized lookup across SimpleFIN & Paychex ledgers...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts Pills */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Suggested Financial Queries:
        </p>
        <div className="flex flex-wrap gap-2">
          {suggestedQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-xs px-3.5 py-1.5 rounded-xl bg-vault-950 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800/80 hover:border-cyan-500/40 transition-all text-left cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask mini-cp5 about emergency runway, debt avalanche, loan payoff..."
          className="w-full pl-5 pr-14 py-3.5 rounded-2xl bg-vault-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-all shadow-inner font-sans"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="absolute right-2 top-2 bottom-2 px-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-600/20"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
