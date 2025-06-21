// const geminiService = require('./geminiService');
const { SUMMARIZATION_TYPES, SUMMARIZATION_STYLES } = require('../utils/constants');

class GeminiAI {
    constructor(geminiService) {
        this.geminiService = geminiService;
        if (!this.geminiService || !this.geminiService.genAI) {
            this.logger = {
                debug: console.debug,
                info: console.info,
                warn: console.warn,
                error: console.error
            };
            this.logger.warn('Gemini AI service initialization failed. Using fallback mode.');
        }
    }

    /**
     * Generate a chat response using Gemini with document context
     * @param {string} userMessage - User's input message
     * @param {Array} documentChunks - Relevant document chunks from vectorStore
     * @param {Array} chatHistory - Previous messages in the session
     * @param {string} systemPrompt - Optional system prompt
     * @returns {Promise<string>} Generated response text
     */
    async generateChatResponse(userMessage, documentChunks, chatHistory, systemPrompt = '') {
        const context = this.buildContext(documentChunks);
        const prompt = this.buildSystemPrompt(systemPrompt, context, chatHistory) + `\nUser: ${userMessage}\nAssistant: `;
        
        try {
            // Check if Gemini service is properly initialized
            if (!this.geminiService || !this.geminiService.model) {
                console.warn('Gemini AI service not properly initialized. Using fallback response.');
                return this.getFallbackResponse(userMessage, context);
            }
            
            const result = await this.geminiService.model.generateContent(prompt);
            const response = result.response;
            return response.text().trim();
        } catch (error) {
            console.error('Gemini chat response error:', error.message);
            return this.getFallbackResponse(userMessage, context);
        }
    }

    /**
     * Get fallback response when Gemini AI is not available
     */
    getFallbackResponse(userMessage, context) {
        if (context && context !== 'No relevant document context available.') {
            return `I understand you're asking about: "${userMessage}". Based on the available documents, I can see relevant information, but I'm currently unable to provide a detailed AI-generated response. Please try again later or contact support if the issue persists.`;
        } else {
            return `I understand you're asking: "${userMessage}". I'm currently unable to provide an AI-generated response. Please try again later or contact support if the issue persists.`;
        }
    }

    /**
     * Generate a document summary using Gemini
     * @param {string} documentContent - Full document content
     * @param {Object} options - Summary options
     * @param {string} options.type - Type of summary (short, medium, long, bullet_points, conversational)
     * @param {string} options.style - Style of summary (formal, casual, technical, creative)
     * @param {number} options.length - Target length in words (optional)
     * @param {string} options.focus - Specific focus area (optional)
     * @returns {Promise<Object>} Summary object with text, key points, and metadata
     */
    async generateSummary(documentContent, options = {}) {
        // Defensive check for Gemini Service
        if (!this.geminiService?.model) {
            console.error('Gemini summary error: Gemini service or model is not initialized.');
            throw new Error('Failed to generate summary due to AI service initialization issues.');
        }

        const {
            type = SUMMARIZATION_TYPES.MEDIUM,
            style = SUMMARIZATION_STYLES.FORMAL,
            length,
            focus
        } = options;

        const prompt = `
You are an expert summarizer. Generate a ${style} summary of the following document:

${documentContent.substring(0, 4000)}...

Summary requirements:
1. Type: ${type}
2. Style: ${style}
3. Focus: ${focus || 'main points'}
4. Length: ${length ? `${length} words` : 'appropriate'}

Provide the summary in JSON format with these fields:
- text: The main summary text
- keyPoints: Array of bullet points highlighting main points
- sentiment: Overall sentiment (positive, negative, neutral)
- confidence: Confidence score (0-1)
- metadata: {
    wordCount: number of words,
    readingTime: estimated reading time in minutes,
    topics: array of main topics
}

Respond with ONLY a valid JSON object in this format.`;

        try {
            const result = await this.geminiService.model.generateContent(prompt);
            const response = result.response;
            let text = response.text().trim();

            // Clean response to extract JSON
            if (text.startsWith('```json')) {
                text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
            } else if (text.startsWith('```')) {
                text = text.replace(/```\s*/, '').replace(/\s*```$/, '');
            }

            // Try to extract JSON object
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const summary = JSON.parse(jsonMatch[0]);
            
            // Validate the summary structure
            if (!summary || !summary.text || !summary.keyPoints) {
                throw new Error('Invalid summary format');
            }
            
            return summary;
        } catch (error) {
            console.error('Gemini summary error:', error.message);
            // Provide a structured fallback error to avoid breaking the caller
            throw new Error('Failed to generate summary');
        }
    }

    /**
     * Generate a podcast script using Gemini
     * @param {string} documentContent - Full document content
     * @returns {Promise<Array>} Array of script segments
     */
    async generatePodcastScript(documentContent) {
        // First generate a summary to use as context
        const summary = await this.generateSummary(documentContent, {
            type: SUMMARIZATION_TYPES.MEDIUM,
            style: SUMMARIZATION_STYLES.CONVERSATIONAL
        });

        const prompt = `
You are an expert podcast scriptwriter. Based on the following summary and key points, create a podcast script for two hosts (Host A and Host B) discussing the key topics in an engaging, conversational style. The script should be structured as an array of JSON objects, each with:
- speaker: "Host A" or "Host B"
- text: The dialogue text (keep each segment between 2-4 sentences for natural flow)
- duration: Estimated duration in seconds (approximate)
- focus: Main topic of discussion

Summary:
${summary.text}

Key Points:
${summary.keyPoints.join('\n')}

Main Topics:
${summary.metadata.topics.join(', ')}

Create a script with 8-12 segments, covering all key points from the summary, with a total duration of about 3-4 minutes. Use a friendly, informative tone suitable for a general audience. Make sure Host A and Host B alternate naturally and have distinct personalities - Host A can be more analytical, Host B more curious and engaging.

Each segment should be conversational and flow naturally into the next. Include questions, reactions, and natural transitions between topics.

Respond with ONLY a valid JSON array of script segments.
`;

        try {
            const result = await this.geminiService.model.generateContent(prompt);
            const response = result.response;
            let text = response.text().trim();

      // Clean response to extract JSON
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const script = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(script) || script.length < 8) {
        throw new Error('Podcast script is too short or invalid');
      }

      return script;
    } catch (error) {
      console.error('Gemini podcast script error:', error.message);
      return [
        { speaker: 'Host A', text: 'Sorry, we could not generate the podcast script today.', duration: 10 },
        { speaker: 'Host B', text: 'Let us move on to another topic!', duration: 10 }
      ];
    }
  }

  /**
   * Generate mind map data using Gemini
   * @param {string} documentContent - Full document content
   * @returns {Promise<Object>} Mind map data with nodes and edges
   */
  async generateMindMapData(documentContent) {
    // Defensive check for Gemini Service
    if (!this.geminiService || !this.geminiService.model) {
        console.error('Gemini mind map error: Gemini service or model is not initialized.');
        throw new Error('Failed to generate mind map due to AI service initialization issues.');
    }

    const prompt = `
You are an expert in creating mind maps. Based on the following document content, generate a mind map structure representing the key concepts and their relationships. The mind map should be a JSON object with:
- nodes: Array of { id: string, label: string, content: string }
- edges: Array of { from: string, to: string, label: string }

Document Content:
${documentContent.substring(0, 4000)}...

Create a mind map with 5-10 nodes and appropriate edges, capturing the main ideas and their connections. Ensure the central node represents the document's main topic.

Respond with ONLY a valid JSON object containing nodes and edges.
`;

    try {
      const result = await this.geminiService.model.generateContent(prompt);
      const response = result.response;
      let text = response.text().trim();

      // Clean response to extract JSON
      if (text.startsWith('```json')) {
        text = text.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        text = text.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid JSON response from Gemini');
      }

      const mindMap = JSON.parse(jsonMatch[0]);
      if (!mindMap.nodes || !mindMap.edges || mindMap.nodes.length < 5) {
        throw new Error('Mind map data is too small or invalid');
      }

      return mindMap;
    } catch (error) {
      console.error('Gemini mind map data error:', error.message);
      return {
        nodes: [{ id: '1', label: 'Error', content: 'Failed to generate mind map' }],
        edges: []
      };
    }
  }

  /**
   * Generate simple text response using Gemini
   * @param {string} prompt - The prompt to send to Gemini
   * @returns {Promise<string>} Generated text response
   */
  async generateText(prompt) {
    try {
      const result = await this.geminiService.model.generateContent(prompt);
      const response = result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Gemini text generation error:', error.message);
      throw new Error('Failed to generate text response');
    }
  }

  /**
   * Build context from document chunks
   * @param {Array} documentChunks - Array of document chunks
   * @returns {string} Formatted context string
   */
  buildContext(documentChunks) {
    // Defensive: ensure documentChunks is an array
    if (!Array.isArray(documentChunks)) {
      documentChunks = [];
    }
    if (!documentChunks || documentChunks.length === 0) {
      return 'No relevant document context available.';
    }
    return documentChunks
      .map(chunk => `Document: ${chunk.metadata?.source || 'Unknown'}\n${chunk.content}`)
      .join('\n\n');
  }

  /**
   * Build system prompt with context and chat history
   * @param {string} systemPrompt - Base system prompt
   * @param {string} context - Document context
   * @param {Array} chatHistory - Array of { role: string, content: string }
   * @returns {string} Complete system prompt
   */
  buildSystemPrompt(systemPrompt, context, chatHistory) {
    const basePrompt = systemPrompt || 'You are a helpful AI assistant providing accurate and concise answers.';
    const contextSection = context ? `\n\nRelevant Context:\n${context}` : '';
    const historySection = chatHistory && chatHistory.length > 0
      ? `\n\nConversation History:\n${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
      : '';
    return `${basePrompt}${contextSection}${historySection}`;
  }
}

module.exports = GeminiAI;