import { GoogleGenAI, Type } from "@google/genai";

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
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || "";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  const prompt = `You are a rigorous historical expert. Find historical events that occurred EXACTLY on the date: ${month} month ${day} day. 
  
  **DO NOT hallucinate or make up any events. Every historical event returned must be real and must have occurred on ${month} month ${day} day in history.**
  
  Also, provide a "Today's Event" if there's any significant global event happening on this specific calendar day in the current year (2026), or a meaningful quote (chicken soup for the soul) that fits the date and typical seasonal weather.
  
  Return the data in JSON format with the following structure:
  {
    "todayEvent": "string (optional, major event happening on this exact day in 2026)",
    "quote": "string (in Chinese, a quote fitting the date/weather)",
    "history": [
      { "year": number, "event": "string (in Chinese, description of the historical event, must be accurate for ${month} month ${day} day)" }
    ]
  }
  
  Ensure the history list has 3-5 real items from different years.
  The language for 'todayEvent', 'quote', and 'event' must be Chinese.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          todayEvent: { type: Type.STRING },
          quote: { type: Type.STRING },
          history: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.NUMBER },
                event: { type: Type.STRING }
              },
              required: ["year", "event"]
            }
          }
        },
        required: ["history"]
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as DayData;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { history: [] };
  }
}
