import React, { useState } from "react";
import { Camera, Upload, X, RefreshCw, AlertCircle, Sparkles, Image as ImageIcon } from "lucide-react";
import { TranslationResult } from "../types";

interface PhotoOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOcrSuccess: (result: TranslationResult) => void;
  onOcrError: (error: string) => void;
}

export default function PhotoOcrModal({
  isOpen,
  onClose,
  onOcrSuccess,
  onOcrError,
}: PhotoOcrModalProps) {
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  // Handles drag & drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("请拖拽或选择有效的图片格式文件");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImgBase64(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Retake or upload different file
  const handleResetImage = () => {
    setImgBase64(null);
  };

  // Safe Close
  const handleClose = () => {
    setImgBase64(null);
    onClose();
  };

  // Submit base64 and DeepSeek key to backend
  const handlePostOcrTranslate = async () => {
    if (!imgBase64) return;
    setIsProcessing(true);
    try {
      // Load custom DeepSeek API key from localStorage (saved as deepseek_api_key in App.tsx)
      const cachedDeepSeekKey = localStorage.getItem("deepseek_api_key") || "";

      const response = await fetch("/api/ocr-translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          imageBase64: imgBase64,
          customApiKey: cachedDeepSeekKey 
        })
      });

      const responseText = await response.text();
      let parsedResult: any;

      try {
        parsedResult = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse server response as JSON:", responseText);
        throw new Error(
          `服务器返回了非 JSON 格式的错误信息 (HTTP ${response.status})。可能是因为沙盒容器在运行 Tesseract.js 时 CPU 满载或内存溢出超时重启。建议您换用更简洁清晰、非手写的大文字图片（或稍微裁剪并降低分辨率后）再试。`
        );
      }

      if (!response.ok) {
        throw new Error(parsedResult.error || parsedResult.details || `HTTP 错误码 ${response.status}`);
      }

      const ocrResult: TranslationResult = parsedResult;
      
      // Close modal and call Success Handler callback
      handleClose();
      onOcrSuccess(ocrResult);

    } catch (err: any) {
      console.error("Post OCR err:", err);
      // Give more action-oriented clear guidance
      if (err.message && err.message.includes("DeepSeek API key")) {
        onOcrError("翻译未完成：尚未设置您的 DeepSeek Key。请在页面右上方点击「密钥设置」配入，再次尝试拍照翻译。");
      } else {
        onOcrError(err.message || "拍照识别服务请求失败");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="photo-ocr-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#1A1C1E] text-white rounded-lg">
              <Camera size={18} />
            </div>
            <h3 className="font-bold text-[#1A1C1E] uppercase tracking-wider text-xs">
              智能微相拍摄 / 图像识别翻译
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 px-1.5 text-slate-400 hover:text-[#1A1C1E] hover:bg-slate-100 rounded-full transition-all"
            disabled={isProcessing}
          >
            <X size={20} />
          </button>
        </div>

        {/* Dynamic Frame Content body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center min-h-[340px]">
          {isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-[#1A1C1E] animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-amber-500 animate-pulse" size={20} />
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="bg-[#E7F3EF] border border-[#BBD9CF] text-[#065F46] text-[10px] font-bold rounded-full px-3 py-1 uppercase tracking-wider inline-block">
                  Gemini + DEEPSEEK 联合引擎计算中...
                </span>
                <h4 className="font-bold text-[#1A1C1E] text-sm tracking-wide">正在对图片进行高精度字域提取与方言语义分析</h4>
                <p className="text-xs text-slate-500 max-w-sm leading-relaxed mx-auto">
                  多模态模型会首先提取图片文本，再交由 DeepSeek 大语言模型完成粤英口音溯源和极佳中文翻译。请耐心等待 3~5 秒即可生成结果。
                </p>
              </div>
            </div>
          ) : imgBase64 ? (
            /* Selected / Scanned Image Preview State */
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="relative flex-1 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center max-h-[340px] border border-slate-200">
                <img
                  src={imgBase64}
                  alt="Scanned item"
                  className="max-h-[340px] max-w-full object-contain"
                />
                <div className="absolute bottom-3 left-3 bg-black/75 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-[#10B981]" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">图片已就绪 / 等待智能翻译</span>
                </div>
              </div>

              {/* Action buttons under preview */}
              <div className="flex gap-3 justify-end pt-2 border-t border-[#E2E8F0]">
                <button
                  onClick={handleResetImage}
                  className="px-4 py-2.5 bg-slate-150 hover:bg-slate-200 text-[#1A1C1E] border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <RefreshCw size={14} /> 重新选择 / 重新拍照
                </button>
                <button
                  onClick={handlePostOcrTranslate}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md hover:shadow-emerald-200 transition-all transform active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>立即执行提取与翻译</span>
                </button>
              </div>
            </div>
          ) : (
            /* SIMPLE UPLOAD & SHUTTER INTEGRATION - Bypasses WebRTC prompt blocks completely! */
            <div className="flex-1 flex flex-col justify-center">
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center transition-all min-h-[260px] ${
                  dragActive
                    ? "border-emerald-500 bg-emerald-50/25"
                    : "border-slate-200 hover:border-[#1A1C1E] hover:bg-slate-50/20 bg-slate-50/50"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4 border border-slate-200">
                  <Camera size={20} className="text-slate-700" />
                </div>
                <div className="space-y-1.5 mb-6">
                  <h4 className="font-bold text-sm text-[#1A1C1E]">
                    拍照或上传图片进行识别翻译
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    点击下方按钮直接唤起您的移动设备相机拍照，或将待翻译的实体书、路牌或标志图片拖拽并拖放到此区域。
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    自动支持：粤语俗字口语识别、专业英文及汉语标准简体/繁体中文
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  {/* Native Selective input directly initiating the default rear shutter on cellular devices */}
                  <label className="px-5 py-3 bg-[#1A1C1E] text-white hover:bg-slate-800 text-xs font-extrabold uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 select-none transform active:scale-95">
                    <Camera size={14} />
                    <span>启动手机拍摄 / 相册选择</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Static Tips Footer */}
        <div className="px-6 py-3 border-t border-[#E2E8F0] bg-slate-100/50 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
          <span>智能识别模型：Gemini 3.5 Flash | 语言翻译大师：DeepSeek-V3</span>
          <span>无需任何摄像头网页授权，极致流畅安全</span>
        </div>
      </div>
    </div>
  );
}
