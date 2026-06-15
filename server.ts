import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

// Ensure IPv4 first
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

// Enable JSON body parsing with increased limit for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// API route for translation & accent analysis
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLanguage, customApiKey, direction, targetLanguage } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "请输入需要翻译的文本" });
    }

    // Get API Key from server env or user-supplied header/body
    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return res.status(401).json({
        error: "未检测到 DeepSeek API key。请在页面右上方设置中配置您的 DeepSeek API Key，或在环境变量中配置 DEEPSEEK_API_KEY。"
      });
    }

    // Check direction
    const isFromMandarin = direction === "from_mandarin";

    // System prompt directing DeepSeek to translate
    let systemPrompt = "";
    let userPrompt = "";

    if (isFromMandarin) {
      systemPrompt = `你是一个顶尖的语言专家、粤语与英语翻译及本土化专家。
你的任务是将输入的标准现代中文（普通话/简体或繁体中文）转换为极具地域特色、地道自然的特定粤语或英语口音腔调。
请根据具体的“目标地域语言”，将其翻译成对应地道的日常交流口语表达。
同时请把转换后的目标语进行读音助读标注（如果是粤语则标注粤拼/Jyutping，如果是英语则标注发音注音或音标）。

根据你写出的本地化地道译文，提取出其相对普通话而言特有的俚语、方言词、习惯拼写等特征词语，作为特征词网络进行溯源解剖分析。例如：标准普通话“出租车”转港式粤语是“的士”，转英式英语是“cab/taxi”；“地铁”转美式是“subway”，转英式是“tube/underground”。

请严格以下列 JSON 格式返回，不要包含任何额外的 Markdown 标记（例如 \`\`\`json \`\`\`）、解释或空白文字：
{
  "translation": "极度地道、符合本地口音习惯的粤语/英语本土化译文",
  "pinyin": "转换后目标译文的拼写/读音助读表示（粤语请使用拼写清晰的Jyutping粤拼；英语可展示美式、英式音标或核心词汇拼写）",
  "detectedLanguage": "检测到的源普通话，以及需要转换的目标口音名称（例如 '普通话 -> 粤语(香港口音)' 或 '普通话 -> 英语(美式口音)'）",
  "accentAnalysis": {
    "accentName": "转换生成的对应腔调名称（港式粤语 / 广州口音 / 伦敦英腔 / 温哥华华人腔 / 北美英语等）",
    "confidence": 95,
    "description": "用简洁的两句话剖析本次本地化润色的要点。例如普通话的哪些用词习惯被置换为对应的经典方言或原汁英文俚语。",
    "markers": [
      {
        "word": "应用在译文中的地域特色特征词词汇（如：唔该、的士、flat）",
        "type": "词汇类型（如：方言词、外来音译词、习惯俚语、特定句末助词）",
        "meaning": "该词在此地域用词场景下的本来含义",
        "standardMandarin": "与之对应的普通话直白表达词汇",
        "explanation": "简要阐述此地域专名或方言特征的诞生来历、外来音译背景或者使用限制"
      }
    ]
  },
  "culturalTips": "一条有助于让交流对象觉得极其自然、不带机器腔的本土文化/句法习惯小护航贴士"
}`;

      userPrompt = `需要转换为地道方言/口音的普通话文本是：
"${text}"

请将此普通话文本本地化翻译转换为指定的“目标地域语言腔调”：【${targetLanguage || "粤语 (香港口音)"}】

请开始细致化转换，并严格以定义的 JSON 结构输出返回：`;

    } else {
      systemPrompt = `你是一个顶尖的语言专家、粤语与英语翻译大师以及口音/方言词汇分析专家。
你的任务是将输入的粤语（繁体或简体字）或英语（各种口音）翻译成优美、自然、地道的标准现代中文（普通话/简体中文）。
同时，你需要根据文本内容、使用的特殊汉字、拼写习惯、外来词或特殊俚语，自动分析该输入最符合哪个地域的口音或细分方言（例如：粤语的香港口音、广州口音、欧美华侨口音；英语的美式口音、英式口音、印度口音、新加坡/新式英语等），并提取出特征词汇进行分析。

请严格以下列 JSON 格式返回，不要包含任何额外的 Markdown 标记（例如 \`\`\`json \`\`\`）、解释或空白文字：
{
  "translation": "标准现代中文普通话的优雅翻译",
  "pinyin": "翻译后中文的拼音表示，以便用户发音。每个汉字拼音用空格隔开，包含音调",
  "detectedLanguage": "检测到的具体语种及口音（例如 '粤语 (香港口音)' 或 '英语 (美式英语)'）",
  "accentAnalysis": {
    "accentName": "口音/地域语种名称（如：港式粤语 / 伦敦英音 / 美式英语俚语等）",
    "confidence": 92, // 匹配的置信度数，1-100
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

      userPrompt = `需要分析并翻译的文本是：
"${text}"

（可选参考）用户选定的源语言范围是：${sourceLanguage || "自动识别(粤语/英语)"}

请开始分析并输出 JSON：`;
    }

    // Make the request to DeepSeek API
    // We try to call the deepseek chat API (compatible with openai API)
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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

    if (!response.ok) {
      const errText = await response.text();
      console.error("DeepSeek API error response:", errText);
      return res.status(response.status).json({
        error: `DeepSeek API 报错: ${response.status} ${response.statusText}`,
        details: errText
      });
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("DeepSeek 返回的内容为空");
    }

    // Parse the JSON returned by Assistant
    let parsedResult;
    try {
      // Clean up any potential markdown wraps just in case model ignores instructions
      let cleanJson = assistantMessage.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      parsedResult = JSON.parse(cleanJson.trim());
    } catch (parseErr) {
      console.error("Failed to parse assistant response as JSON:", assistantMessage);
      return res.status(500).json({
        error: "解析翻译模型返回结果失败",
        rawMessage: assistantMessage
      });
    }

    return res.json(parsedResult);

  } catch (error: any) {
    console.error("Translation handler error:", error);
    return res.status(500).json({
      error: "服务器发生错误，请稍后再试",
      details: error.message || error
    });
  }
});

// API route for photo OCR and translation using Gemini for OCR and DeepSeek for Translation
app.post("/api/ocr-translate", async (req, res) => {
  try {
    const { imageBase64, customApiKey } = req.body;

    if (!imageBase64 || imageBase64.trim() === "") {
      return res.status(400).json({ error: "请提供图片进行识别" });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({
        error: "服务器端未检测到 GEMINI_API_KEY。多模态图片识别需要 Gemini 支持，请通知管理员在环境变量配置。"
      });
    }

    const deepseekKey = customApiKey || process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      return res.status(401).json({
        error: "未检测到 DeepSeek API key。请点击页面右上角「密钥设置」配入您的 DeepSeek API Key，或在服务器环境变量中配置 DEEPSEEK_API_KEY。"
      });
    }

    // Step 1: Optical Character Recognition (OCR) character extraction using Gemini
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    // Parse base64 parts
    let mimeType = "image/jpeg";
    let base64Data = imageBase64;
    if (imageBase64.includes(";base64,")) {
      const parts = imageBase64.split(";base64,");
      mimeType = parts[0].replace("data:", "");
      base64Data = parts[1];
    }

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      }
    };

    const ocrPromptText = `你是一个高精度的光学字符识别 (OCR) 专家。
请仔细分析识别这张图片，提取图片里的所有中文段落、粤语方言用语字眼、英文、符号及标点。
请按段落与换行关系，高保真完整输出识别到的原文。
必须直接输出文本，不要包含任何前导引导句、空行解释、Markdown 表格或 Markdown 代码块包裹！`;

    const ocrResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imagePart,
        { text: ocrPromptText }
      ],
    });

    const extractedText = ocrResponse.text ? ocrResponse.text.trim() : "";

    if (!extractedText || extractedText.trim() === "") {
      return res.status(400).json({ error: "图片中无法识读出任何有效的文字。请确保拍照清晰无遮挡，并重新扫拍。" });
    }

    // Step 2: Use DeepSeek to translate & analyze dialect features of the extracted text
    const systemPromptMessage = `你是一个全能语言翻译和口音特征词深入溯源解剖专家。接下来，你会收到一段从图片中 OCR 提取出的原始真实文本。
请根据它的实际语言属性，进行智能高精度翻译与口音语法特征分析。

请遵循以下语言转化路线：
1. 【自动判别输入属性】：识别输入属于英文、粤语（包含港派用语、俗字）还是标准现代国语中文（简体/繁体）。
2. 【若为英文或粤语】：请在 "translation" 字段放入翻译为极度流畅自然的标准现代普通话中文。
3. 【若为标准普通话中文】：请【同时】生成另外两版超本土译文并拼装：
   - 极其地道入骨、符合粤港澳大湾区日常交往习惯的粤语口语转换，并放入 "cantoneseTranslation" 属性。
   - 地道日常流利自然的英语，并放入 "englishTranslation" 属性。
   - "translation" 属性可放置一句提纲挈领的两言对比总结。
4. 【发音标注与分析】：
   - "pinyin" 字段内标注读音：如果主要译文或转换终点是普通话，则标带音调普通话拼音；如果终点是粤语，则标清晰标准的Jyutping粤语拼音。
   - "accentAnalysis" 做专业特色解释。

必须且只能使用规范 JSON 格式响应。不要包含任何额外的 Markdown 反引号（如 \`\`\`json 等）！
格式必须严格符合下方 JSON 范式：
{
  "detectedLanguage": "检测到的语种及地域背景（例如：'粤语 (广州口音)' 或 '英语 (伦敦英音)'）",
  "translation": "主要普通话翻译/转换对照总结",
  "cantoneseTranslation": "地道粤语本土化口语译文（仅在输入文为普通话中文时生成，否则不返或空字）",
  "englishTranslation": "地道英文本土化译文（仅在输入文为普通话中文时生成，否则不返或空字）",
  "pinyin": "词句读音助读标注（Jyutping粤拼或普通话拼音带声调）",
  "accentAnalysis": {
    "accentName": "具体腔调名称（例如：'港式粤语'、'老伦敦音'、'现代标准普通话'等）",
    "confidence": 95,
    "description": "用简洁且深具学术见解的一两句话，概括该句里的用词特色",
    "markers": [
      {
        "word": "提取出的典型局部特征词汇字眼",
        "type": "词汇类型（如：方言俗语、外来音译词、特定的助词、语气词等）",
        "meaning": "该特征词对应的具体核心释义",
        "standardMandarin": "对应的标准直白普通话词汇",
        "explanation": "简要解剖此词语的方言或英文特定文化成因、流行历史"
      }
    ]
  },
  "culturalTips": "一条有助于两地人士流畅破冰、避免文化误会、温馨且实用的交往文化护航贴士"
}`;

    const userPromptMessage = `需要分析并翻译的源提取文本为：
"${extractedText}"

请立即为您生成的翻译分析响应：`;

    const dsResponse = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPromptMessage },
          { role: "user", content: userPromptMessage }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!dsResponse.ok) {
      const dsErrText = await dsResponse.text();
      console.error("DeepSeek API error during OCR Translation:", dsErrText);
      return res.status(dsResponse.status).json({
        error: `DeepSeek 引擎在翻译时发生报错 (HTTP ${dsResponse.status})`,
        details: dsErrText
      });
    }

    const dsData = await dsResponse.json();
    const assistantMessage = dsData.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error("DeepSeek 翻译返回内容为空");
    }

    let cleanJson = assistantMessage.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.substring(7);
    }
    if (cleanJson.endsWith("```")) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }

    const parsedResult = JSON.parse(cleanJson.trim());
    
    // Supplement origin text
    parsedResult.extractedText = extractedText;

    return res.json(parsedResult);

  } catch (error: any) {
    console.error("OCR Translation error:", error);
    return res.status(500).json({
      error: "拍照识别翻译发生错误，请稍后再试",
      details: error.message || error
    });
  }
});

// Configure Vite or Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite Dev Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Mounted Vite middleware (Development Mode)");
  } else {
    // Production Mode serving static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files from /dist (Production Mode)");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
