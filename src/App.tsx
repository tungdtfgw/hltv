import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  RefreshCcw, 
  ShieldCheck,
  User,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Info,
  Upload,
  Trash2,
  FileCheck,
  Plus
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import type { Message, EvaluationResult, SessionConfig, Role, Personality, Difficulty, FileItem } from './types';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const [stage, setStage] = useState<'setup' | 'chat' | 'evaluation'>('setup');
  const [fileLibrary, setFileLibrary] = useState<FileItem[]>([]);
  const [config, setConfig] = useState<SessionConfig>({
    role: 'học sinh',
    personality: 'khó tính',
    difficulty: 'chỉ hỏi trong tài liệu',
    documentIds: []
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [input, setInput] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let content = '';

      try {
        if (file.type === 'application/pdf') {
          content = await parsePDF(file);
        } else if (file.type === 'text/plain') {
          content = await file.text();
        } else {
          alert('Chỉ hỗ trợ file .txt hoặc .pdf');
          continue;
        }

        const newFile: FileItem = {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          content: content,
          size: file.size,
          type: file.type
        };

        setFileLibrary(prev => [...prev, newFile]);
      } catch (err) {
        console.error("Error parsing file:", err);
        alert(`Lỗi khi đọc file ${file.name}`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parsePDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const toggleFileSelection = (id: string) => {
    setConfig(prev => {
      const isSelected = prev.documentIds.includes(id);
      return {
        ...prev,
        documentIds: isSelected 
          ? prev.documentIds.filter(fid => fid !== id) 
          : [...prev.documentIds, id]
      };
    });
  };

  const removeFile = (id: string) => {
    setFileLibrary(prev => prev.filter(f => f.id !== id));
    setConfig(prev => ({
      ...prev,
      documentIds: prev.documentIds.filter(fid => fid !== id)
    }));
  };

  const getSelectedContext = () => {
    return fileLibrary
      .filter(f => config.documentIds.includes(f.id))
      .map(f => `--- TÀI LIỆU: ${f.name} ---\n\n${f.content}`)
      .join('\n\n');
  };

  const startSession = async () => {
    if (config.documentIds.length === 0) {
      alert('Vui lòng chọn ít nhất một tài liệu để bắt đầu!');
      return;
    }
    const context = getSelectedContext();
    setStage('chat');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: [],
          documentContext: context,
          role: config.role,
          personality: config.personality,
          difficulty: config.difficulty,
          lastUserResponse: 'Bắt đầu phiên tư vấn'
        })
      });
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.message, timestamp: Date.now() }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newMessages,
          documentContext: getSelectedContext(),
          role: config.role,
          personality: config.personality,
          difficulty: config.difficulty,
          lastUserResponse: input
        })
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.message, timestamp: Date.now() }]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const finishSession = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          documentContext: getSelectedContext(),
          role: config.role,
          personality: config.personality
        })
      });
      const data = await res.json();
      setEvaluation(data);
      setStage('evaluation');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] text-slate-100 font-sans">
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-20 px-4">
        <div className="max-w-5xl mx-auto h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-2 rounded-lg text-white shadow-lg shadow-indigo-500/20">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white leading-tight">Admissions Pro</h1>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Hệ thống luyện tập AI</p>
            </div>
          </div>
          {stage !== 'setup' && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400">SESSION LIVE</span>
              </div>
              <button 
                onClick={() => {
                  if(confirm('Bạn có chắc chắn muốn thoát và làm lại?')) {
                    setStage('setup');
                    setMessages([]);
                    setEvaluation(null);
                  }
                }}
                className="text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 px-3 py-2 bg-white/5 rounded-lg border border-white/10"
              >
                <RefreshCcw size={14} /> Làm lại
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {stage === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
            >
              {/* Left Column: Config */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-3">
                  <h2 className="text-4xl font-black text-white tracking-tight">Thiết lập kịch bản</h2>
                  <p className="text-indigo-200/70 font-medium">Tải tài liệu và chọn vai để bắt đầu thực hành tư vấn tuyển sinh.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                        <User size={16} /> Vai người hỏi
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['phụ huynh', 'học sinh'] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => setConfig({ ...config, role: r })}
                            className={`py-3 px-4 rounded-xl text-[10px] font-black border transition-all ${
                              config.role === r 
                              ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-900/40' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            {r.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={16} /> Tính cách
                      </label>
                      <select
                        value={config.personality}
                        onChange={(e) => setConfig({ ...config, personality: e.target.value as Personality })}
                        className="w-full p-3 rounded-xl bg-black/20 border border-white/10 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-slate-200"
                      >
                        <option value="khó tính" className="bg-slate-900">Khó tính</option>
                        <option value="cáu gắt" className="bg-slate-900">Cáu gắt</option>
                        <option value="rụt rè" className="bg-slate-900">Rụt rè</option>
                        <option value="thân thiện" className="bg-slate-900">Thân thiện</option>
                        <option value="vội vàng" className="bg-slate-900">Vội vàng</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp size={16} /> Mức độ thử thách
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['chỉ hỏi trong tài liệu', 'hỏi thêm bên ngoài'] as Difficulty[]).map((d) => (
                        <button
                          key={d}
                          onClick={() => setConfig({ ...config, difficulty: d })}
                          className={`py-3.5 px-4 rounded-xl text-[11px] font-black border transition-all text-left flex items-center gap-3 ${
                            config.difficulty === d 
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-400'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border-2 ${config.difficulty === d ? 'border-white bg-white shadow-[0_0_8px_#fff]' : 'border-slate-600'}`} />
                          {d.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={startSession}
                    disabled={config.documentIds.length === 0}
                    className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-sm hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-900/40 flex items-center justify-center gap-2 group uppercase tracking-widest"
                  >
                    Bắt đầu phiên tư vấn <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Column: Library */}
              <div className="lg:col-span-5 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] flex items-center gap-2">
                    <FileText size={16} /> Thư viện tài liệu
                  </h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Plus size={14} /> Thêm file
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    multiple 
                    accept=".txt,.pdf" 
                    className="hidden" 
                  />
                </div>

                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                  {fileLibrary.length === 0 ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/10 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 group cursor-pointer hover:border-indigo-500/50 transition-all bg-white/5"
                    >
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-500 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all">
                        <Upload size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tải tài liệu nền</p>
                        <p className="text-[10px] text-slate-500 font-medium">Hỗ trợ PDF và TXT (Nhiều file)</p>
                      </div>
                    </div>
                  ) : (
                    fileLibrary.map((file) => (
                      <div 
                        key={file.id}
                        className={`group p-4 rounded-2xl border transition-all flex items-center gap-4 ${
                          config.documentIds.includes(file.id)
                          ? 'bg-indigo-600/20 border-indigo-500/50'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <button 
                          onClick={() => toggleFileSelection(file.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            config.documentIds.includes(file.id)
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white/5 text-slate-500'
                          }`}
                        >
                          {config.documentIds.includes(file.id) ? <FileCheck size={20} /> : <FileText size={20} />}
                        </button>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleFileSelection(file.id)}
                        >
                          <p className="text-sm font-bold truncate text-slate-200">{file.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">
                            {(file.size / 1024).toFixed(1)} KB • {file.type.includes('pdf') ? 'PDF' : 'TXT'}
                          </p>
                        </div>
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="p-2 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                
                {fileLibrary.length > 0 && (
                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                      <Info size={16} />
                    </div>
                    <p className="text-[10px] text-indigo-200/70 font-medium italic">
                      Bạn đã chọn {config.documentIds.length} tài liệu để làm dữ liệu nền cho phiên tư vấn này.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col bg-white/5 backdrop-blur-md border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/40 rounded-2xl flex items-center justify-center text-indigo-400">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm leading-tight text-white capitalize">{config.role} <span className="text-indigo-300 ml-1">({config.personality})</span></h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
                      <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={finishSession}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 uppercase tracking-widest"
                >
                  Kết thúc & Chấm điểm
                </button>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth"
              >
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-bold border ${
                        m.role === 'user' 
                        ? 'bg-slate-700 border-slate-500 text-slate-200' 
                        : 'bg-indigo-50 border-indigo-400 text-indigo-600'
                      }`}>
                        {m.role === 'user' ? 'ME' : 'AI'}
                      </div>
                      <div className={`px-5 py-4 rounded-3xl shadow-lg border ${
                        m.role === 'user' 
                        ? 'bg-indigo-600/30 border-indigo-400/30 text-slate-100 rounded-tr-none' 
                        : 'bg-white/10 border-white/10 text-slate-100 rounded-tl-none'
                      }`}>
                        <p className="text-sm leading-relaxed">{m.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500 border border-indigo-400 flex items-center justify-center text-[10px] font-bold text-white">AI</div>
                      <div className="bg-white/10 border border-white/10 px-5 py-4 rounded-3xl rounded-tl-none shadow-sm flex gap-1.5 items-center">
                        <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                        <motion.span animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 bg-black/20 border-t border-white/10 backdrop-blur-lg">
                <div className="relative flex items-center max-w-4xl mx-auto">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Nhập câu trả lời tư vấn của bạn..."
                    className="w-full bg-white/5 border border-white/10 rounded-[2rem] py-4 pl-6 pr-16 text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-3 p-3 bg-indigo-500 text-white rounded-2xl hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-indigo-900/40"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'evaluation' && evaluation && (
            <motion.div
              key="evaluation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-12 pb-24"
            >
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-black text-white tracking-tight">Phân tích hiệu quả</h2>
                <p className="text-indigo-200/70 font-medium">Báo cáo chi tiết hiệu quả tư vấn và gợi ý cải thiện từ Gemini AI.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Độ chính xác', value: evaluation.accuracy, icon: ShieldCheck, color: 'text-emerald-400', barColor: 'bg-emerald-500', bg: 'bg-emerald-500/10', glow: 'shadow-[0_0_15px_#10b981]' },
                  { label: 'Độ thuyết phục', value: evaluation.persuasiveness, icon: TrendingUp, color: 'text-indigo-400', barColor: 'bg-indigo-500', bg: 'bg-indigo-500/10', glow: 'shadow-[0_0_15px_#6366f1]' },
                  { label: 'Thái độ', value: evaluation.attitude, icon: Sparkles, color: 'text-amber-400', barColor: 'bg-amber-500', bg: 'bg-amber-500/10', glow: 'shadow-[0_0_15px_#f59e0b]' },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] border border-white/10 shadow-xl flex flex-col items-center text-center space-y-4">
                    <div className={`${stat.bg} ${stat.color} p-4 rounded-2xl border border-white/10`}>
                      <stat.icon size={28} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-4xl font-black text-white leading-none">{stat.value}%</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.value}%` }}
                        className={`h-full ${stat.barColor} ${stat.glow}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white/5 backdrop-blur-md p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
                <h3 className="font-black flex items-center gap-2 text-sm uppercase tracking-widest text-indigo-300">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                    <Info size={16} />
                  </div>
                  Nhận xét tổng quát
                </h3>
                <p className="text-slate-200 leading-relaxed italic border-l-4 border-indigo-500/50 pl-6 text-lg font-medium">
                  "{evaluation.summary}"
                </p>
              </div>

              <div className="space-y-8">
                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-wider text-white">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <AlertCircle size={22} />
                  </div>
                  Phân tích lỗi sai
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {evaluation.errors.map((error, i) => (
                    <div key={i} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 shadow-lg space-y-6">
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Kịch bản người hỏi</span>
                        <p className="text-base font-bold text-white leading-relaxed">{error.question}</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Của bạn
                          </span>
                          <p className="text-sm text-rose-200 leading-relaxed font-medium">{error.userAnswer}</p>
                        </div>
                        <div className="space-y-3 bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/10">
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Thông tin chuẩn
                          </span>
                          <p className="text-sm text-emerald-200 leading-relaxed font-medium">{error.correctInfo}</p>
                        </div>
                      </div>
                      <div className="text-xs text-indigo-200 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 flex gap-3 italic">
                        <span className="font-black text-indigo-400 uppercase tracking-tighter shrink-0">Phản hồi:</span>
                        {error.feedback}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-wider text-white">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <CheckCircle2 size={22} />
                  </div>
                  Gợi ý & Mẹo ứng xử
                </h3>
                <div className="grid grid-cols-1 gap-6">
                  {evaluation.suggestions.map((s, i) => (
                    <div key={i} className="bg-white/5 p-8 rounded-[2rem] border border-white/10 shadow-lg flex flex-col md:flex-row gap-8">
                      <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-xl shadow-lg shadow-indigo-900/40">
                        {i + 1}
                      </div>
                      <div className="space-y-6 flex-1">
                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tình huống thử thách</span>
                          <p className="text-lg font-bold text-white">{s.situation}</p>
                        </div>
                        <div className="space-y-3 bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
                          <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Câu trả lời mẫu từ AI</span>
                          <p className="text-sm text-slate-100 leading-relaxed font-medium">{s.sampleAnswer}</p>
                        </div>
                        <div className="inline-flex items-center gap-2.5 text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/20 uppercase tracking-widest">
                          <Sparkles size={14} className="text-indigo-400" /> Mẹo ứng xử: {s.behaviorTip}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStage('setup')}
                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-3xl font-black text-sm transition-all flex items-center justify-center gap-3 border border-white/10 uppercase tracking-[0.2em] shadow-xl"
              >
                <RefreshCcw size={18} /> Quay lại màn hình thiết lập
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {isLoading && stage === 'evaluation' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white/5 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col items-center space-y-6 max-w-sm text-center">
            <div className="relative">
              <motion.div 
                animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 border-[6px] border-indigo-500/10 border-t-indigo-500 rounded-full"
              />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight uppercase">Đang chấm điểm</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">Gemini AI đang phân tích dữ liệu trò chuyện để đưa ra đánh giá khách quan nhất.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
