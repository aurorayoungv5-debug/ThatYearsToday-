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
  const appId = "ce7ceac27990406f9925468493fcddbd";
  const apiBase = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

  if (!apiKey) {
    throw new Error("QWEN_API_KEY_MISSING");
  }

  const prompt = `${month}月${day}日`;

  try {
    const response = await fetch(apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: {
          prompt: prompt
        },
        parameters: {
          has_thoughts: false
        },
        debug: {}
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Qwen API Error:", errorData);
      throw new Error(`API_ERROR: ${response.status}`);
    }

    const result = await response.json();
    const text = result.output?.text;
    
    if (!text) return { history: [] };

    // Try to extract JSON if the agent wrapped it in markdown
    let jsonStr = text;
    const markdownMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (markdownMatch) {
      jsonStr = markdownMatch[1];
    } else {
      const braceMatch = text.match(/{[\s\S]*}/);
      if (braceMatch) {
        jsonStr = braceMatch[0];
      }
    }

    try {
      return JSON.parse(jsonStr) as DayData;
    } catch (parseError) {
      console.error("Failed to parse Qwen Agent response as JSON", text);
      return { history: [] };
    }
  } catch (e) {
    console.error("Failed to fetch data from Qwen Agent", e);
    return { history: [] };
  }
}
