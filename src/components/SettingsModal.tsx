import React, { useState } from "react";
import { Key, Eye, EyeOff, Save, Check, X, ShieldCheck, AlertCircle } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: SettingsModalProps) {
  const [tempKey, setTempKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveApiKey(tempKey.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div id="settings-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div id="settings-modal-content" className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden transform transition-all animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1A1C1E] text-white rounded-lg">
              <Key size={18} />
            </div>
            <h3 className="font-bold text-[#1A1C1E] uppercase tracking-wider text-sm">DEEPSEEK API KEY 设置</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-[#1A1C1E] hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1A1C1E] uppercase tracking-wider flex justify-between items-center">
              <span>DeepSeek API Key</span>
              <span className="text-[10px] text-slate-400 font-normal">保存在本地浏览器中</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="sk-..."
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#1A1C1E] focus:border-[#1A1C1E] transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1A1C1E] transition-colors"
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-[#E2E8F0] rounded-xl space-y-2">
            <div className="flex gap-2 text-[#1A1C1E]">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="text-xs font-semibold uppercase tracking-wider">为什么需要 API Key？</p>
            </div>
            <p className="text-xs text-[#64748B] leading-relaxed">
              LINGUA FLOW 通过 DeepSeek 大语言模型对您的粤语或英语段落进行<strong>语义判定</strong>与<strong>细分国语语境转换</strong>。
            </p>
            <p className="text-[10px] text-[#94A3B8]">
              * 您的 API Key 会通过本应用安全的 Node.js 后端进行转发，绝不会被存储或外泄给任何第三方。
            </p>
          </div>

          <div className="p-3 bg-slate-100 border border-[#CBD5E1] rounded-xl flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#10B981] shrink-0 mt-0.5" />
            <span className="text-[11px] text-[#64748B] leading-normal font-medium">
              本地安全技术保证：所有数据请求仅用于当次翻译及口音溯源。
            </span>
          </div>

          {/* Action Footer */}
          <div className="flex gap-2 justify-end pt-2 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saved}
              className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#1A1C1E] hover:bg-slate-800 rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:bg-[#10B981]"
            >
              {saved ? (
                <>
                  <Check size={14} />
                  已保存
                </>
              ) : (
                <>
                  <Save size={14} />
                  保存设置
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
