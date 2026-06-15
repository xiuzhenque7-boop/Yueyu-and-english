import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { text, sourceLanguage, customApiKey, direction, targetLanguage } = req.body || {};

    if (!text || text.trim() === "") {
      res.status(400).json({ error: "请输入需要翻译的文本" });
      return;
    }

    // Get API Key from server env or user-supplied key
    const apiKey = customApiKey || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      res.status(401).json({
        error: "未检测到 DeepSeek API key。请在页面右上方的秘钥设置中配置您的 DeepSeek API Key，或者在部署平台（如 Vercel）的环境变量中配置 DEEPSEEK_API_KEY。"
      });
      return;
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

      userPrompt = `需要分析并翻译的文本是：
"${text}"

（可选参考）用户选定的源语言范围是：${sourceLanguage || "自动识别(粤语/英语)"}

请开始分析并输出 JSON：`;
    }

    // Make the request to DeepSeek API
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
      res.status(response.status).json({
        error: `DeepSeek API 报错: ${response.status} ${response.statusText}`,
        details: errText
      });
      return;
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content;

    if (!assistantMessage) {
      res.status(500).json({ error: "DeepSeek 返回的内容为空" });
      return;
    }

    // Parse JSON
    let parsedResult;
    try {
      let cleanJson = assistantMessage.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.substring(7);
      }
      if (cleanJson.endsWith("```")) {
        cleanJson = cleanJson.substring(0, cleanJson.length - 3);
      }
      parsedResult = JSON.parse(cleanJson.trim());
    } catch (parseErr) {
      res.status(500).json({
        error: "解析翻译模型返回结果失败",
        rawMessage: assistantMessage
      });
      return;
    }

    res.status(200).json(parsedResult);

  } catch (error: any) {
    res.status(500).json({
      error: "服务器处理发生错误，请稍后再试",
      details: error.message || error
    });
  }
}
