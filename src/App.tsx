/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { HelpCircle, Settings, Shield, Sparkles, Volume2, Landmark, History, MessageSquareQuote, Check, AlertTriangle, Key } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TranslationResult, HistoryEntry } from "./types";
import SettingsModal from "./components/SettingsModal";
import TranslatorWorkspace from "./components/TranslatorWorkspace";
import AccentAnalysisCard from "./components/AccentAnalysisCard";
import TranslationHistory from "./components/TranslationHistory";

export default function App() {
  // Config & Keys
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("deepseek_api_key") || "";
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // States
  const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Translation history list
  const [historyList, setHistoryList] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("translation_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Keep history synced in local storage
  useEffect(() => {
    localStorage.setItem("translation_history", JSON.stringify(historyList));
  }, [historyList]);

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("deepseek_api_key", key);
    setErrorMsg(null); // Clear errors if user fixes key
  };

  const handleTranslateStart = () => {
    setIsTranslating(true);
    setErrorMsg(null);
  };

  const handleTranslateSuccess = (result: TranslationResult, text: string, sourceLang: string) => {
    setIsTranslating(false);
    setCurrentResult(result);
    setSourceText(text);
    setDetectedLang(result.detectedLanguage || sourceLang);

    // Add to history
    const newEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      sourceLanguage: sourceLang,
      timestamp: new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      result,
    };

    setHistoryList(prev => {
      // Limit to max 10 entries
      const updated = [newEntry, ...prev];
      return updated.slice(0, 10);
    });
  };

  const handleTranslateError = (error: string) => {
    setIsTranslating(false);
    setErrorMsg(error);
  };

  // Restore translation on history click
  const handleSelectHistoryEntry = (entry: HistoryEntry) => {
    setCurrentResult(entry.result);
    setSourceText(entry.text);
    setDetectedLang(entry.result.detectedLanguage);
    
    // Smoothly scroll to translation display block
    const element = document.getElementById("translation-display-anchor");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleClearHistory = () => {
    setHistoryList([]);
  };

  const handleRemoveHistoryEntry = (id: string) => {
    setHistoryList(prev => prev.filter(item => item.id !== id));
  };

  // Audio Playback handler (for Workspace output integration)
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const handleSpeak = (text: string) => {
    if (!text || !("speechSynthesis" in window)) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsPlayingTts(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Pick first Chinese Voice standard
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.toLowerCase().startsWith("zh"));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    utterance.onstart = () => setIsPlayingTts(true);
    utterance.onend = () => setIsPlayingTts(false);
    utterance.onerror = () => setIsPlayingTts(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] font-sans text-[#1A1C1E] pb-16">
      {/* Modern Header Navigation */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between border-b border-[#E2E8F0] bg-white rounded-2xl mt-4 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1C1E] rounded-lg flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 8 6 6"/>
              <path d="m4 14 6-6 2-3"/>
              <path d="M2 5h12"/>
              <path d="M7 2h1"/>
              <path d="m22 22-5-10-5 10"/>
              <path d="M14 18h6"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-xl text-[#1A1C1E] tracking-tight">
                LINGUA FLOW
              </h1>
              <span className="text-[10px] bg-[#E7F3EF] border border-[#BBD9CF] px-2.5 py-0.5 rounded-full font-bold text-[#065F46] uppercase tracking-wider">
                Accent Recognition Active
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium tracking-wide">粤英智能翻译与口音识别工具</p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Key status indicator box */}
          <div className="hidden md:flex items-center gap-1.5 bg-[#F1F5F9] px-3 py-1.5 border border-[#E2E8F0] rounded-xl">
            <Shield size={12} className={customApiKey ? "text-[#10B981]" : "text-amber-500"} />
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
              {customApiKey ? "DEEPSEEK KEY LOADED" : "SHARED CLOUD ENGINE"}
            </span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-4 py-2 bg-[#1A1C1E] text-white rounded-xl text-xs font-bold transition-all hover:bg-slate-800 shadow-sm flex items-center gap-1.5"
            title="配置 API Key"
          >
            <Key size={14} className={customApiKey ? "text-emerald-400" : "text-white"} />
            <span>秘钥设置</span>
          </button>
        </div>
      </header>

      {/* Main Container Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        
        {/* Banner Alert if no customApiKey and env variable might not be present */}
        {!customApiKey && (
          <div className="p-4 bg-white border border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in duration-300">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#1A1C1E]">本地 DeepSeek API 秘钥尚未设置</p>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                为了保证在任何网络状态下皆能平隐解析粤语口音并进行翻译，建议您通过右上角“<strong>秘钥设置</strong>”存入您的私有 DeepSeek 秘钥。
              </p>
            </div>
          </div>
        )}

        {/* Part 1: Interactive Play Space (Input text, choose dialect, mic, speed controls) */}
        <TranslatorWorkspace
          onTranslateStart={handleTranslateStart}
          onTranslateSuccess={handleTranslateSuccess}
          onTranslateError={handleTranslateError}
          customApiKey={customApiKey}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Global Translation Error Display */}
        {errorMsg && (
          <div className="p-5 bg-white border border-red-200 rounded-2xl space-y-2 text-[#1A1C1E] animate-in fade-in duration-200 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-xs text-red-600">
              <AlertTriangle size={16} />
              <span>智能翻译组件发生错误</span>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              原因：{errorMsg}
            </p>
            <p className="text-[10px] text-slate-400 leading-normal">
              建议确认您的密钥有效性，或在“秘钥设置”检查拼写与账户可用状态。
            </p>
          </div>
        )}

        {/* Part 2: Loading State Indicator */}
        {isTranslating && (
          <div id="translator-loading-box" className="p-12 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-sm space-y-4 animate-pulse">
            <div className="mx-auto w-10 h-10 rounded-full border-4 border-slate-100 border-t-[#1A1C1E] animate-spin"></div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#1A1C1E] uppercase tracking-wider">正在深度解析口音方言与语义特征...</h4>
              <p className="text-[10px] text-[#64748B] max-w-xs mx-auto">DeepSeek 正在解析输入成分，提取其中潜藏的地理口音偏好并执行字字矫正翻译...</p>
            </div>
          </div>
        )}

        {/* Anchor point to auto-scroll */}
        <div id="translation-display-anchor" />

        {/* Part 3: Deep Custom Accent & Dialect Report Card Section */}
        {currentResult && !isTranslating && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-3">
              {/* Box Title */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-[#1A1C1E]" size={16} />
                  <h3 className="font-bold text-sm text-[#1A1C1E] uppercase tracking-wider">智能诊断与翻译结果</h3>
                </div>
                <span className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-widest">TRANSLATION DONE</span>
              </div>

              {/* Accent Card Display components */}
              <AccentAnalysisCard
                result={currentResult}
                sourceText={sourceText}
                sourceLang={detectedLang}
                onSpeak={handleSpeak}
                isPlaying={isPlayingTts}
              />
            </div>
          </motion.div>
        )}

        {/* Part 4: Translation History List */}
        <TranslationHistory
          entries={historyList}
          onSelectEntry={handleSelectHistoryEntry}
          onClearHistory={handleClearHistory}
          onRemoveEntry={handleRemoveHistoryEntry}
        />

        {/* Helpful Tips Section */}
        <div className="p-6 bg-white border border-[#E2E8F0] rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-1.5 text-[#1A1C1E] font-semibold text-xs uppercase tracking-wider">
              <Shield className="text-[#10B981]" size={14} />
              <span>隐私与纯净保护</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              密钥纯本地保存，传输链路安全。绝无内置广告与恶意追踪。
            </p>
          </div>
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-1.5 text-[#1A1C1E] font-semibold text-xs uppercase tracking-wider">
              <Volume2 className="text-[#1A1C1E]" size={14} />
              <span>即时高质量播音</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              即时标准国语合成朗读，支持调节最适合自己的播放语速。
            </p>
          </div>
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-1.5 text-[#1A1C1E] font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="text-[#1A1C1E]" size={14} />
              <span>口音标记分析</span>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              DeepSeek 将透视语句背景，对中英粤俚语习惯及地域归属提供解析。
            </p>
          </div>
        </div>

      </main>

      {/* Floating Settings Drawer / Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      {/* Aesthetic Footer */}
      <footer className="mt-20 text-center text-xs text-[#94A3B8] space-y-1 pb-10 uppercase tracking-widest font-medium">
        <p className="font-mono">LINGUA FLOW TRANSLATOR © 2026</p>
        <p className="text-[9px]">DEEPSEEK V3 COGNITIVE ACCENT ENGINE</p>
      </footer>
    </div>
  );
}
