import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({ apiKey });

const testGemini = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Reply with: Gemini connection successful",
    });

    console.log("Gemini response:", response.text);
  } catch (error) {
    console.error("Gemini connection failed:", error);
  }
};

testGemini();