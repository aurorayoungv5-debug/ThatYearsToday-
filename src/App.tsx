import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, History, Quote, Loader2, RefreshCw, Settings, X, Key, AlertCircle, Cpu, Download } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { fetchDayData as fetchQwenData } from './services/qwenService';
import { fetchDayData as fetchGeminiData } from './services/geminiService';
import { DayData } from './services/qwenService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toPng } from 'html-to-image';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState<'qwen' | 'gemini'>((localStorage.getItem('selected_model') as 'qwen' | 'gemini') || 'qwen');
  const [qwenApiKey, setQwenApiKey] = useState(localStorage.getItem('qwen_api_key') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  
  const [qwenKeyInput, setQwenKeyInput] = useState(qwenApiKey);
  const [geminiKeyInput, setGeminiKeyInput] = useState(geminiApiKey);

  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async (side: 'front' | 'back', e: React.MouseEvent) => {
    e.stopPropagation();
    // Only allow front side download as per user request
    if (side !== 'front' || !frontRef.current) return;

    const node = frontRef.current;
    const padding = 0; // Total padding (10px on each side)
    
    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 3,
        backgroundColor: '#F5F2ED',
        // Set the output dimensions to include padding
        width: node.offsetWidth + padding,
        height: node.offsetHeight + padding,
        style: {
          // Center the card in the larger canvas
          transform: 'scale(0.9)',
          left: `${padding / 2}px`,
          top: `${padding / 2}px`,
          bottom: `${padding / 2}px`,
          right: `${padding / 2}px`,
          margin: '0',
          position: 'absolute',
        },
        filter: (node) => {
          if (node instanceof HTMLElement) {
            if (node.dataset.ignore === 'true') return false;
            if (node.dataset.watermark === 'true') {
              node.style.opacity = '0.4';
              node.style.display = 'block';
            }
          }
          return true;
        }
      });

      const link = document.createElement('a');
      link.download = `那年今日-${format(currentDate, 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  const loadData = useCallback(async (date: Date) => {
    setLoading(true);
    setIsFlipped(false);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    try {
      let result;
      if (selectedModel === 'qwen') {
        result = await fetchQwenData(month, day, qwenApiKey);
      } else {
        result = await fetchGeminiData(month, day, geminiApiKey);
      }
      setData(result);
    } catch (error: any) {
      if (error.message === 'QWEN_API_KEY_MISSING' || error.message === 'GEMINI_API_KEY_MISSING') {
        setShowSettings(true);
      }
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedModel, qwenApiKey, geminiApiKey]);

  const saveSettings = () => {
    localStorage.setItem('selected_model', selectedModel);
    localStorage.setItem('qwen_api_key', qwenKeyInput);
    localStorage.setItem('gemini_api_key', geminiKeyInput);
    
    setQwenApiKey(qwenKeyInput);
    setGeminiApiKey(geminiKeyInput);
    setShowSettings(false);
  };

  useEffect(() => {
    loadData(currentDate);
  }, [currentDate, loadData]);

  const handlePrevDay = () => {
    if (loading) return;
    setDirection(-1);
    setCurrentDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    if (loading) return;
    setDirection(1);
    setCurrentDate(prev => addDays(prev, 1));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setDirection(newDate > currentDate ? 1 : -1);
      setCurrentDate(newDate);
    }
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const sortedHistory = data?.history?.sort((a, b) => b.year - a.year) || [];
  const latestEvent = sortedHistory[0];
  const otherEvents = sortedHistory.slice(1);

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-serif selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-[#F5F2ED]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full border border-[#1A1A1A]/20 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-medium tracking-tight">那年今日</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <input 
              ref={dateInputRef}
              type="date"
              value={format(currentDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              disabled={loading}
              className="opacity-0 absolute inset-0 w-0 h-0 pointer-events-none"
            />
            <div 
              onClick={() => {
                if (!loading && dateInputRef.current) {
                  try {
                    // @ts-ignore
                    dateInputRef.current.showPicker();
                  } catch (e) {
                    dateInputRef.current.click();
                  }
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/10 transition-all cursor-pointer",
                loading ? "opacity-50 cursor-not-allowed" : "hover:border-black/30 bg-white/50"
              )}
            >
              <Calendar className="w-4 h-4 opacity-60" />
              <span className="text-sm font-medium tabular-nums">
                {format(currentDate, 'yyyy.MM.dd')}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            title="设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => !loading && setCurrentDate(new Date())}
            disabled={loading}
            className="p-2 hover:bg-black/5 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="回到今天"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-32 pb-12 px-4 flex flex-col items-center justify-center min-h-screen">
        <div className="relative w-full max-w-md aspect-[3/4] perspective-1000">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentDate.toISOString()}
              custom={direction}
              initial={{ x: direction * 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -direction * 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full h-full"
            >
              <div 
                className={cn(
                  "relative w-full h-full transition-all duration-700 preserve-3d cursor-pointer",
                  isFlipped ? "rotate-y-180" : ""
                )}
                onClick={toggleFlip}
              >
                {/* Front Side */}
                <div 
                  ref={frontRef}
                  className="absolute inset-0 backface-hidden bg-white rounded-[32px] shadow-2xl shadow-black/5 p-8 flex flex-col border border-black/5"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex flex-col">
                      <span className="text-6xl font-light tracking-tighter">
                        {format(currentDate, 'MM')}
                      </span>
                      <span className="text-2xl font-light opacity-40 -mt-2">
                        {format(currentDate, 'MMM', { locale: zhCN })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-8xl font-black text-[#1A1A1A]/5 leading-none">
                        {format(currentDate, 'dd')}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center text-center px-4">
                    {loading ? (
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm uppercase tracking-widest">正在翻阅历史...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {data?.todayEvent ? (
                          <>
                            <div className="inline-block p-2 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] mb-2">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <h2 className="text-2xl leading-relaxed font-medium">
                              {data.todayEvent}
                            </h2>
                          </>
                        ) : (
                          <>
                            <div className="inline-block p-2 rounded-full bg-[#5A5A40]/10 text-[#5A5A40] mb-2">
                              <Quote className="w-4 h-4" />
                            </div>
                            <p className="text-xl italic leading-relaxed text-[#1A1A1A]/80">
                              "{data?.quote || '岁月静好，现世安稳。'}"
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-8 border-t border-black/5 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-40">
                    <div className="flex flex-col gap-1">
                      <span data-ignore="true">点击翻转查看历史</span>
                      <span>{format(currentDate, 'EEEE', { locale: zhCN })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[8px] opacity-0" data-watermark="true">
                        {selectedModel === 'qwen' ? '通义千问' : 'Gemini'} AI 生成
                      </span>
                      {!loading && (
                        <button 
                          data-ignore="true"
                          onClick={(e) => handleDownload('front', e)}
                          className="p-2 hover:bg-black/5 rounded-full transition-colors"
                          title="保存为图片"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Back Side */}
                <div 
                  ref={backRef}
                  className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1A1A1A] text-white rounded-[32px] shadow-2xl p-8 flex flex-col overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs uppercase tracking-[0.3em] opacity-50">历史上的今天</h3>
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                      <History className="w-4 h-4 opacity-50" />
                    </div>
                  </div>

                  {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      {latestEvent && (
                        <div className="mb-8 group">
                          <div className="text-4xl font-bold mb-2 text-[#5A5A40] group-hover:scale-105 transition-transform origin-left inline-block">
                            {latestEvent.year}
                          </div>
                          <p className="text-lg leading-relaxed opacity-90">
                            {latestEvent.event}
                          </p>
                        </div>
                      )}

                      <div className="space-y-6">
                        {otherEvents.map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-start border-t border-white/10 pt-4">
                            <span className="text-sm font-bold text-[#5A5A40] w-12 shrink-0">
                              {item.year}
                            </span>
                            <p className="text-sm leading-relaxed opacity-70">
                              {item.event}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] opacity-30">
                    <div className="flex flex-col gap-1">
                      <span>点击返回正面</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:block">
            <button 
              onClick={handlePrevDay}
              disabled={loading}
              className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 hidden md:block">
            <button 
              onClick={handleNextDay}
              disabled={loading}
              className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="mt-12 flex gap-8 md:hidden">
          <button 
            onClick={handlePrevDay}
            disabled={loading}
            className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center active:bg-black active:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleNextDay}
            disabled={loading}
            className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center active:bg-black active:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#5A5A40]" />
                  <h2 className="text-lg font-medium">应用设置</h2>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Model Selection */}
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                    <Cpu className="w-3 h-3" /> 选择大模型
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setSelectedModel('qwen')}
                      className={cn(
                        "px-4 py-3 rounded-xl border transition-all text-sm font-medium",
                        selectedModel === 'qwen' 
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                          : "bg-white text-[#1A1A1A] border-black/10 hover:border-black/20"
                      )}
                    >
                      通义千问 (Qwen)
                    </button>
                    <button 
                      onClick={() => setSelectedModel('gemini')}
                      className={cn(
                        "px-4 py-3 rounded-xl border transition-all text-sm font-medium",
                        selectedModel === 'gemini' 
                          ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" 
                          : "bg-white text-[#1A1A1A] border-black/10 hover:border-black/20"
                      )}
                    >
                      Google Gemini
                    </button>
                  </div>
                </div>

                {/* API Key Inputs */}
                <div className="space-y-4">
                  {selectedModel === 'qwen' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                        <Key className="w-3 h-3" /> Qwen API Key
                      </label>
                      <input 
                        type="password"
                        value={qwenKeyInput}
                        onChange={(e) => setQwenKeyInput(e.target.value)}
                        placeholder="sk-..."
                        className="w-full px-4 py-3 bg-[#F5F2ED] rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-mono text-sm"
                      />
                    </div>
                  )}

                  {selectedModel === 'gemini' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                        <Key className="w-3 h-3" /> Gemini API Key
                      </label>
                      <input 
                        type="password"
                        value={geminiKeyInput}
                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                        placeholder="AIza..."
                        className="w-full px-4 py-3 bg-[#F5F2ED] rounded-xl border border-black/5 focus:outline-none focus:ring-2 focus:ring-[#5A5A40]/20 transition-all font-mono text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Warning for missing key */}
                {((selectedModel === 'qwen' && !qwenKeyInput) || (selectedModel === 'gemini' && !geminiKeyInput)) && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>当前选择的模型尚未配置 API Key，将无法获取数据。</p>
                  </div>
                )}

                <button 
                  onClick={saveSettings}
                  className="w-full py-3 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-all active:scale-[0.98]"
                >
                  保存并应用
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}
