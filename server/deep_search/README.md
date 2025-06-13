# Deep Search Integration

This directory contains the Deep Search functionality integrated into the main server application.

## Features

- **AI-Powered Query Decomposition**: Uses Google Gemini AI to break down complex queries into searchable components
- **Web Search**: Integrates with DuckDuckGo for comprehensive web search results
- **Result Synthesis**: AI-powered synthesis of search results into coherent answers
- **Caching System**: Universal caching supporting memory, file-based, and Redis caching
- **Rate Limiting**: Conservative rate limiting to avoid API restrictions
- **Cognitive Bias Analysis**: Optional analysis of search queries and results for potential biases

## Directory Structure

```
deep_search/
├── cache/                  # File-based cache storage
├── routes/
│   ├── deepSearch.js      # Traditional search routes
│   └── aiSearch.js        # AI-powered search routes
├── services/
│   ├── cacheService.js    # Universal caching service
│   └── geminiService.js   # Google Gemini AI integration
├── utils/
│   └── duckduckgo.js      # DuckDuckGo search wrapper
└── README.md              # This file
```

## API Endpoints

### Integrated with Chat
- `POST /api/chat/deep-search` - Main deep search endpoint used by the chat interface

### Standalone Deep Search APIs
- `GET /api/deep-search/health` - Health check
- `GET /api/deep-search?q=query` - Basic search
- `GET /api/deep-search/suggestions?q=query` - Search suggestions
- `GET /api/deep-search/bias?q=query` - Cognitive bias analysis
- `POST /api/deep-search/parallel` - Parallel search for multiple queries

### AI Search APIs
- `GET /api/deep-search/ai/health` - AI service health check
- `POST /api/deep-search/ai` - Full AI-powered search with decomposition and synthesis
- `GET /api/deep-search/ai/simple?q=query` - Simple AI search
- `POST /api/deep-search/ai/decompose` - Query decomposition only
- `POST /api/deep-search/ai/synthesize` - Result synthesis only

## Configuration

The deep search service uses the following environment variables:

- `GEMINI_API_KEY` - Required for AI features (already configured in main server)
- `CACHE_TYPE` - Cache type: 'memory' (default), 'file', or 'redis'
- `REDIS_URL` - Redis connection URL (if using Redis cache)

## Dependencies

The following packages were added to support deep search:
- `duck-duck-scrape@2.2.7` - DuckDuckGo search integration
- `node-cache@^5.1.2` - In-memory caching
- `helmet@^7.1.0` - Security middleware
- `compression@^1.7.4` - Response compression
- `redis@^4.6.0` - Redis client (optional)

## Usage in Client

The deep search functionality is integrated into the chat interface:

1. Toggle the "Deep Search" checkbox in the chat interface
2. Send a message - it will be processed using AI-powered deep search
3. Results are synthesized and presented with source information

## Rate Limiting

The service implements conservative rate limiting:
- 2-second minimum delay between DuckDuckGo requests
- Maximum 2 search queries per deep search request
- Automatic retry with exponential backoff on rate limit errors
- Comprehensive caching to reduce API calls

## Error Handling

- Graceful degradation when AI services are unavailable
- Fallback to basic search when rate limited
- Comprehensive error logging and user-friendly error messages
- Automatic cache fallback on service failures

## Performance

- Universal caching system reduces API calls
- Parallel processing where possible
- Conservative rate limiting prevents service blocking
- Efficient result synthesis and formatting
