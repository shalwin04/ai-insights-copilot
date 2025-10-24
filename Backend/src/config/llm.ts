import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

if (!GOOGLE_API_KEY || GOOGLE_API_KEY === "your_google_gemini_api_key_here") {
  console.warn("⚠️  GOOGLE_API_KEY not set. LLM features will not work.");
  console.warn("⚠️  Get your API key from: https://aistudio.google.com/apikey");
}

// LLM instances using Google Gemini
export const llm = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  temperature: 0.7,
  apiKey: GOOGLE_API_KEY,
  maxRetries: 2,
});

export const fastLLM = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  temperature: 0.5,
  apiKey: GOOGLE_API_KEY,
  maxRetries: 2,
});

export const codeLLM = new ChatGoogleGenerativeAI({
  model: process.env.GEMINI_CODE_MODEL || "gemini-2.5-flash",
  temperature: 0.2,
  apiKey: GOOGLE_API_KEY,
  maxRetries: 2,
});

// Embeddings using Google Gemini
export const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: GOOGLE_API_KEY,
});

// Model configurations
export const MODEL_CONFIGS = {
  MAIN: {
    model: llm,
    useCase: "General reasoning and analysis",
  },
  FAST: {
    model: fastLLM,
    useCase: "Quick responses and simple queries",
  },
  CODE: {
    model: codeLLM,
    useCase: "Code generation and data queries",
  },
};
