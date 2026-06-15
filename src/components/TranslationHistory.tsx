import React from "react";
import { History, Trash2, ArrowRight, CornerDownLeft, MapPin, Sparkles, Languages } from "lucide-react";
import { HistoryEntry } from "../types";

interface TranslationHistoryProps {
  entries: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
  onRemoveEntry: (id: string) => void;
}

export default function TranslationHistory({
  entries,
  onSelectEntry,
  onClearHistory,
  onRemoveEntry,
}: TranslationHistoryProps) {
  if (entries.length === 0) {
    return (
      <div id="no-history-box" className="p-8 text-center bg-white rounded-3xl border border-[#E2E8F0] shadow-sm space-y-2">
        <div className="mx-auto w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-[#E2E8F0]">
          <History size={18} />
        </div>
        <h4 className="text-xs font-semibold text-slate-500">尚无翻译历史记录</h4>
        <p className="text-[10px] text-slate-400 max-w-xs mx-auto">您的成功粤语及英语的翻译请求将记录在此处，供您在需要时快速回看。</p>
      </div>
    );
  }

  return (
    <div id="history-box-container" className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <History className="text-[#1A1C1E]" size={16} />
          <h4 className="font-bold text-[#1A1C1E] text-sm uppercase tracking-wider">历史翻译记录 (最近10笔)</h4>
        </div>
        <button
          onClick={onClearHistory}
          className="text-xs font-semibold text-red-600 hover:text-white hover:bg-red-500 px-3 py-1.5 rounded-xl border border-red-200 transition-all flex items-center gap-1"
        >
          <Trash2 size={12} /> 清理历史
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-[#E2E8F0] overflow-y-auto max-h-[360px]">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="p-4 hover:bg-slate-50/50 transition-all flex items-start justify-between gap-3 group relative"
          >
            {/* Clickable Area to retrieve */}
            <div
              onClick={() => onSelectEntry(entry)}
              className="flex-1 cursor-pointer space-y-2 text-left"
            >
              {/* Meta information tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {entry.timestamp}
                </span>

                <span className="text-[9px] bg-slate-100 text-[#1A1C1E] rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                  {entry.sourceLanguage === "cantonese" ? "粤语输入" : entry.sourceLanguage === "english" ? "英语输入" : "自动识别"}
                </span>

                <span className="text-[9px] bg-[#E7F3EF] border border-[#BBD9CF] text-[#065F46] rounded px-1.5 py-0.5 font-bold flex items-center gap-0.5 uppercase tracking-wider">
                  <MapPin size={8} /> {entry.result.detectedLanguage || "标准识别"}
                </span>
              </div>

              {/* Source & translation display snippet */}
              <div className="space-y-1">
                <p className="text-xs text-[#64748B] font-medium truncate max-w-md lg:max-w-xl">
                  {entry.text}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
                  <CornerDownLeft size={10} className="text-slate-300" />
                  <p className="text-[#1A1C1E] font-semibold truncate max-w-sm lg:max-w-md">
                    {entry.result.translation}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 self-center">
              {/* Load Button */}
              <button
                onClick={() => onSelectEntry(entry)}
                className="p-1.5 text-slate-400 hover:text-[#1A1C1E] hover:bg-slate-100 rounded-lg transition-all hidden group-hover:block"
                title="重载此条记录"
              >
                <CornerDownLeft size={14} />
              </button>

              {/* Remove specific button */}
              <button
                onClick={() => onRemoveEntry(entry.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="删除记录"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
