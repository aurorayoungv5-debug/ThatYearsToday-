import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface HistoricalEvent {
  year: number;
  event: string;
}

export interface DayData {
  todayEvent?: string;
  quote?: string;
  history: HistoricalEvent[];
}

export async function fetchDayData(month: number, day: number): Promise<DayData> {
  const prompt = `Find historical events for the date: ${month} month ${day} day. 
  Also, provide a "Today's Event" if there's any significant global event happening on this specific calendar day in the current year (2026), or a meaningful quote (chicken soup for the soul) that fits the date and typical seasonal weather.
  
  Return the data in JSON format with the following structure:
  {
    "todayEvent": "string (optional, major event happening on this exact day in 2026)",
    "quote": "string (in Chinese, a quote fitting the date/weather)",
    "history": [
      { "year": number, "event": "string (in Chinese, description of the historical event)" }
    ]
  }
  
  Ensure the history list has at least 5-10 items from different years.
  The language for 'todayEvent', 'quote', and 'event' must be Chinese.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
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
