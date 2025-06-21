# API Endpoints Documentation

## Overview
This document provides a comprehensive list of all API endpoints available in the application, including both frontend service calls and backend routes.

## Base URL
- **Backend**: `http://localhost:5001/api` (or `process.env.REACT_APP_BACKEND_PORT`)
- **Frontend Service**: Uses axios with automatic base URL detection

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 🔐 Authentication Endpoints

### POST `/api/auth/login`
**Description**: Authenticate user and get JWT token  
**Access**: Public  
**Request Body**:
```json
{
  "email": "string",
  "password": "string"
}
```
**Response**:
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "email",
    "name": "name"
  }
}
}
```

---

## 💬 Chat Endpoints

### POST `/api/chat/`
**Description**: Send a message to the chatbot with RAG support  
**Access**: Private  
**Request Body**:
```json
{
  "query": "string",
  "history": "array (optional)",
  "sessionId": "string",
  "messageType": "text|audio|mindmap|image|code (default: text)"
}
```
**Response**:
```json
{
  "message": "string|object",
  "sessionId": "string",
  "type": "string"
}
```

### POST `/api/chat/session`
**Description**: Create a new chat session  
**Access**: Private  
**Request Body**:
```json
{
  "title": "string",
  "description": "string (optional)",
  "systemPrompt": "string (optional)",
  "context": "general|academic|professional (default: general)"
}
```
**Response**:
```json
{
  "sessionId": "string",
  "title": "string",
  "context": "string",
  "state": "string"
}
```

### GET `/api/chat/sessions`
**Description**: Get all chat sessions for the user  
**Access**: Private  
**Query Parameters**:
- `state` (optional): Filter by session state
- `context` (optional): Filter by session context
- `tag` (optional): Filter by session tags

**Response**:
```json
[
  {
    "sessionId": "string",
    "title": "string",
    "updatedAt": "date",
    "context": "string",
    "state": "string"
  }
]
```

### GET `/api/chat/session/:sessionId`
**Description**: Get full details of a specific chat session  
**Access**: Private  
**Response**:
```json
{
  "sessionId": "string",
  "title": "string",
  "messages": "array",
  "systemPrompt": "string",
  "context": "string",
  "state": "string",
  "tags": "array"
}
```

### PUT `/api/chat/session/:sessionId`
**Description**: Update session details  
**Access**: Private  
**Request Body**:
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "systemPrompt": "string (optional)",
  "state": "string (optional)",
  "context": "string (optional)",
  "tags": "array (optional)"
}
```

### POST `/api/chat/session/:sessionId/archive`
**Description**: Archive a chat session  
**Access**: Private  
**Response**:
```json
{
  "message": "Session archived successfully"
}
```

### POST `/api/chat/session/:sessionId/restore`
**Description**: Restore an archived session  
**Access**: Private  
**Response**:
```json
{
  "message": "Session restored successfully"
}
```

### POST `/api/chat/session/:sessionId/tags`
**Description**: Add tags to a session  
**Access**: Private  
**Request Body**:
```json
{
  "tags": ["tag1", "tag2"]
}
```

### DELETE `/api/chat/session/:sessionId/tags`
**Description**: Remove tags from a session  
**Access**: Private  
**Request Body**:
```json
{
  "tags": ["tag1", "tag2"]
}
```

### GET `/api/chat/session/:sessionId/stats`
**Description**: Get session statistics  
**Access**: Private  
**Response**:
```json
{
  "messageCount": "number",
  "activeDuration": "number (seconds)",
  "lastActive": "date",
  "tags": "number",
  "context": "string",
  "messageTypeCounts": {
    "text": "number",
    "audio": "number",
    "mindmap": "number",
    "image": "number",
    "code": "number"
  }
}
```

### GET `/api/chat/history`
**Description**: Get chat history for a session  
**Access**: Private  
**Query Parameters**:
- `sessionId` (required): Session ID

**Response**:
```json
[
  {
    "role": "user|assistant",
    "parts": [{"text": "string"}],
    "type": "string",
    "timestamp": "date"
  }
]
```

### GET `/api/chat/search`
**Description**: Search through chat history  
**Access**: Private  
**Query Parameters**:
- `query` (required): Search query
- `sessionId` (required): Session ID

### DELETE `/api/chat/:sessionId`
**Description**: Delete a chat session  
**Access**: Private  
**Response**:
```json
{
  "message": "Session deleted successfully"
}
```

### POST `/api/chat/deep-search`
**Description**: Perform AI-powered deep search with query decomposition  
**Access**: Private  
**Request Body**:
```json
{
  "query": "string",
  "history": ["string"],
  "sessionId": "string"
}
```
**Response**:
```json
{
  "role": "assistant",
  "type": "deep_search",
  "parts": [{"text": "string"}],
  "metadata": {
    "query": "string",
    "decomposition": {},
    "totalResults": number,
    "sources": ["string"],
    "confidence": number,
    "aiGenerated": boolean,
    "cached": boolean
  }
}
}
```

### POST `/api/chat/history`
**Description**: Save or update chat history  
**Access**: Private  
**Request Body**:
```json
{
  "sessionId": "string",
  "messages": "array",
  "systemPrompt": "string (optional)",
  "title": "string (optional)"
}
```

### POST `/api/chat/message`
**Description**: Legacy endpoint (deprecated - returns 501)  
**Access**: Private  

### POST `/api/chat/rag`
**Description**: Legacy RAG endpoint (deprecated - returns 501)  
**Access**: Private  

---

## 📁 File Management Endpoints

### POST `/api/files/upload`
**Description**: Upload a file with automatic RAG processing  
**Access**: Private  
**Request**: Multipart form data with file  
**Response**:
```json
{
  "fileId": "string",
  "filename": "string",
  "url": "string"
}
}
```

### GET `/api/files`
**Description**: Get all files for the authenticated user  
**Access**: Private  
**Response**:
```json
[
  {
    "_id": "string",
    "originalname": "string",
    "filename": "string",
    "mimetype": "string",
    "size": "number",
    "createdAt": "date"
  }
]
```

### PATCH `/api/files/:id`
**Description**: Rename a file  
**Access**: Private  
**Request Body**:
```json
{
  "newOriginalName": "string"
}
```
**Response**: Updated file object

### DELETE `/api/files/:id`
**Description**: Delete a file and associated data  
**Access**: Private  
**Response**:
```json
{
  "msg": "File and associated data removed"
}
```

---

## 🎙️ Podcast Generation Endpoints

### POST `/api/podcast/generate`
**Description**: Generate a podcast from a file  
**Access**: Private  
**Request Body**:
```json
{
  "fileId": "string"
}
```
**Response**:
```json
{
  "audioUrl": "string"
}
```

---

## 🗺️ Mind Map Generation Endpoints

### POST `/api/mindmap/generate`
**Description**: Generate a mind map from a file  
**Access**: Private  
**Request Body**:
```json
{
  "fileId": "string"
}
```
**Response**: React Flow formatted mind map data

---

## 📚 Syllabus Endpoints

### GET `/api/syllabus/:subjectId`
**Description**: Get syllabus content for a specific subject  
**Access**: Private  
**Response**:
```json
{
  "syllabus": "string (markdown content)"
}
```

---

## 📜 History Management Endpoints

### POST `/api/history`
**Description**: Save or update a chat session  
**Access**: Private  
**Request Body**:
```json
{
  "sessionId": "string",
  "messages": "array",
  "systemPrompt": "string (optional)",
  "title": "string (optional)"
}
```

### GET `/api/history`
**Description**: Get all chat sessions for a user  
**Access**: Private  
**Response**:
```json
[
  {
    "sessionId": "string",
    "title": "string",
    "createdAt": "date"
  }
]
```

### GET `/api/history/:sessionId`
**Description**: Get a single full chat session  
**Access**: Private  
**Response**: Complete session object

### DELETE `/api/history/:sessionId`
**Description**: Delete a chat session  
**Access**: Private  
**Response**:
```json
{
  "message": "Chat session deleted successfully."
}
```

---

## 🌐 Network Endpoints

### GET `/api/network/ip`
**Description**: Get all available IP addresses  
**Access**: Public  
**Response**:
```json
{
  "ips": ["localhost", "192.168.1.100", ...]
}
```

---

## 🔧 Services Endpoints

### GET `/api/services/status`
**Description**: Get health status of all services  
**Access**: Public  
**Response**:
```json
{
  "aiSearch": "boolean",
  "aiService": "boolean",
  "cacheService": "boolean",
  "deepSearch": "boolean",
  "documentProcessor": "boolean",
  "duckduckgo": "boolean",
  "geminiAI": "boolean",
  "geminiService": "boolean",
  "geminiServiceDS": "boolean",
  "podcastGenerator": "boolean",
  "storage": "boolean",
  "vectorStore": "boolean"
}
```

### POST `/api/services/ai-search`
**Description**: Test AI search service  
**Access**: Public  
**Request Body**:
```json
{
  "query": "string"
}
```

### POST `/api/services/ai-service`
**Description**: Test AI service  
**Access**: Public  
**Request Body**:
```json
{
  "prompt": "string"
}
```

### POST `/api/services/cache`
**Description**: Test cache service  
**Access**: Public  
**Request Body**:
```json
{
  "key": "string"
}
```

### POST `/api/services/deep-search`
**Description**: Test deep search service  
**Access**: Public  
**Request Body**:
```json
{
  "query": "string"
}
```

### POST `/api/services/process-document`
**Description**: Test document processor  
**Access**: Public  
**Request Body**:
```json
{
  "filePath": "string",
  "originalName": "string"
}
```

### POST `/api/services/gemini-ai`
**Description**: Test Gemini AI service  
**Access**: Public  
**Request Body**:
```json
{
  "prompt": "string"
}
```

### POST `/api/services/gemini-service`
**Description**: Test Gemini service  
**Access**: Public  
**Request Body**:
```json
{
  "query": "string"
}
```

### POST `/api/services/gemini-service-ds`
**Description**: Test Gemini service DS  
**Access**: Public  
**Request Body**:
```json
{
  "input": "string"
}
```

### POST `/api/services/podcast`
**Description**: Test podcast generator  
**Access**: Public  
**Request Body**:
```json
{
  "script": "string"
}
```

### POST `/api/services/storage`
**Description**: Test storage service  
**Access**: Public  
**Request Body**:
```json
{
  "documentId": "string"
}
```

### POST `/api/services/vector-store`
**Description**: Test vector store service  
**Access**: Public  
**Request Body**:
```json
{
  "query": "string"
}
```

---

## 🚀 Frontend API Service Functions

The frontend uses a centralized API service (`client/src/services/api.js`) with the following functions:

### Authentication
- `signupUser(userData)` → POST `/api/auth/signup`
- `signinUser(userData)` → POST `/api/auth/signin`

### Chat
- `sendMessage(messageData)` → POST `/api/chat/message` (deprecated)
- `saveChatHistory(historyData)` → POST `/api/chat/history`
- `queryRagService(queryData)` → POST `/api/chat/rag` (deprecated)
- `getChatSessions()` → GET `/api/chat/sessions`
- `getSessionDetails(sessionId)` → GET `/api/chat/session/:sessionId`
- `performDeepSearch(query, history)` → POST `/api/chat/deep-search`

### File Management
- `uploadFile(formData)` → POST `/api/upload`
- `getUserFiles()` → GET `/api/files`
- `deleteUserFile(fileId)` → DELETE `/api/files/:id`
- `renameUserFile(fileId, newOriginalName)` → PATCH `/api/files/:id`

### Content Generation
- `generatePodcast(fileId)` → POST `/api/podcast/generate`
- `generateMindMap(fileId)` → POST `/api/mindmap/generate`

---

## 🔒 Error Responses

### 400 Bad Request
```json
{
  "message": "Error description"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authorized"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Server error description"
}
```

### 501 Not Implemented
```json
{
  "message": "Service not available"
}
```

---

## 📝 Notes

1. **Authentication**: All protected endpoints require a valid JWT token in the Authorization header
2. **File Uploads**: Use multipart/form-data for file uploads
3. **Session Management**: Chat sessions are automatically created and managed
4. **RAG Processing**: File uploads automatically trigger RAG processing
5. **Rate Limiting**: Some endpoints may have rate limiting applied
6. **Caching**: Deep search results are cached for performance
7. **Error Handling**: All endpoints return consistent error formats
8. **Deprecated Endpoints**: Some legacy endpoints return 501 status codes

---

## 🔄 API Versioning

Current API version: v1  
Base URL pattern: `/api/v1/` (future consideration)

---

*Last updated: December 2024* 
