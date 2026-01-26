import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Trash2, Bot } from 'lucide-react';
import { sendMessageToAgent, getChatHistory, clearChatHistory } from '../services/api';
import ReactMarkdown from 'react-markdown';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false); // Disabled by default - only speaks for voice input
    const [voiceInputUsed, setVoiceInputUsed] = useState(false); // Track if last input was voice
    const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [recognition, setRecognition] = useState(null);
    const [userId, setUserId] = useState(null);
    const messagesEndRef = useRef(null);

    // Generate or retrieve userId for this device/browser
    const getUserId = () => {
        let storedUserId = localStorage.getItem('student_mate_userId');
        if (!storedUserId) {
            // Generate unique ID: timestamp + random string
            storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('student_mate_userId', storedUserId);
            console.log('New user ID generated:', storedUserId);
        }
        return storedUserId;
    };

    useEffect(() => {
        // Get or generate userId
        const id = getUserId();
        setUserId(id);

        // Load chat history
        loadChatHistory(id);

        // Load available voices
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
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
                setInputText(transcript);
                setIsListening(false);
                setVoiceInputUsed(true); // Mark that voice input was used
            };

            recognitionInstance.onerror = () => setIsListening(false);
            recognitionInstance.onend = () => setIsListening(false);

            setRecognition(recognitionInstance);
        }

        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadChatHistory = async (id) => {
        try {
            const history = await getChatHistory(id || userId);
            if (history.length > 0) {
                setMessages(history);
            } else {
                // Welcome message
                setMessages([{
                    id: 'welcome',
                    sender: 'bot',
                    agent: 'Campus Mate',
                    text: "Hello! 👋 I'm your Campus Mate assistant. I can help you with:\n\n• 📚 Academic questions & explanations\n• 😊 Emotional support & motivation\n• 🧠 Cognitive load management\n• 📊 Study strategies & failure patterns\n\nHow can I help you today?",
                    timestamp: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (text = inputText) => {
        if (!text.trim() || isLoading || !userId) return;

        // Stop any ongoing speech
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsCurrentlySpeaking(false);
        }

        // Remember if this was a voice input
        const wasVoiceInput = voiceInputUsed;
        setVoiceInputUsed(false); // Reset for next input

        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text: text.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await sendMessageToAgent(text.trim(), userId);

            const botMessage = {
                id: Date.now() + 1,
                sender: 'bot',
                agent: response.agentUsed,
                text: response.response,
                timestamp: response.timestamp
            };

            setMessages(prev => [...prev, botMessage]);

            // Auto-speak only if: (voice input was used) OR (user manually enabled speaking)
            if (wasVoiceInput || isSpeaking) {
                speakText(response.response);
            }
        } catch (error) {
            console.error('Error:', error);
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                sender: 'bot',
                agent: 'System',
                text: "Sorry, I'm having trouble connecting. Please try again.",
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const speakText = (text) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            // Remove emojis from text before speaking
            const textWithoutEmojis = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{203C}]|[\u{2049}]|[\u{25AA}]|[\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{00A9}]|[\u{00AE}]|[\u{2122}]|[\u{2139}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F170}-\u{1F171}]|[\u{1F17E}-\u{1F17F}]|[\u{1F18E}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{1F201}-\u{1F202}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F23A}]|[\u{1F250}-\u{1F251}]|[\u{1F300}-\u{1F5FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]/gu, '').trim();
            const utterance = new SpeechSynthesisUtterance(textWithoutEmojis);

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onstart = () => setIsCurrentlySpeaking(true);
            utterance.onend = () => setIsCurrentlySpeaking(false);
            utterance.onerror = () => setIsCurrentlySpeaking(false);

            window.speechSynthesis.speak(utterance);
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

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    const handleClearChat = async () => {
        if (window.confirm('Clear all chat history?')) {
            try {
                await clearChatHistory();
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

    const getAgentColor = (agent) => {
        const colors = {
            'Academic Agent': '#3b82f6',
            'Emotional Support Agent': '#ec4899',
            'Cognitive Load Agent': '#f59e0b',
            'Persona Switch Agent': '#8b5cf6',
            'Failure Pattern Agent': '#ef4444',
            'Concept Gap Agent': '#10b981',
            'General Assistant': '#64748b',
            'Campus Mate': '#3b82f6'
        };
        return colors[agent] || '#64748b';
    };

    return (
        <div className="chat-page">
            <div className="chat-header">
                <div className="chat-title">
                    <Bot size={24} />
                    <div>
                        <h1>AI Chat</h1>
                        <span className="status">Multi-Agent Assistant</span>
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
                        className={`message ${msg.sender}`}
                    >
                        <div className="message-bubble">
                            {msg.sender === 'bot' ? (
                                <div className="markdown-content">
                                    <ReactMarkdown>{msg.text}</ReactMarkdown>
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
                <div className="chat-input">
                    <button
                        className={`voice-btn ${isListening ? 'listening' : ''}`}
                        onClick={toggleListening}
                        disabled={!recognition}
                        title={isListening ? 'Stop listening' : 'Start voice input'}
                    >
                        {isListening ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={isListening ? 'Listening...' : 'Type a message or click mic to speak...'}
                        disabled={isLoading || isListening}
                    />
                    <button
                        className="send-btn"
                        onClick={() => handleSend()}
                        disabled={!inputText.trim() || isLoading}
                    >
                        <Send size={22} />
                    </button>
                </div>
                <p className="chat-hint">
                    🎤 Voice replies auto-play when using mic • Toggle speaker for always-on voice "
                </p>
            </div>
        </div>
    );
};

export default Chat;
