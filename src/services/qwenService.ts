import OpenAI from "openai";

export interface HistoricalEvent {
  year: number;
  event: string;
}

export interface DayData {
  todayEvent?: string;
  quote?: string;
  history: HistoricalEvent[];
}

export async function fetchDayData(month: number, day: number, userApiKey?: string): Promise<DayData> {
  const apiKey = userApiKey || process.env.QWEN_API_KEY || "";

  if (!apiKey) {
    throw new Error("QWEN_API_KEY_MISSING");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    dangerouslyAllowBrowser: true,
  });

  const prompt = `你是一个严谨的历史专家。请查找历史上在 ${month}月${day}日 这一天发生的真实、准确的历史事件。
  
  **严禁编造或虚构任何事件。所有返回的历史事件必须是真实存在的，且必须准确发生在 ${month}月${day}日 这一天。**
  
  同时，请提供一个“今日事件”（如果有2026年这一天发生的重大全球事件），或者一段符合该日期和季节气息的、富有哲理的心灵寄语（中文）。
  
  请以 JSON 格式返回数据，结构如下：
  {
    "todayEvent": "字符串 (可选，2026年这一天发生的重大事件)",
    "quote": "字符串 (中文，符合日期/天气的感悟)",
    "history": [
      { "year": 数字, "event": "字符串 (中文，历史事件描述，必须准确发生在 ${month}月${day}日)" }
    ]
  }
  
  确保 history 列表包含 3-5 个不同年份的真实条目。
  请直接返回 JSON 代码块，不要有任何解释文字。`;

  try {
    const response = await openai.chat.completions.create({
      model: "qwen-max", // 或者 qwen-max
      messages: [
        { role: "system", content: "你是一个专门提供历史数据和感悟的助手。请严格按 JSON 格式输出。" },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) return { history: [] };

    return JSON.parse(content) as DayData;
  } catch (e) {
    console.error("Failed to fetch data from Qwen", e);
    return { history: [] };
  }
}
