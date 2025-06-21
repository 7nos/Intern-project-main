// client/src/components/ChatPage.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    sendMessage as apiSendMessage, saveChatHistory, queryRagService, generatePodcast, generateMindMap,
    getUserFiles, deleteUserFile, renameUserFile, performDeepSearch,
} from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';

import SystemPromptWidget, { availablePrompts, getPromptTextById } from './SystemPromptWidget';
import HistoryModal from './HistoryModal';
import FileUploadWidget from './FileUploadWidget';
import FileManagerWidget from './FileManagerWidget';
import MindMap from './MindMap';

import './ChatPage.css';

const ChatPage = ({ setIsAuthenticated }) => {
    // Consolidated state management
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [error, setError] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [userId, setUserId] = useState('');
    const [username, setUsername] = useState('');
    const [currentSystemPromptId, setCurrentSystemPromptId] = useState('friendly');
    const [editableSystemPromptText, setEditableSystemPromptText] = useState(() => getPromptTextById('friendly'));
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [files, setFiles] = useState([]);
    const [fileError, setFileError] = useState('');
    const [isRagEnabled, setIsRagEnabled] = useState(false);
    const [isDeepSearchEnabled, setIsDeepSearchEnabled] = useState(false);
    const [activeFileForRag, setActiveFileForRag] = useState(null);
    
    // Consolidated loading states
    const [loadingStates, setLoadingStates] = useState({
        chat: false,
        files: false,
        podcast: false,
        mindMap: false,
        deepSearch: false,
        listening: false
    });

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const navigate = useNavigate();

    // Computed properties
    const isProcessing = Object.values(loadingStates).some(Boolean);
    const hasFiles = files.length > 0;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const saveAndReset = useCallback(async (isLoggingOut = false, onCompleteCallback = null) => {
        const currentSessionId = localStorage.getItem('sessionId');
        const currentUserId = localStorage.getItem('userId');
        if (!currentSessionId || !currentUserId || isProcessing || messages.length === 0) {
            if (onCompleteCallback) onCompleteCallback();
            return;
        }
        try {
            const firstUserMessage = messages.find(m => m.role === 'user');
            const chatTitle = firstUserMessage ? firstUserMessage.parts[0].text.substring(0, 50) : 'New Conversation';
            await saveChatHistory({ sessionId: currentSessionId, messages, systemPrompt: editableSystemPromptText, title: chatTitle });
        } catch (saveError) {
            console.error("Failed to save chat history:", saveError);
        } finally {
            if (!isLoggingOut) {
                setMessages([]);
                const newSessionId = uuidv4();
                setSessionId(newSessionId);
                localStorage.setItem('sessionId', newSessionId);
            }
            if (onCompleteCallback) onCompleteCallback();
        }
    }, [messages, isProcessing, editableSystemPromptText]);

    const handleLogout = useCallback((skipSave = false) => {
        const performCleanup = () => {
            localStorage.clear();
            setIsAuthenticated(false);
            navigate('/login', { replace: true });
        };
        if (!skipSave && messages.length > 0) {
            saveAndReset(true, performCleanup);
        } else {
            performCleanup();
        }
    }, [messages.length, setIsAuthenticated, navigate, saveAndReset]);

    useEffect(() => {
        const storedUserId = localStorage.getItem('userId');
        const storedUsername = localStorage.getItem('username');
        if (!storedUserId || !storedUsername) {
            handleLogout(true);
        } else {
            setUserId(storedUserId);
            setUsername(storedUsername);
            const newSessionId = uuidv4();
            setSessionId(newSessionId);
            localStorage.setItem('sessionId', newSessionId);
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-US';
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;
            recognition.onstart = () => setLoadingStates(prev => ({ ...prev, listening: true }));
            recognition.onresult = (event) => setInputText(event.results[0][0].transcript);
            recognition.onerror = (e) => setError(`STT Error: ${e.error}`);
            recognition.onend = () => setLoadingStates(prev => ({ ...prev, listening: false }));
            recognitionRef.current = recognition;
        } else {
            console.warn('Web Speech API is not supported in this browser.');
        }
        return () => {
            if (recognitionRef.current) recognitionRef.current.stop();
            if (window.speechSynthesis) window.speechSynthesis.cancel();
        };
    }, [handleLogout]);

    const fetchFiles = useCallback(async () => {
        if (!userId) return;
        setLoadingStates(prev => ({ ...prev, files: true, error: '' }));
        try {
            const response = await getUserFiles();
            const filesData = response.data || [];
            setFiles(filesData);
        } catch (err) {
            setFileError('Could not load files.');
        } finally {
            setLoadingStates(prev => ({ ...prev, files: false }));
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchFiles();
        }
    }, [userId, fetchFiles]);

    const handleNewChat = useCallback(() => {
        if (!isProcessing) saveAndReset(false);
    }, [isProcessing, saveAndReset]);

    const handleLoadSession = useCallback((sessionData) => {
        if (isProcessing) return;
        const doLoad = () => {
            setMessages(sessionData.messages);
            setSessionId(sessionData.sessionId);
            setEditableSystemPromptText(sessionData.systemPrompt || getPromptTextById('friendly'));
            const matchingPrompt = availablePrompts.find(p => p.prompt === sessionData.systemPrompt);
            setCurrentSystemPromptId(matchingPrompt ? matchingPrompt.id : 'custom');
            localStorage.setItem('sessionId', sessionData.sessionId);
        };
        if (messages.length > 0) {
            saveAndReset(false, doLoad);
        } else {
            doLoad();
        }
    }, [isProcessing, saveAndReset, messages.length]);

    const speak = useCallback((text) => {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.3;
        window.speechSynthesis.speak(utterance);
    }, []);

    const handleSpeakMessage = useCallback((messageText) => {
        speak(messageText);
    }, [speak]);

    const handleSendMessage = useCallback(async (e) => {
        if (e) e.preventDefault();
        const trimmedInput = inputText.trim();
        if (!trimmedInput || isProcessing) return;

        if (loadingStates.listening) recognitionRef.current?.stop();

        const newUserMessage = { role: 'user', parts: [{ text: trimmedInput }], timestamp: new Date() };
        const historyToSend = [...messages, newUserMessage];
        setMessages(historyToSend);
        setInputText('');
        setError('');

        if (isDeepSearchEnabled) {
            setLoadingStates(prev => ({ ...prev, deepSearch: true }));
            try {
                const response = await performDeepSearch(trimmedInput, historyToSend);
                const deepSearchResult = {
                    role: 'assistant',
                    type: 'deep_search',
                    parts: [{ text: response.data.parts[0].text }],
                    timestamp: new Date(),
                    metadata: response.data.metadata
                };
                setMessages(prev => [...prev, deepSearchResult]);
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Deep search failed. Please try again.';
                setError(`Deep Search Error: ${errorMessage}`);
                setMessages(prev => prev.slice(0, -1)); // Remove the user message on error
                if (err.response?.status === 401) handleLogout(true);
            } finally {
                setLoadingStates(prev => ({ ...prev, deepSearch: false }));
            }
        } else if (isRagEnabled) {
            setLoadingStates(prev => ({ ...prev, chat: true }));
            try {
                // Use the RAG endpoint, passing the active file ID if it exists
                const ragPayload = { query: trimmedInput, history: historyToSend };
                if (activeFileForRag) {
                    ragPayload.fileId = activeFileForRag.id;
                }
                const response = await queryRagService(ragPayload);
                const ragText = response.data.parts[0].text;
                const assistantMessage = {
                    role: 'assistant',
                    type: 'rag',
                    parts: [{ text: ragText }],
                    timestamp: new Date(),
                    metadata: response.data.metadata
                };
                setMessages(prev => [...prev, assistantMessage]);
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'RAG query failed.';
                setError(`RAG Error: ${errorMessage}`);
                setMessages(prev => prev.slice(0, -1));
                if (err.response?.status === 401) handleLogout(true);
            } finally {
                setLoadingStates(prev => ({ ...prev, chat: false }));
            }
        } else {
            setLoadingStates(prev => ({ ...prev, chat: true }));
            try {
                // Use the normal Gemini chat endpoint
                const response = await apiSendMessage({ 
                    query: trimmedInput, 
                    history: historyToSend, 
                    sessionId: sessionId,
                    systemPrompt: editableSystemPromptText 
                });
                const assistantMessage = {
                    role: 'assistant',
                    parts: [{ text: response.data.message }],
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, assistantMessage]);
            } catch (err) {
                const errorMessage = err.response?.data?.error || 'Chat error.';
                setError(errorMessage);
                setMessages(prev => prev.slice(0, -1));
                if (err.response?.status === 401) handleLogout(true);
            } finally {
                setLoadingStates(prev => ({ ...prev, chat: false }));
            }
        }
    }, [inputText, isProcessing, loadingStates, isDeepSearchEnabled, isRagEnabled, messages, editableSystemPromptText, handleLogout, activeFileForRag, sessionId]);

    const handleMicButtonClick = useCallback(() => {
        if (!recognitionRef.current) return;
        if (loadingStates.listening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
    }, [loadingStates.listening]);

    const handleDeleteFile = async (fileId, fileName) => {
        if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
            try {
                await deleteUserFile(fileId);
                fetchFiles();
            } catch (err) {
                setFileError(`Could not delete ${fileName}.`);
            }
        }
    };

    const handleRenameFile = async (fileId, newName) => {
        try {
            await renameUserFile(fileId, newName);
            fetchFiles();
        } catch (err) {
            setFileError(`Could not rename file.`);
        }
    };

    const handleChatWithFile = useCallback((fileId, fileName) => {
        setActiveFileForRag({ id: fileId, name: fileName });
        setIsRagEnabled(true);
        // Add a message to the chat indicating the context has changed
        setMessages(prev => [...prev, {
            role: 'system', // Using a 'system' role for this notification
            parts: [{ text: `Now chatting with file: **${fileName}**` }],
            timestamp: new Date()
        }]);
    }, []);

    const handleGeneratePodcast = useCallback(async (fileId, fileName) => {
        if (isProcessing) return;
        setLoadingStates(prev => ({ ...prev, podcast: true }));
        setError('');
        
        try {
            // Show loading message
            setMessages(prev => [...prev, { 
                role: 'user', 
                parts: [{ text: `Requesting a podcast for "${fileName}"...` }], 
                timestamp: new Date()
            }]);

            const response = await generatePodcast(fileId);
            
            // Check if we got an audio file or text file
            const isAudioFile = response.data.audioUrl.endsWith('.mp3') || response.data.audioUrl.endsWith('.wav');
            
            if (isAudioFile) {
                // Handle audio file response - only show audio player
                const podcastMessage = { 
                    role: 'assistant', 
                    type: 'audio', 
                    parts: [{ text: `🎧 Podcast generated successfully!` }], 
                    audioUrl: response.data.audioUrl,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, podcastMessage]);

                // Log the audio URL for debugging
                console.log('Audio URL:', response.data.audioUrl);
                
                // Don't auto-play - let user control it manually
                // Auto-play can cause issues with browser policies
            } else {
                // If no audio file is generated, show error message
                const errorMessage = { 
                    role: 'assistant', 
                    parts: [{ text: `❌ Podcast generation failed. Audio could not be generated.` }], 
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, errorMessage]);
                setError('Podcast generation failed. Audio could not be generated.');
            }

        } catch (err) {
            console.error('Podcast generation error:', err);
            const errorMessage = err.response?.data?.message || 'Failed to generate podcast.';
            setError(`Podcast Error: ${errorMessage}`);
            
            // Add error message to chat
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                parts: [{ text: `Error generating podcast: ${errorMessage}` }], 
                timestamp: new Date()
            }]);
        } finally {
            setLoadingStates(prev => ({ ...prev, podcast: false }));
        }
    }, [isProcessing]);

    const handleOpenMindMapFullscreen = useCallback((messageIndex) => {
        const mindMapContainer = document.getElementById(`mindmap-container-${messageIndex}`);
        if (mindMapContainer) {
            if (mindMapContainer.requestFullscreen) {
                mindMapContainer.requestFullscreen();
            } else if (mindMapContainer.webkitRequestFullscreen) {
                mindMapContainer.webkitRequestFullscreen();
            } else if (mindMapContainer.msRequestFullscreen) {
                mindMapContainer.msRequestFullscreen();
            }
        } else {
            setError("Could not find the mind map element to make fullscreen.");
        }
    }, []);

    const handleGenerateMindMap = useCallback(async (fileId, fileName) => {
        if (isProcessing) return;
        setLoadingStates(prev => ({ ...prev, mindMap: true }));
        setError('');
        
        // Add user message
        setMessages(prev => [...prev, { 
            role: 'user', 
            parts: [{ text: `Generate a mind map for the file: ${fileName}` }], 
            timestamp: new Date() 
        }]);
        
        try {
            const response = await generateMindMap(fileId);
            
            // Check if response has the expected structure
            if (response.data && (response.data.nodes || response.data.mindmap)) {
                // Handle both direct response and nested mindmap response
                const mindMapData = response.data.mindmap || response.data;
                
                const mindMapMessage = { 
                    role: 'assistant', 
                    type: 'mindmap', 
                    parts: [{ text: `Here is the mind map for "${fileName}":` }], 
                    mindMapData: mindMapData, 
                    timestamp: new Date() 
                };
            setMessages(prev => [...prev, mindMapMessage]);
            } else {
                throw new Error('Invalid mind map data received from server');
            }
        } catch (err) {
            console.error('Mind map generation error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to generate mind map.';
            
            // Add error message to chat
            const errorMsg = { 
                role: 'assistant', 
                parts: [{ text: `❌ Mind Map Error: ${errorMessage}` }], 
                timestamp: new Date() 
            };
            setMessages(prev => [...prev, errorMsg]);
            
            setError(`Mind Map Error: ${errorMessage}`);
        } finally {
            setLoadingStates(prev => ({ ...prev, mindMap: false }));
        }
    }, [isProcessing]);

    const handlePromptSelectChange = useCallback((newId) => {
        setCurrentSystemPromptId(newId);
        setEditableSystemPromptText(getPromptTextById(newId));
    }, []);

    const handlePromptTextChange = useCallback((newText) => {
        setEditableSystemPromptText(newText);
        const matchingPreset = availablePrompts.find(p => p.id !== 'custom' && p.prompt === newText);
        setCurrentSystemPromptId(matchingPreset ? matchingPreset.id : 'custom');
    }, []);

    const handleHistory = useCallback(() => setIsHistoryModalOpen(true), []);
    const closeHistoryModal = useCallback(() => setIsHistoryModalOpen(false), []);

    const handleEnterKey = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    if (!userId) {
        return <div className="loading-indicator"><span>Initializing...</span></div>;
    }

    return (
        <div className="chat-page-container">
            <div className="sidebar-area">
                <SystemPromptWidget selectedPromptId={currentSystemPromptId} promptText={editableSystemPromptText} onSelectChange={handlePromptSelectChange} onTextChange={handlePromptTextChange} />
                <FileUploadWidget onUploadSuccess={fetchFiles} />
                <FileManagerWidget
                    files={files}
                    isLoading={loadingStates.files}
                    error={fileError}
                    onDeleteFile={handleDeleteFile}
                    onRenameFile={handleRenameFile}
                    onGeneratePodcast={handleGeneratePodcast}
                    onGenerateMindMap={handleGenerateMindMap}
                    onChatWithFile={handleChatWithFile}
                    isProcessing={isProcessing}
                />
            </div>
            <div className="chat-container">
                <header className="chat-header">
                    <h1>Engineering Tutor</h1>
                    <div className="header-controls">
                        <span className="username-display">Hi, {username}!</span>
                        <button onClick={handleHistory} className="header-button" disabled={isProcessing}>History</button>
                        <button onClick={handleNewChat} className="header-button" disabled={isProcessing}>New Chat</button>
                        <button onClick={() => handleLogout(false)} className="header-button" disabled={isProcessing}>Logout</button>
                    </div>
                </header>
                <div className="messages-area">
                    {messages.map((msg, index) => {
                        if (!msg?.role || !msg?.parts?.length) return null;
                        const messageText = msg.parts[0]?.text || '';
                        const timestamp = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                        
                        // --- THIS IS THE MODIFIED JSX STRUCTURE ---
                        return (
                            <div key={index} className={`message-wrapper ${msg.role}`}>
                                <div className={`message ${msg.type === 'deep_search' ? 'deep-search-result' : ''}`}>
                                    <div className="message-content">
                                        {msg.type === 'mindmap' ? (
                                            <>
                                                <p>{messageText}</p>
                                                <div id={`mindmap-container-${index}`} className="mindmap-container-for-export">
                                                    <MindMap mindMapData={msg.mindMapData} />
                                                </div>
                                                <div className="mindmap-actions">
                                                    <button onClick={() => handleOpenMindMapFullscreen(index)} className="mindmap-action-button">
                                                        View Fullscreen
                                                    </button>
                                                </div>
                                            </>
                                        ) : msg.type === 'audio' ? (
                                            <>
                                                <p>{messageText}</p>
                                                <audio 
                                                    controls 
                                                    style={{ width: '100%', marginTop: '10px' }}
                                                    onError={(e) => {
                                                        console.error('Audio element error:', e);
                                                        console.error('Audio URL:', msg.audioUrl);
                                                        console.error('Audio element:', e.target);
                                                    }}
                                                    onLoadStart={() => console.log('Audio loading started:', msg.audioUrl)}
                                                    onCanPlay={() => console.log('Audio can play:', msg.audioUrl)}
                                                >
                                                    <source src={msg.audioUrl} type="audio/wav" />
                                                    Your browser does not support the audio element.
                                                </audio>
                                            </>
                                        ) : (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{messageText}</ReactMarkdown>
                                        )}
                                    </div>
                                </div>
                                <div className="message-footer">
                                    <span className="message-timestamp">{timestamp}</span>
                                    {msg.role === 'assistant' && (
                                        <button onClick={() => handleSpeakMessage(messageText)} className="speaker-icon-button" title="Listen to message">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                        // --- END OF MODIFIED JSX STRUCTURE ---
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {(isProcessing) && (
                    <div className="loading-indicator">
                        <span>
                            {loadingStates.deepSearch ? 'Performing deep search...' :
                             loadingStates.mindMap ? 'Generating mind map...' :
                             loadingStates.podcast ? 'Generating podcast...' : 'Thinking...'}
                        </span>
                    </div>
                )}
                {!isProcessing && error && <div className="error-indicator">{error}</div>}
                
                {activeFileForRag && (
                    <div className="active-rag-file-indicator">
                        <span>Chatting with: <strong>{activeFileForRag.name}</strong></span>
                        <button onClick={() => setActiveFileForRag(null)} title="Clear file context">
                            &times;
                        </button>
                    </div>
                )}

                <footer className="input-area">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleEnterKey}
                        placeholder="Ask your tutor..."
                        rows="1"
                        disabled={isProcessing || loadingStates.listening}
                    />
                    <div className="toggle-container" title="Toggle Deep Search">
                        <input 
                            type="checkbox" 
                            id="deep-search-toggle" 
                            checked={isDeepSearchEnabled} 
                            onChange={(e) => {
                                const isChecked = e.target.checked;
                                setIsDeepSearchEnabled(isChecked);
                                if (isChecked) {
                                    setIsRagEnabled(false);
                                    setActiveFileForRag(null);
                                }
                            }} 
                            disabled={isProcessing || loadingStates.listening} 
                        />
                        <label htmlFor="deep-search-toggle">Deep Search</label>
                    </div>
                    <div className="toggle-container" title={!hasFiles ? "Upload files to enable RAG" : "Toggle RAG"}>
                        <input 
                            type="checkbox" 
                            id="rag-toggle" 
                            checked={isRagEnabled} 
                            onChange={(e) => {
                                const isChecked = e.target.checked;
                                setIsRagEnabled(isChecked);
                                if (isChecked) {
                                    setIsDeepSearchEnabled(false);
                                } else {
                                    // If user is un-toggling RAG, clear the active file as well
                                    setActiveFileForRag(null);
                                }
                            }} 
                            disabled={!hasFiles || isProcessing || loadingStates.listening} 
                        />
                        <label htmlFor="rag-toggle">RAG</label>
                    </div>
                    <button
                        onClick={handleMicButtonClick}
                        className={`icon-button mic-button ${loadingStates.listening ? 'listening' : ''}`}
                        disabled={isProcessing || !recognitionRef.current}
                        title={loadingStates.listening ? "Stop Voice Input" : "Start Voice Input"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                        </svg>
                    </button>
                    <button onClick={handleSendMessage} disabled={!inputText.trim() || isProcessing || loadingStates.listening} title="Send Message">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </footer>
            </div>
            <HistoryModal isOpen={isHistoryModalOpen} onClose={closeHistoryModal} onLoadSession={handleLoadSession} />
        </div>
    );
};

export default ChatPage;