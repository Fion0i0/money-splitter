
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSplitResult } from "./types";

export const parseExpenseWithAI = async (prompt: string, participantNames?: string[]): Promise<GeminiSplitResult | null> => {
  // Create a new GoogleGenAI instance right before making an API call to ensure it always uses the most up-to-date API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const participantContext = participantNames && participantNames.length > 0
    ? `Current trip members: ${participantNames.join(', ')}. If "大家", "all", "everyone" is mentioned, include ALL these members.`
    : '';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Parse the following expense description into structured data.
      The input might be in English, Cantonese (廣東話), or Mandarin.
      ${participantContext}

      Cantonese hints:
      - "俾" or "畀" means "paid by"
      - "大家分" or "大家share" means "shared by everyone/all"
      - Numbers followed by "蚊" means currency amount

      Example: "Dinner at Mong Kok, 800 HKD, paid by Alan, shared with Bob and Charlie"
      Example: "買衫 500 Long俾 大家分" means "Buy clothes, 500, paid by Long, shared by all"

      Input: "${prompt}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            payerName: { type: Type.STRING },
            participantNames: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
          },
          propertyOrdering: ["description", "amount", "payerName", "participantNames"]
        }
      }
    });

    if (!response.text) return null;
    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
};
