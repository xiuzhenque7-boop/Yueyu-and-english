import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, ArrowRightLeft, Sparkles, Languages, Trash2, ArrowRight, Play, Square, Settings, VolumeX, HelpCircle } from "lucide-react";
import { TranslationResult } from "../types";

interface TranslatorWorkspaceProps {
  onTranslateStart: () => void;
  onTranslateSuccess: (result: TranslationResult, text: string, sourceLang: string) => void;
  onTranslateError: (error: string) => void;
  customApiKey: string;
  onOpenSettings: () => void;
}

export default function TranslatorWorkspace({
  onTranslateStart,
  onTranslateSuccess,
  onTranslateError,
  customApiKey,
  onOpenSettings,
}: TranslatorWorkspaceProps) {
  const [inputText, setInputText] = useState("");
  const [sourceLang, setSourceLang] = useState("auto"); // "auto", "cantonese", "english"
  const [targetVariant, setTargetVariant] = useState("simplified"); // "simplified" or "traditional"
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupport, setSpeechSupport] = useState(false);
  
  // TTS (Text-to-Speech) Settings
  const [isPlayingTts, setIsPlayingTts] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const [chineseVoices, setChineseVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Refs
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check SpeechRecognition Support & TTS Voices
  useEffect(() => {
    // Check Speech Recognition
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      setSpeechSupport(true);
    }

    // Check Speech Synthesis
    if ("speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter Chinese voices (zh-CN, zh-HK, zh-TW)
        const filtered = voices.filter(v => 
          v.lang.toLowerCase().startsWith("zh") || 
          v.lang.toLowerCase().includes("china") ||
          v.lang.toLowerCase().includes("hong kong") ||
          v.lang.toLowerCase().includes("taiwan")
        );
        setChineseVoices(filtered);
        
        // Pick a default Chinese voice if available
        if (filtered.length > 0) {
          const preferred = filtered.find(v => v.lang.includes("CN") || v.name.includes("Mandarin") || v.name.includes("Google 普通话"));
          setSelectedVoiceURI(preferred ? preferred.voiceURI : filtered[0].voiceURI);
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      // Cleanup speaking and listening on unmount
      if (synthRef.current) {
        synthRef.current.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Set up Speech Recognition on language toggle/change
  const startSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
      return;
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      alert("您的浏览器不支持语音识别功能，请尝试使用 Chrome、Edge 或 Safari 浏览器。");
      return;
    }

    try {
      const rec = new SpeechRecognitionClass();
      rec.continuous = false; // Stop after user stops speaking
      rec.interimResults = true; // Show results in-progress

      // Set the appropriate language code
      if (sourceLang === "cantonese") {
        rec.lang = "zh-HK"; // HK Cantonese
      } else if (sourceLang === "english") {
        rec.lang = "en-US"; // General English
      } else {
        // Auto - default to zh-HK since standard Mandarin translation is target. Cantonese or English is source.
        // It's best to configure the engine to listen for Cantonese first, or let it guess.
        // We'll set zh-HK as default auto-start listener.
        rec.lang = "zh-HK";
      }

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (e: any) => {
        const currentResultIndex = e.resultIndex;
        const transcript = e.results[currentResultIndex][0].transcript;
        if (e.results[currentResultIndex].isFinal) {
          setInputText(prev => prev + (prev ? " " : "") + transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error("Failed to start Speech Recognition:", err);
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Perform translation fetch
  const handleTranslate = async (textToTranslate = inputText) => {
    const trimmed = textToTranslate.trim();
    if (!trimmed) return;

    setIsTranslating(true);
    onTranslateStart();

    // Cancel any ongoing speaking
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
    }

    try {
      let finalResult: any = null;

      // 1. 如果配置了本地私有 Key，优先使用纯前端直连，以解决 Vercel / Serverless 部署下的后台 API 404/不兼容限制
      if (customApiKey && customApiKey.trim() !== "") {
        try {
          const systemPrompt = `你是一个顶尖的语言专家、粤语与英语翻译大师以及口音/方言词汇分析专家。
你的任务是将输入的粤语（繁体或简体字）或英语（各种口音）翻译成优美、自然、地道的标准现代中文（普通话/简体中文）。
同时，你需要根据文本内容、使用的特殊汉字、拼写习惯、外来词或特殊俚语，自动分析该输入最符合哪个地域的口音或细分方言（例如：粤语的香港口音、广州口音、欧美华侨口音；英语的美式口音、英式口音、印度口音、新加坡/新式英语等），并提取出特征词汇进行分析。

请严格以下列 JSON 格式返回，不要包含任何额外的 Markdown 标记（例如 \`\`\`json \`\`\`）、解释或空白文字：
{
  "translation": "标准现代中文普通话的优雅翻译",
  "pinyin": "翻译后中文的拼音表示，以便用户发音。每个汉字拼音用空格隔开，包含音调",
  "detectedLanguage": "检测到的具体语种及口音（例如 '粤语 (香港口音)' 或 '英语 (美式英语)'）",
  "accentAnalysis": {
    "accentName": "口音/地域语种名称（如：港式粤语 / 伦敦英音 / 美式英语俚语等）",
    "confidence": 92,
    "description": "一两句话概括其口音及词汇特征。例如：‘该句子中使用了“唔该”和英文缩写，是典型粤港地区中英夹杂的语言习惯，口音更偏向香港口音。’",
    "markers": [
      {
        "word": "检测到的特征词汇词语",
        "type": "词汇类型（如：方言词、外来词、俚语、发音习惯）",
        "meaning": "该词在上下文中的本意",
        "standardMandarin": "对应的标准普通话表达方式",
        "explanation": "为什么该词是此口音/方言的代表，它有什么特殊历史或语流习惯"
      }
    ]
  },
  "culturalTips": "一句简短的地域文化、用词小贴士"
}`;

          const userPrompt = `需要分析并翻译的文本是：
"${trimmed}"

（可选参考）用户选定的源语言范围是：${sourceLang || "自动识别(粤语/英语)"}

请开始分析并输出 JSON：`;

          const directResponse = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${customApiKey}`
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.3,
              response_format: { type: "json_object" }
            })
          });

          if (!directResponse.ok) {
            const errText = await directResponse.text();
            throw new Error(`直接连接 DeepSeek 服务端报错 (HTTP ${directResponse.status}): ${errText}`);
          }

          const directData = await directResponse.json();
          const contentStr = directData.choices?.[0]?.message?.content;
          if (!contentStr) {
            throw new Error("DeepSeek 返回内容为空");
          }

          let cleanJson = contentStr.trim();
          if (cleanJson.startsWith("```json")) {
            cleanJson = cleanJson.substring(7);
          }
          if (cleanJson.endsWith("```")) {
            cleanJson = cleanJson.substring(0, cleanJson.length - 3);
          }
          finalResult = JSON.parse(cleanJson.trim());
          console.log("纯前端直联模式分析翻译成功！");
        } catch (directErr: any) {
          console.warn("纯前端直连接口失败，尝试回退到后端代理:", directErr);
          // 继续，回退到 backend API 进行处理
        }
      }

      // 2. 纯客户端没有拿到数据，或者没有配置 customApiKey，则按常规调用后端 express API
      if (!finalResult) {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: trimmed,
            sourceLanguage: sourceLang,
            customApiKey: customApiKey,
          }),
        });

        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || `请求失败 (${response.status})`);
          }
          finalResult = data;
        } else {
          // 处理非 JSON 的情况，诸如 404/502 状态的 HTML (Vercel, Netlify 常见)
          const textResponse = await response.text();
          if (response.status === 404 || textResponse.includes("Not Found") || textResponse.includes("cannot be found") || textResponse.includes("<html")) {
            throw new Error(
              `后端服务未就绪 (HTTP 404)。\n\n温馨提示: 如果您当前是将应用部署在 Vercel / Netlify / GitHub Pages 等静态或半静态托管平台上，由于此类平台默认无法运行定制的 Node/Express 后端长服务 (server.ts)，建议点击页面右上角的「秘钥设置」配入您的私有 DeepSeek Key。LIngua Flow 将立即激活“免服务器纯前端直连引擎”，直接安全请求 DeepSeek，无需依赖后台中转即可完美运行整个程序！`
            );
          } else {
            throw new Error(`服务器返回了非标准响应内容 (HTTP ${response.status}): ${textResponse.slice(0, 150)}...`);
          }
        }
      }

      // Convert translated text to Traditional if selected
      let finalProcessed = { ...finalResult };
      if (targetVariant === "traditional") {
        // Simple conversion if needed, but standard deepseek prompt handles basic or deep translations.
        // We can let DeepSeek do it directly, but for client-side versatility we just keep what Model returns
        // and tell the parent.
      }

      onTranslateSuccess(finalProcessed, trimmed, sourceLang === "auto" ? finalProcessed.detectedLanguage : sourceLang);
      
      // Auto-TTS if enabled
      if (autoSpeak) {
        speakText(finalProcessed.translation);
      }

    } catch (err: any) {
      console.error("Translation fail:", err);
      onTranslateError(err.message || "请求服务器时发生未知错误");
    } finally {
      setIsTranslating(false);
    }
  };

  // Text-To-Speech execution
  const speakText = (text: string) => {
    if (!text || !("speechSynthesis" in window)) return;

    // Stop currently playing
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to set selected Chinese voice
    if (selectedVoiceURI && synthRef.current) {
      const selected = synthRef.current.getVoices().find(v => v.voiceURI === selectedVoiceURI);
      if (selected) {
        utterance.voice = selected;
      }
    } else {
      // Fallback: search for first Chinese voice
      const zhVoice = chineseVoices.find(v => v.lang.startsWith("zh"));
      if (zhVoice) {
        utterance.voice = zhVoice;
      }
    }

    utterance.rate = playbackRate;
    
    utterance.onstart = () => {
      setIsPlayingTts(true);
    };

    utterance.onend = () => {
      setIsPlayingTts(false);
    };

    utterance.onerror = (e) => {
      console.warn("Speech Synthesis error:", e);
      setIsPlayingTts(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsPlayingTts(false);
    }
  };

  // Clear inputs
  const handleClear = () => {
    setInputText("");
    stopSpeaking();
    stopSpeechRecognition();
  };

  // Quick inputs for testing
  const applyQuickPhrase = (phrase: string, lang: string) => {
    setInputText(phrase);
    setSourceLang(lang);
  };

  return (
    <div id="translator-workspace" className="space-y-6">
      {/* Language Header bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-sm">
        {/* Source Language Switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl relative">
          <button
            onClick={() => setSourceLang("auto")}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              sourceLang === "auto"
                ? "bg-[#1A1C1E] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#1A1C1E]"
            }`}
          >
            自动识别口音
          </button>
          <button
            onClick={() => setSourceLang("cantonese")}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              sourceLang === "cantonese"
                ? "bg-[#1A1C1E] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#1A1C1E]"
            }`}
          >
            粤语 (Canton)
          </button>
          <button
            onClick={() => setSourceLang("english")}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
              sourceLang === "english"
                ? "bg-[#1A1C1E] text-white shadow-sm"
                : "text-[#64748B] hover:text-[#1A1C1E]"
            }`}
          >
            英语 (English)
          </button>
        </div>

        {/* Arrow Divider */}
        <div className="hidden sm:flex items-center text-[#94A3B8]">
          <ArrowRight size={18} />
        </div>

        {/* Target Language Variant selector */}
        <div className="flex items-center justify-end gap-2 p-1 bg-slate-100 sm:bg-transparent rounded-xl sm:rounded-none">
          <span className="hidden md:inline text-xs text-[#64748B] font-semibold uppercase tracking-wider">目标语:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setTargetVariant("simplified")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                targetVariant === "simplified"
                  ? "bg-[#1A1C1E] text-white shadow-sm"
                  : "text-[#64748B] hover:text-[#1A1C1E]"
              }`}
            >
              简体中文
            </button>
            <button
              onClick={() => setTargetVariant("traditional")}
              className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                targetVariant === "traditional"
                  ? "bg-[#1A1C1E] text-white shadow-sm"
                  : "text-[#64748B] hover:text-[#1A1C1E]"
              }`}
            >
              繁体中文
            </button>
          </div>
        </div>
      </div>

      {/* Main Double Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Text Input Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col min-h-[300px]">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B] font-semibold uppercase tracking-wider bg-slate-50/50">
            <span>源语言输入</span>
            {inputText && (
              <span className="font-mono text-[10px] text-slate-400">
                {inputText.length} 字符
              </span>
            )}
          </div>

          {/* Area */}
          <div className="p-5 flex-1 flex flex-col relative bg-white">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                sourceLang === "cantonese"
                  ? "请在此输入你想翻译的粤语文字，例如：“你食咗饭未呀？等阵一齐去边度玩？”"
                  : sourceLang === "english"
                  ? "Type English text here, e.g., 'What time does the elevator arrive? Keep it in your trunk.'"
                  : "通过此处输入拼音、粤语汉字、英语文字，或点击下方话筒直接开口说话..."
              }
              className="w-full flex-1 min-h-[160px] max-h-[300px] text-2xl font-light leading-relaxed resize-none outline-none placeholder-[#CBD5E1] text-[#1A1C1E] font-sans"
            />

            {/* In-Progress Microphones UI when listening */}
            {isListening && (
              <div className="absolute right-5 bottom-16 flex items-center gap-2 bg-[#E7F3EF] border border-[#BBD9CF] px-4 py-2 rounded-2xl">
                <span className="flex gap-0.5 items-center justify-center h-4 w-7 shrink-0">
                  <span className="w-1 bg-[#10B981] rounded-full wave-bar h-2"></span>
                  <span className="w-1 bg-[#10B981] rounded-full wave-bar h-3"></span>
                  <span className="w-1 bg-[#10B981] rounded-full wave-bar h-2"></span>
                  <span className="w-1 bg-[#10B981] rounded-full wave-bar h-4"></span>
                  <span className="w-1 bg-[#10B981] rounded-full wave-bar h-1"></span>
                </span>
                <span className="text-xs text-[#065F46] font-semibold animate-pulse uppercase tracking-wider">正在聆听...</span>
              </div>
            )}
          </div>

          {/* Input Actions Footer */}
          <div className="px-5 py-4 border-t border-[#E2E8F0] flex items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-2">
              {/* Mic Speech Button */}
              {speechSupport ? (
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  className={`p-3 rounded-full transition-all flex items-center justify-center ${
                    isListening
                      ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                      : "bg-[#F1F5F9] text-[#1A1C1E] border border-[#CBD5E1] hover:bg-slate-200"
                  }`}
                  title={isListening ? "停止录音" : "点击麦克风说粤语或英语"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              ) : (
                <div className="group relative">
                  <button
                    disabled
                    className="p-3 bg-slate-100 text-slate-300 rounded-full cursor-not-allowed"
                    title="当前浏览器不支持语音输入"
                  >
                    <MicOff size={18} />
                  </button>
                  <span className="absolute bottom-full left-0 mb-2 hidden group-hover:inline-block bg-[#1A1C1E] text-white text-[10px] p-2 rounded shadow-md whitespace-nowrap z-10">
                    请使用 Chrome, Safari 以体验语音识别
                  </span>
                </div>
              )}

              {/* Clear field */}
              {inputText && (
                <button
                  onClick={handleClear}
                  className="p-2.5 text-slate-400 hover:text-[#1A1C1E] hover:bg-slate-100 rounded-xl transition-all"
                  title="清除文本"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Translate Submit Action */}
            <button
              onClick={() => handleTranslate()}
              disabled={isTranslating || !inputText.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#1A1C1E] text-white font-medium text-sm flex items-center gap-1.5 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all transform active:scale-98"
            >
              {isTranslating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  正在分析...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  智能翻译
                </>
              )}
            </button>
          </div>
        </div>

        {/* Guide / Preset phrases box wrapper for Quick Try */}
        {!inputText && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Languages className="text-[#1A1C1E]" size={18} />
                <h4 className="font-semibold text-[#1A1C1E] text-sm uppercase tracking-wider">特色本土词语一键体验</h4>
              </div>
              <p className="text-xs text-[#64748B] mb-4 leading-relaxed">
                点击下方特色名句，一键体验 DeepSeek 对不同地域特色口音及俚语特征的分析报告：
              </p>
              
              <div className="space-y-3">
                {/* Cantonese HK */}
                <button
                  onClick={() => applyQuickPhrase("唔该，幫我叫一架的士企喺巴士站側邊，顺便买返盒菠萝包。", "cantonese")}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] hover:border-[#1A1C1E] transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#1A1C1E]">港味粤语：的士与菠萝包</span>
                    <span className="text-[10px] text-[#64748B] group-hover:text-[#1A1C1E] flex items-center gap-0.5 font-semibold">体验 <ArrowRight size={12} /></span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1">「唔该，幫我叫一架的士企喺巴士站側邊...」</p>
                </button>

                {/* Cantonese Guangzhou */}
                <button
                  onClick={() => applyQuickPhrase("今日真系热到飞起，落雨湿湿，等阵我们去饮凉茶，搞两碗双皮奶吃下。", "cantonese")}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] hover:border-[#1A1C1E] transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#1A1C1E]">广州粤语：凉茶与双皮奶</span>
                    <span className="text-[10px] text-[#64748B] group-hover:text-[#1A1C1E] flex items-center gap-0.5 font-semibold">体验 <ArrowRight size={12} /></span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-1">「今日真系热到飞起，落雨湿湿，等阵我们去饮凉茶...」</p>
                </button>

                {/* English British vs US */}
                <button
                  onClick={() => applyQuickPhrase("I went down in the lift to check my lorry's boot, but left the rubbish in the flat.", "english")}
                  className="w-full text-left p-3 rounded-xl bg-slate-50 border border-[#E2E8F0] hover:border-[#1A1C1E] transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-[#1A1C1E]">英式拼写：Lorry & Boot & Flat</span>
                    <span className="text-[10px] text-[#64748B] group-hover:text-[#1A1C1E] flex items-center gap-0.5 font-semibold">体验 <ArrowRight size={12} /></span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate mt-1">"I went down in the lift to check my lorry's..."</p>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#94A3B8] flex items-center gap-1 mt-4 pt-4 border-t border-[#F1F5F9] font-medium">
              <HelpCircle size={14} className="text-[#94A3B8]" />
              <span>注：DeepSeek 翻译引擎将根据习惯和俚语判定细分定位。</span>
            </div>
          </div>
        )}

        {/* TTS / Voice Control configuration card if we have input but no output yet */}
        {inputText && (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-sm p-6 flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <Volume2 className="text-[#1A1C1E]" size={18} />
                  <h4 className="font-semibold text-[#1A1C1E] text-sm uppercase tracking-wider">即时语音播放引擎</h4>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#1A1C1E] text-[10px] font-bold border border-slate-200">
                  SYSTEM SYNTHESIS ACTIVE
                </span>
              </div>

              {/* Configure voices */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#64748B] flex justify-between">
                    <span>选择播音人生(内置中文)</span>
                    <span className="text-[10px] text-[#94A3B8] font-normal font-mono">WebSpeech API</span>
                  </label>
                  {chineseVoices.length > 0 ? (
                    <select
                      value={selectedVoiceURI}
                      onChange={(e) => setSelectedVoiceURI(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1A1C1E]"
                    >
                      {chineseVoices.map((voice) => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-2.5 bg-slate-50 rounded-xl text-[11px] text-slate-400 border border-dashed border-[#CBD5E1]">
                      使用浏览器默认标准语音播放人
                    </div>
                  )}
                </div>

                {/* Slider for Playback Speed */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-[#1A1C1E]">
                    <span>播音语速</span>
                    <span className="text-[#1A1C1E] font-bold">{playbackRate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.7"
                    step="0.1"
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1A1C1E]"
                  />
                  <div className="flex justify-between text-[10px] text-[#94A3B8] font-mono">
                    <span>SLOW</span>
                    <span>NORMAL</span>
                    <span>FAST</span>
                  </div>
                </div>

                {/* Auto Play toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50/50 border border-[#E2E8F0] rounded-2xl">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-semibold text-[#1A1C1E]">完成翻译后自动朗读</h5>
                    <p className="text-[10px] text-[#64748B]">翻译就绪后立即进行高质量播音</p>
                  </div>
                  <button
                    onClick={() => setAutoSpeak(!autoSpeak)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoSpeak ? "bg-[#1A1C1E]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        autoSpeak ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Speaking animation / voice triggers */}
            <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between">
              <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider">
                Word-for-word synthesis ready
              </span>
              {isPlayingTts ? (
                <button
                  onClick={stopSpeaking}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 hover:bg-red-600 transition-all shadow-sm"
                >
                  <VolumeX size={14} /> 停止朗读
                </button>
              ) : (
                <span className="text-[10px] text-[#94A3B8] font-mono uppercase">Idle</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
