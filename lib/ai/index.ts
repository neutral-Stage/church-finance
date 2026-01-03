// Index file for AI module exports
export { getAIConfig, SYSTEM_PROMPT, AI_FUNCTIONS } from './ai-config';
export type { AIConfig, AIFunctionName } from './ai-config';

export {
    generateChatResponse,
    generateChatResponseStream,
    generateEmbedding,
    generateEmbeddings,
    processVoiceInput,
    analyzeIntent
} from './ai-service';
export type { ChatMessage, ChatOptions } from './ai-service';

export { executeFunctionCall } from './data-functions';
export type { FunctionContext } from './data-functions';

export {
    storeEmbedding,
    storeEmbeddings,
    searchSimilar,
    syncTableEmbeddings,
    generateTransactionContent,
    generateBillContent,
    generateOfferingContent,
    generateMemberContent
} from './vector-search';
export type { EmbeddingRecord, SearchResult } from './vector-search';
