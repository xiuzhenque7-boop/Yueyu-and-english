import express from "express";
import path from "path";
import dns from "dns";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Ensure IPv4 first
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

// Enable JSON body parsing
app.use(express.json());

// API route for translation & accent analysis
app.post("/api/translate", async (req, res) => {
  try {
    const { text, sourceLanguage, customApiKey } = req.body;

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

    // System prompt directing DeepSeek to translate and analyze dialect/accent
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

    const userPrompt = `需要分析并翻译的文本是：
"${text}"

（可选参考）用户选定的源语言范围是：${sourceLanguage || "自动识别(粤语/英语)"}

请开始分析并输出 JSON：`;

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
