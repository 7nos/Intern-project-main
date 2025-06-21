// server/services/geminiService.js
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const { handleGeminiError, handleRAGError } = require('../utils/errorUtils');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash";

let genAI = null;

if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not found. AI features will be disabled.");
    throw new Error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
} else {
    try {
        genAI = new GoogleGenerativeAI(API_KEY);
        console.log("🤖 Gemini AI service initialized successfully");
    } catch (error) {
        console.error("❌ Failed to initialize Gemini AI:", error.message);
        genAI = null; // Set to null on failure
    }
}

const baseGenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 4096,
};

const baseSafetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

class GeminiService {
    constructor() {
        if (!genAI) {
            throw new Error("Gemini AI service could not be initialized.");
        }
        this.genAI = genAI;
        this.model = this.genAI.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: baseGenerationConfig,
            safetySettings: baseSafetySettings
        });
    }

    // --- Static Helper Methods ---

    static _validateAndPrepareHistory(chatHistory) {
        if (!Array.isArray(chatHistory) || chatHistory.length === 0) {
            throw new Error("Chat history must be a non-empty array.");
        }
        if (chatHistory[chatHistory.length - 1].role !== 'user') {
            throw new Error("Internal error: Invalid chat history sequence for API call.");
        }
        return chatHistory.slice(0, -1)
            .map(msg => ({
                role: msg.role,
                parts: msg.parts.map(part => ({ text: part.text || '' }))
            }))
            .filter(msg => msg.role && msg.parts.length > 0);
    }

    static _configureModel(systemPromptText) {
        const modelOptions = {
            model: MODEL_NAME,
            generationConfig: baseGenerationConfig,
            safetySettings: baseSafetySettings,
        };
        if (systemPromptText?.trim()) {
            modelOptions.systemInstruction = { parts: [{ text: systemPromptText.trim() }] };
        }
        return genAI.getGenerativeModel(modelOptions);
    }

    static _processApiResponse(response) {
        const candidate = response?.candidates?.[0];
        if (candidate && (candidate.finishReason === 'STOP' || candidate.finishReason === 'MAX_TOKENS')) {
            const responseText = candidate.content?.parts?.[0]?.text;
            if (typeof responseText === 'string') return responseText;
        }
        // Throw a more informative error
        const finishReason = candidate?.finishReason || 'Unknown';
        const blockedCategories = candidate?.safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
        let blockMessage = `AI response generation failed. Reason: ${finishReason}.`;
        if (blockedCategories) blockMessage += ` Blocked Categories: ${blockedCategories}.`;
        throw new Error(blockMessage || "Received an empty or invalid response from the AI service.");
    }


    // --- Core Chat and Content Generation Methods ---

    async generateContentWithHistory(chatHistory, systemPromptText = null) {
        if (!this.genAI) throw new Error("Gemini AI service is not available.");

        try {
            const historyForStartChat = GeminiService._validateAndPrepareHistory(chatHistory);
            const model = GeminiService._configureModel(systemPromptText);
            const chat = model.startChat({ history: historyForStartChat });
            
            const lastUserMessageText = chatHistory[chatHistory.length - 1].parts[0].text;
            const result = await chat.sendMessage(lastUserMessageText);
            
            return GeminiService._processApiResponse(result.response);

        } catch (error) {
            console.error("Gemini API Call Error:", error?.message || error);
            const clientMessage = error.message.includes("API key not valid")
                ? "AI Service Error: Invalid API Key."
                : `AI Service Error: ${error.message}`;
            const enhancedError = new Error(clientMessage);
            enhancedError.status = error.status || 500;
            throw enhancedError;
        }
    }

    async generateChatResponse(message, documentChunks = [], chatHistory = [], systemPrompt = '') {
         try {
            if (!this.genAI) {
                return "The AI service is currently unavailable. Please try again later.";
            }

            const context = documentChunks.map(chunk => chunk.pageContent).join('\n\n');
            const fullSystemPrompt = `${systemPrompt}\n\n## Context from Documents:\n${context}`.trim();

            const model = GeminiService._configureModel(fullSystemPrompt);
            const chat = model.startChat({ history: chatHistory });
            const result = await chat.sendMessage(message);

            return GeminiService._processApiResponse(result.response);
        } catch (error) {
            console.error("Error in generateChatResponse:", error);
            throw handleGeminiError(error);
        }
    }


    // --- RAG and Deep Search Methods ---

    async synthesizeResults(results, query, decomposition) {
        try {
            if (!this.genAI) {
                return {
                    summary: `I'm sorry, but the AI service is unavailable. I found ${results.length} results for your query: "${query}".`,
                    sources: results.map(r => r.metadata?.source || r.source || 'Unknown'),
                    aiGenerated: false,
                    fallback: true
                };
            }

            const context = results.map(result => `Source: ${result.metadata.source}\nSnippet: ${result.metadata.snippet}`).join('\n\n');
            const prompt = `Based on the following search results, provide a concise answer to the query: "${query}".\n\nContext:\n${context}`;
            
            const result = await this.model.generateContent(prompt);
            const text = GeminiService._processApiResponse(result.response);

            return {
                summary: text,
                sources: results.map(r => r.metadata?.source || r.source),
                aiGenerated: true,
                decomposition: decomposition || []
            };
        } catch (error) {
            console.error('Error in synthesizeResults:', error);
            throw handleRAGError(error, query);
        }
    }


    // --- Creative Content Generation ---

    async generatePodcastFromTranscript(transcript, title) {
        if (!this.genAI) return { error: "AI service is unavailable." };
        const prompt = `Create a short podcast script based on this transcript titled "${title}":\n\n${transcript}`;
        try {
            const result = await this.model.generateContent(prompt);
            // This is a simplified placeholder; you would have more complex logic here
            return { script: GeminiService._processApiResponse(result.response) };
        } catch (error) {
            console.error(`Error generating podcast for "${title}":`, error);
            throw new Error(`Failed to generate podcast script. ${error.message}`);
        }
    }

    async generateMindMapFromTranscript(transcript, title) {
        if (!this.genAI) return { error: "AI service is unavailable." };
        const prompt = `Generate a mind map in a structured format (e.g., JSON with nodes and edges) for this transcript titled "${title}":\n\n${transcript}`;
        try {
            const result = await this.model.generateContent(prompt);
            // This is a simplified placeholder; you would have more complex logic to parse this
             return { mindMapData: GeminiService._processApiResponse(result.response) };
        } catch (error) {
            console.error(`Error generating mind map for "${title}":`, error);
            throw new Error(`Failed to generate mind map data. ${error.message}`);
        }
    }
}

// Crucially, we now only export the class itself.
module.exports = GeminiService;
