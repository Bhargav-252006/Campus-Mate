import React, {useState, useEffect, useRef} from 'react';
import {Send, Mic, MicOff, Volume2, VolumeX, Trash2, Bot} from 'lucide-react';
import {sendMessageToAgent, getChatHistory, clearChatHistory, getSessionUserId} from '../services/api';
import ReactMarkdown from 'react-markdown';

// Emoji regex extracted as a constant to avoid duplication
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{203C}]|[\u{2049}]|[\u{25AA}]|[\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{2139}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu;

// Counter for unique message IDs
let messageIdCounter = 0;

const buildMessageId = (prefix = 'msg') => `${prefix}_${Date.now()}_${++messageIdCounter}`;

const CHAT_PENDING_STORAGE_KEY = 'campusMate_pending_chat_requests';
const PENDING_HISTORY_POLL_MS = 2000;
const PENDING_REQUEST_TTL_MS = 2 * 60 * 1000;

const getMessageTimestamp = (message) => message?.timestamp || message?.createdAt || new Date().toISOString();

const buildMessageIdentity = (message) => {
    if (message.clientRequestId) {
        return `${message.clientRequestId}:${message.sender}`;
    }

    return `${message.id || ''}:${message.sender}:${message.text || ''}:${getMessageTimestamp(message)}`;
};

const mergeUniqueMessages = (...messageGroups) => {
    const mergedMessages = new Map();
    const dedupeWindowMs = 10000;

    messageGroups
        .flat()
        .filter(Boolean)
        .sort((left, right) => new Date(getMessageTimestamp(left)) - new Date(getMessageTimestamp(right)))
        .forEach((message) => {
            // Collapse optimistic + persisted duplicates when they have same sender/text
            // and are created close together (local UI id/timestamp may differ from DB records).
            const hasNearDuplicate = Array.from(mergedMessages.values()).some((existingMessage) => {
                if (existingMessage.sender !== message.sender) return false;
                if ((existingMessage.text || '') !== (message.text || '')) return false;

                const existingTime = new Date(getMessageTimestamp(existingMessage)).getTime();
                const nextTime = new Date(getMessageTimestamp(message)).getTime();
                if (Number.isNaN(existingTime) || Number.isNaN(nextTime)) return false;

                return Math.abs(existingTime - nextTime) <= dedupeWindowMs;
            });

            if (hasNearDuplicate) {
                return;
            }

            mergedMessages.set(buildMessageIdentity(message), {
                ...message,
                timestamp: getMessageTimestamp(message)
            });
        });

    return Array.from(mergedMessages.values());
};

const readPendingRequests = () => {
    try {
        const rawValue = localStorage.getItem(CHAT_PENDING_STORAGE_KEY);
        if (!rawValue) return [];

        const parsedValue = JSON.parse(rawValue);
        if (!Array.isArray(parsedValue)) return [];

        const now = Date.now();
        const filteredEntries = parsedValue.filter((entry) => {
            if (!entry?.clientRequestId || !entry?.userId) return false;

            const createdAtMs = new Date(entry.createdAt || 0).getTime();
            if (!createdAtMs || Number.isNaN(createdAtMs)) return false;

            return now - createdAtMs < PENDING_REQUEST_TTL_MS;
        });

        // Keep localStorage clean from stale pending records.
        if (filteredEntries.length !== parsedValue.length) {
            writePendingRequests(filteredEntries);
        }

        return filteredEntries;
    } catch (error) {
        console.error('Failed to parse pending chat requests:', error);
        return [];
    }
};

const writePendingRequests = (entries) => {
    localStorage.setItem(CHAT_PENDING_STORAGE_KEY, JSON.stringify(entries));
};

const getPendingRequestsForUser = (activeUserId) => readPendingRequests().filter((entry) => entry.userId === activeUserId);

const upsertPendingRequest = (nextEntry) => {
    const nextEntries = readPendingRequests().filter((entry) => entry.clientRequestId !== nextEntry.clientRequestId);
    nextEntries.push(nextEntry);
    writePendingRequests(nextEntries);
};

const removePendingRequest = (clientRequestId) => {
    const nextEntries = readPendingRequests().filter((entry) => entry.clientRequestId !== clientRequestId);
    writePendingRequests(nextEntries);
};

const normalizeHistory = (history) => history.map((message, index) => ({
    ...message,
    id: message.id || `history_${index}_${getMessageTimestamp(message)}`,
    timestamp: getMessageTimestamp(message)
}));

const appendTranscriptToDraft = (currentText, transcript) => {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) return currentText;

    const trimmedCurrent = currentText.replace(/\s+$/, '');
    if (!trimmedCurrent) return cleanTranscript;

    const separator = trimmedCurrent.endsWith('\n') ? '' : ' ';
    return `${trimmedCurrent}${separator}${cleanTranscript}`;
};

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // Disabled by default - only speaks for voice input
    const [voiceInputUsed, setVoiceInputUsed] = useState(false); // Track if last input was voice
    const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [recognition, setRecognition] = useState(null);
    const [userId, setUserId] = useState(null);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [draftMessage, setDraftMessage] = useState(null);
    const messagesEndRef = useRef(null);
    const composerRef = useRef(null);
    const pendingPollRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        // Reuse the shared session identity so chat history stays on the same account.
        const id = getSessionUserId() || null;
        setUserId(id);

        if (id) {
            // Load chat history for the current persistent session.
            loadChatHistory(id);
        }

        // Load available voices
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            // Set default to first female voice or first voice
            const femaleVoice = voices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha'));
            setSelectedVoice(femaleVoice || voices[0]);
        };

        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        // Setup speech recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.continuous = false;
            recognitionInstance.lang = 'en-US';
            recognitionInstance.interimResults = false;

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInputText((currentText) => appendTranscriptToDraft(currentText, transcript));
                setIsListening(false);
                setVoiceInputUsed(true); // Mark that voice input was used
                requestAnimationFrame(() => composerRef.current?.focus());
            };

            recognitionInstance.onerror = () => setIsListening(false);
            recognitionInstance.onend = () => setIsListening(false);

            setRecognition(recognitionInstance);
        }

        return () => {
            isMountedRef.current = false;
            if (pendingPollRef.current) {
                clearInterval(pendingPollRef.current);
                pendingPollRef.current = null;
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        if (initialLoadRef.current) {
            initialLoadRef.current = false;
            scrollToBottom(true);
        } else {
            scrollToBottom();
        }
    }, [messages]);

    useEffect(() => {
        const composer = composerRef.current;
        if (!composer) return;

        composer.style.height = '0px';
        composer.style.height = `${Math.min(composer.scrollHeight, 160)}px`;
    }, [inputText]);

    const syncMessagesWithHistory = (history, activeUserId) => {
        const normalizedHistory = normalizeHistory(history);
        const pendingMessages = getPendingRequestsForUser(activeUserId).flatMap((entry) => {
            const hasPersistedUserMessage = normalizedHistory.some((message) => (
                message.clientRequestId === entry.clientRequestId && message.sender === 'user'
            ));

            return hasPersistedUserMessage ? [] : [entry.userMessage];
        });

        setMessages((previousMessages) => {
            const mergedMessages = mergeUniqueMessages(previousMessages, normalizedHistory, pendingMessages);

            if (mergedMessages.length > 0) {
                return mergedMessages;
            }

            return [{
                id: 'welcome',
                sender: 'bot',
                text: "Hello! 👋 I'm your Campus Mate assistant. I can help you with:\n\n• 📚 Academic questions & explanations\n• 😊 Emotional support & motivation\n• 🧠 Cognitive load management\n• 📊 Study strategies & failure patterns\n\nHow can I help you today?",
                timestamp: new Date().toISOString()
            }];
        });
    };

    const stopPendingHistoryPolling = () => {
        if (pendingPollRef.current) {
            clearInterval(pendingPollRef.current);
            pendingPollRef.current = null;
        }
    };

    const startPendingHistoryPolling = (activeUserId) => {
        stopPendingHistoryPolling();

        if (!getPendingRequestsForUser(activeUserId).length) {
            return;
        }

        pendingPollRef.current = setInterval(async () => {
            const pendingEntries = getPendingRequestsForUser(activeUserId);
            if (!pendingEntries.length) {
                stopPendingHistoryPolling();
                return;
            }

            try {
                const history = await getChatHistory(activeUserId);
                const normalizedHistory = normalizeHistory(history);

                pendingEntries.forEach((entry) => {
                    const hasBotReply = normalizedHistory.some((message) => (
                        message.clientRequestId === entry.clientRequestId && message.sender === 'bot'
                    ));

                    if (hasBotReply) {
                        removePendingRequest(entry.clientRequestId);
                    }
                });

                if (isMountedRef.current) {
                    syncMessagesWithHistory(history, activeUserId);
                }

                if (!getPendingRequestsForUser(activeUserId).length) {
                    stopPendingHistoryPolling();
                }
            } catch (error) {
                console.error('Error polling pending chat history:', error);
            }
        }, PENDING_HISTORY_POLL_MS);
    };

    const loadChatHistory = async (id) => {
        try {
            const activeUserId = id || userId;
            const history = await getChatHistory(activeUserId);
            syncMessagesWithHistory(history, activeUserId);
            startPendingHistoryPolling(activeUserId);
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const initialLoadRef = useRef(true);

    const scrollToBottom = (instant = false) => {
        messagesEndRef.current?.scrollIntoView({behavior: instant ? 'instant' : 'smooth'});
    };

    const resetDraftState = () => {
        setDraftMessage(null);
        setSelectedMessageId(null);
    };

    const handleSend = async (text = inputText) => {
        const finalText = text.trim();
        if (!finalText || isLoading || !userId) return;

        // Stop any ongoing speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsCurrentlySpeaking(false);
        }

        // Remember if this was a voice input
        const wasVoiceInput = voiceInputUsed;
        setVoiceInputUsed(false); // Reset for next input
        const clientRequestId = buildMessageId('chatreq');
        const requestTimestamp = new Date().toISOString();

        const userMessage = {
            id: buildMessageId(),
            sender: 'user',
            text: finalText,
            timestamp: requestTimestamp,
            clientRequestId
        };

        upsertPendingRequest({
            clientRequestId,
            userId,
            userMessage,
            createdAt: requestTimestamp
        });

        setMessages(prev => mergeUniqueMessages(prev, [userMessage]));
        setInputText('');
        resetDraftState();
        setIsLoading(true);
        startPendingHistoryPolling(userId);

        try {
            const response = await sendMessageToAgent(finalText, userId, clientRequestId);

            const botMessage = {
                id: buildMessageId(),
                sender: 'bot',
                text: response.response,
                timestamp: response.timestamp,
                clientRequestId
            };

            removePendingRequest(clientRequestId);
            setMessages(prev => mergeUniqueMessages(prev, [botMessage]));

            // Auto-speak only if: (voice input was used) OR (user manually enabled speaking)
            if (wasVoiceInput || isSpeaking) {
                speakText(response.response);
            }
        } catch (error) {
            console.error('Error:', error);
            removePendingRequest(clientRequestId);
            setMessages(prev => mergeUniqueMessages(prev, [{
                id: buildMessageId(),
                sender: 'bot',
                text: "Sorry, I'm having trouble connecting. Please try again.",
                timestamp: new Date().toISOString()
            }]));
        } finally {
            setIsLoading(false);
        }
    };

    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                // Remove emojis from text before speaking
                const textWithoutEmojis = text.replace(EMOJI_REGEX, '').trim();
                const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);

                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }

                utterance.onstart = () => setIsCurrentlySpeaking(true);
                utterance.onend = () => setIsCurrentlySpeaking(false);
                utterance.onerror = () => setIsCurrentlySpeaking(false);

                window.speechSynthesis.speak(utterance);
            } catch (error) {
                console.error('Speech synthesis error:', error);
                setIsCurrentlySpeaking(false);
            }
        }
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsCurrentlySpeaking(false);
        }
    };

    const toggleListening = () => {
        if (!recognition) return;

        try {
            if (isListening) {
                recognition.stop();
            } else {
                recognition.start();
                setIsListening(true);
            }
        } catch (error) {
            console.error('Speech recognition error:', error);
            setIsListening(false);
        }
    };

    const handleClearChat = async () => {
        if (window.confirm('Clear all chat history?')) {
            try {
                await clearChatHistory(userId);
                resetDraftState();
                setInputText('');
                setMessages([{
                    id: 'welcome',
                    sender: 'bot',
                    agent: 'Campus Mate',
                    text: "Chat cleared! How can I help you?",
                    timestamp: new Date().toISOString()
                }]);
            } catch (error) {
                console.error('Error clearing chat:', error);
            }
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleComposerKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleEditMessage = (message) => {
        setDraftMessage(message);
        setSelectedMessageId(message.id);
        setInputText(message.text);
        requestAnimationFrame(() => composerRef.current?.focus());
    };

    return (
        <div className="chat-page">
            <div className="chat-header">
                <div className="chat-title">
                    <Bot size={24} />
                    <div>
                        <h1>Campus Mate Chat</h1>
                        <span className="status">Ask questions, plan work, or talk through ideas</span>
                    </div>
                </div>
                <div className="chat-actions">
                    <button
                        className={`icon-btn ${isSpeaking ? 'active' : ''}`}
                        onClick={() => setIsSpeaking(!isSpeaking)}
                        title={isSpeaking ? 'Voice mode: Always ON' : 'Voice mode: Auto (speaks for voice input only)'}
                    >
                        {isSpeaking ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
                    {isCurrentlySpeaking && (
                        <button
                            className="icon-btn warning"
                            onClick={stopSpeaking}
                            title="Stop speaking"
                        >
                            <VolumeX size={20} />
                        </button>
                    )}
                    <button
                        className="icon-btn danger"
                        onClick={handleClearChat}
                        title="Clear chat"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`message ${msg.sender} ${selectedMessageId === msg.id ? 'selected' : ''}`}
                    >
                        <div
                            className={`message-bubble ${msg.sender === 'user' ? 'clickable' : ''}`}
                            onDoubleClick={msg.sender === 'user' ? () => handleEditMessage(msg) : undefined}
                            title={msg.sender === 'user' ? 'Double-click to edit & resend' : undefined}
                        >
                            {msg.sender === 'bot' ? (
                                <div className="markdown-content">
                                    <ReactMarkdown components={{a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />}}>{msg.text}</ReactMarkdown>
                                </div>
                            ) : (
                                <p>{msg.text}</p>
                            )}
                            <span className="timestamp">{formatTime(msg.timestamp)}</span>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message bot">
                        <div className="message-bubble typing">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <div className="chat-composer">
                    <div className="chat-input">
                        <button
                            className={`voice-btn ${isListening ? 'listening' : ''}`}
                            onClick={toggleListening}
                            disabled={!recognition}
                            title={isListening ? 'Stop listening' : 'Start voice input'}
                        >
                            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>
                        <textarea
                            ref={composerRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleComposerKeyDown}
                            placeholder={isListening ? 'Listening...' : 'Type a message...'}
                            disabled={isLoading}
                            rows={1}
                        />
                        <button
                            className="send-btn"
                            onClick={() => handleSend()}
                            disabled={!inputText.trim() || isLoading}
                            title="Send message"
                        >
                            <Send size={22} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
