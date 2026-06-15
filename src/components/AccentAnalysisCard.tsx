import React, { useState } from "react";
import { Sparkles, Copy, Check, Volume2, Award, Info, HelpCircle, MapPin, Globe, ChevronRight } from "lucide-react";
import { TranslationResult } from "../types";

interface AccentAnalysisCardProps {
  result: TranslationResult;
  sourceText: string;
  sourceLang: string;
  onSpeak: (text: string) => void;
  isPlaying: boolean;
}

export default function AccentAnalysisCard({
  result,
  sourceText,
  sourceLang,
  onSpeak,
  isPlaying,
}: AccentAnalysisCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.translation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMarkerTypeColor = (type: string) => {
    return "bg-slate-50 text-[#1A1C1E] border-slate-200";
  };

  return (
    <div id="accent-analysis-card" className="space-y-6">
      {/* 2-Column Split: Translation Result and Pinyin, vs Accent & Cultural Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Box 1: Translation Output Display */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header / Language Badge */}
            <div className="flex justify-between items-center pb-3 border-b border-[#F1F5F9]">
              <span className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
                标准普通话译文
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#1A1C1E] font-semibold bg-[#F1F5F9] border border-[#E2E8F0] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                <Globe size={12} />
                <span>书面语转换</span>
              </div>
            </div>

            {/* Translation Main text */}
            <div className="space-y-3">
              <p className="text-2xl sm:text-3xl font-light text-[#1A1C1E] leading-relaxed font-sans select-all">
                {result.translation}
              </p>
              
              {/* Pinyin reading */}
              {result.pinyin && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase font-mono block">
                    标准汉语拼音声调助读
                  </span>
                  <p className="text-xs font-mono text-slate-600 leading-relaxed select-all">
                    {result.pinyin}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons footer for output */}
          <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
            <button
              onClick={() => onSpeak(result.translation)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isPlaying 
                  ? "bg-red-500 text-white hover:bg-red-600 shadow-sm" 
                  : "bg-[#1A1C1E] text-white hover:bg-slate-800 shadow-sm"
              }`}
            >
              <Volume2 size={15} />
              {isPlaying ? "正在播放..." : "即时播放普通话语音"}
            </button>

            <button
              onClick={handleCopy}
              className="p-2.5 border border-[#E2E8F0] text-[#64748B] hover:text-[#1A1C1E] hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="复制译文"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-[#10B981]" />
                  <span className="text-[#065F46] font-bold">已复制</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>复制结果</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Box 2: Dialect & Accent Report Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Accent badge report */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <span className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase">
                口音与词法诊断
              </span>
              <span className="text-[10px] text-[#065F46] bg-[#E7F3EF] border border-[#BBD9CF] rounded-full px-2 py-0.5 font-bold flex items-center gap-0.5">
                <Award size={12} />
                置信值 {result.accentAnalysis?.confidence || 90}%
              </span>
            </div>

            {/* Accent Identity Tag */}
            <div className="flex items-center gap-2.5 p-3.5 bg-[#1A1C1E] text-white rounded-2xl">
              <div className="p-2.5 bg-white text-[#1A1C1E] rounded-lg shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <span className="text-[9px] font-bold tracking-wider text-slate-300 uppercase block">判定地域特征</span>
                <h4 className="font-bold text-white text-sm">
                  {result.detectedLanguage || result.accentAnalysis?.accentName || "粤语 (标准口音)"}
                </h4>
              </div>
            </div>

            {/* Analytical narrative paragraph */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">特征深度解剖</span>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-[#E2E8F0] rounded-xl p-3">
                {result.accentAnalysis?.description || "模型暂无更详细的地域用语描述说明。"}
              </p>
            </div>
          </div>

          {/* Cultual custom alert box */}
          {result.culturalTips && (
            <div className="p-3.5 bg-slate-50 text-[#1A1C1E] border border-[#E2E8F0] rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#1A1C1E] shrink-0" />
                <span className="text-xs font-bold">地域文化贴士</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                {result.culturalTips}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Box 3 (Full Width): Lexical Accent Markers Explorer table */}
      {result.accentAnalysis?.markers && result.accentAnalysis.markers.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-[#1A1C1E]" />
              <h4 className="font-bold text-[#1A1C1E] text-sm uppercase tracking-wider">特殊方言词汇与风格溯源</h4>
            </div>
            <span className="text-[10px] text-[#065F46] bg-[#E7F3EF] border border-[#BBD9CF] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">
              定位到 {result.accentAnalysis.markers.length} 个重点词汇
            </span>
          </div>

          {/* Desktop List Table */}
          <div className="overflow-x-auto">
            <div className="min-w-full divide-y divide-[#E2E8F0]">
              
              {/* Header row */}
              <div className="grid grid-cols-12 bg-slate-50 px-6 py-2.5 text-left text-[10px] font-bold text-[#64748B] uppercase tracking-wider border-b border-[#E2E8F0]">
                <div className="col-span-3 lg:col-span-2">特征词汇 / 表达</div>
                <div className="col-span-3 lg:col-span-2 text-center">用语类型</div>
                <div className="col-span-3 lg:col-span-3">本意 & 普通话译法</div>
                <div className="col-span-3 lg:col-span-5">风格分析 & 深度溯源</div>
              </div>

              {/* Body rows */}
              <div className="divide-y divide-[#E2E8F0] bg-white">
                {result.accentAnalysis.markers.map((marker, idx) => (
                  <div
                    key={marker.word + "-" + idx}
                    className="grid grid-cols-12 px-6 py-4 items-center hover:bg-slate-50/30 transition-colors"
                  >
                    {/* Word column */}
                    <div className="col-span-3 lg:col-span-2 font-bold text-[#1A1C1E] text-xs sm:text-sm font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1A1C1E] shrink-0"></span>
                      {marker.word}
                    </div>

                    {/* Tag label column */}
                    <div className="col-span-3 lg:col-span-2 flex justify-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-full text-center tracking-wide ${getMarkerTypeColor(marker.type)}`}>
                        {marker.type}
                      </span>
                    </div>

                    {/* Meaning / Mandarin column */}
                    <div className="col-span-3 lg:col-span-3 space-y-0.5">
                      <p className="text-xs text-[#1A1C1E] font-semibold leading-relaxed">
                        原意: {marker.meaning}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-[#64748B] font-bold uppercase tracking-wider">
                        <span>译作:</span>
                        <span className="bg-slate-100 border border-[#E2E8F0] text-[#1A1C1E] px-1.5 py-0.2 rounded font-mono">
                          {marker.standardMandarin}
                        </span>
                      </div>
                    </div>

                    {/* Description Analysis Column */}
                    <div className="col-span-3 lg:col-span-5 text-xs text-slate-500 leading-relaxed pr-2">
                      {marker.explanation}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
