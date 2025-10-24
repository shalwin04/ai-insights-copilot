import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

if (!OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY not set. LLM features will not work.');
}

// LLM instances
export const llm = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
  temperature: 0.7,
  ...(OPENAI_API_KEY && { openAIApiKey: OPENAI_API_KEY }),
});

export const fastLLM = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.5,
  ...(OPENAI_API_KEY && { openAIApiKey: OPENAI_API_KEY }),
});

export const codeLLM = new ChatOpenAI({
  modelName: process.env.CODE_MODEL || 'gpt-4-turbo-preview',
  temperature: 0.2,
  ...(OPENAI_API_KEY && { openAIApiKey: OPENAI_API_KEY }),
});

// Embeddings
export const embeddings = new OpenAIEmbeddings({
  modelName: 'text-embedding-3-small',
  ...(OPENAI_API_KEY && { openAIApiKey: OPENAI_API_KEY }),
});

// Model configurations
export const MODEL_CONFIGS = {
  MAIN: {
    model: llm,
    useCase: 'General reasoning and analysis',
  },
  FAST: {
    model: fastLLM,
    useCase: 'Quick responses and simple queries',
  },
  CODE: {
    model: codeLLM,
    useCase: 'Code generation and data queries',
  },
};
