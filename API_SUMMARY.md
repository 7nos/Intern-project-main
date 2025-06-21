# API Endpoints Quick Reference

## 🔑 Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/signin` - Login user

## 💬 Chat & Messaging
- `POST /api/chat/` - Send message with RAG
- `POST /api/chat/deep-search` - AI-powered search
- `GET /api/chat/sessions` - Get user sessions
- `POST /api/chat/session` - Create new session
- `GET /api/chat/session/:id` - Get session details

## 📁 File Management
- `POST /api/upload` - Upload file
- `GET /api/files` - Get user files
- `PATCH /api/files/:id` - Rename file
- `DELETE /api/files/:id` - Delete file

## 🎙️ Content Generation
- `POST /api/podcast/generate` - Generate podcast
- `POST /api/mindmap/generate` - Generate mind map

## 📚 Educational
- `GET /api/syllabus/:subjectId` - Get syllabus content

## 📜 History
- `GET /api/history` - Get chat history
- `POST /api/history` - Save chat history
- `DELETE /api/history/:id` - Delete session

## 🔧 System
- `GET /api/network/ip` - Get network IPs
- `GET /api/services/status` - Service health check

## 🚀 Frontend Functions (api.js)
```javascript
// Auth
signupUser(userData)
signinUser(userData)

// Chat
performDeepSearch(query, history)
getChatSessions()
getSessionDetails(sessionId)
saveChatHistory(historyData)

// Files
uploadFile(formData)
getUserFiles()
deleteUserFile(fileId)
renameUserFile(fileId, newName)

// Content
generatePodcast(fileId)
generateMindMap(fileId)
```

## 🔒 Authentication Header
```
Authorization: Bearer <jwt_token>
```

## 📍 Base URL
- Backend: `http://localhost:5001/api`
- Frontend: Auto-detected from environment 