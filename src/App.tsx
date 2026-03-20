import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, History, Quote, Loader2, RefreshCw } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { fetchDayData, DayData, HistoricalEvent } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  const loadData = useCallback(async (date: Date) => {
    setLoading(true);
    setIsFlipped(false);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const result = await fetchDayData(month, day);
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData(currentDate);
  }, [currentDate, loadData]);

  const handlePrevDay = () => {
    setDirection(-1);
    setCurrentDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setDirection(1);
    setCurrentDate(prev => addDays(prev, 1));
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
          <h1 className="text-xl font-medium tracking-tight">那年今天</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            title="回到今天"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <div className="text-sm font-medium uppercase tracking-widest opacity-60">
            {format(currentDate, 'yyyy.MM.dd')}
          </div>
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
                <div className="absolute inset-0 backface-hidden bg-white rounded-[32px] shadow-2xl shadow-black/5 p-8 flex flex-col border border-black/5">
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
                    <span>点击翻转查看历史</span>
                    <span>{format(currentDate, 'EEEE', { locale: zhCN })}</span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#1A1A1A] text-white rounded-[32px] shadow-2xl p-8 flex flex-col overflow-hidden">
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

                  <div className="mt-6 pt-4 border-t border-white/10 text-[10px] uppercase tracking-[0.2em] opacity-30 text-center">
                    点击返回正面
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="absolute -left-16 top-1/2 -translate-y-1/2 hidden md:block">
            <button 
              onClick={handlePrevDay}
              className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          <div className="absolute -right-16 top-1/2 -translate-y-1/2 hidden md:block">
            <button 
              onClick={handleNextDay}
              className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="mt-12 flex gap-8 md:hidden">
          <button 
            onClick={handlePrevDay}
            className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center active:bg-black active:text-white transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={handleNextDay}
            className="w-14 h-14 rounded-full border border-black/10 flex items-center justify-center active:bg-black active:text-white transition-all"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </main>

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
