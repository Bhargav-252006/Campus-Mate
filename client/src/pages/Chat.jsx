import React, {useState, useEffect, useRef} from 'react';
import {Send, Mic, MicOff, Volume2, VolumeX, Trash2, Bot} from 'lucide-react';
import {sendMessageToAgent, getChatHistory, clearChatHistory} from '../services/api';
import ReactMarkdown from 'react-markdown';

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(true);
    const [recognition, setRecognition] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Load chat history
        loadChatHistory();

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
                // Auto-send after voice input
                setTimeout(() => handleSend(transcript), 100);
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

    const loadChatHistory = async () => {
        try {
            const history = await getChatHistory();
            if (history.length > 0) {
                setMessages(history);
            } else {
                // Welcome message
                setMessages([{
                    id: 'welcome',
                    sender: 'bot',
                    agent: 'Student Mate',
                    text: "Hello! 👋 I'm your Student Mate AI assistant. I can help you with:\n\n• 📚 Academic questions & explanations\n• 😊 Emotional support & motivation\n• 🧠 Cognitive load management\n• 📊 Study strategies & failure patterns\n\nHow can I help you today?",
                    timestamp: new Date().toISOString()
                }]);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    };

    const handleSend = async (text = inputText) => {
        if (!text.trim() || isLoading) return;

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
            const response = await sendMessageToAgent(text.trim());

            const botMessage = {
                id: Date.now() + 1,
                sender: 'bot',
                agent: response.agentUsed,
                text: response.response,
                timestamp: response.timestamp
            };

            setMessages(prev => [...prev, botMessage]);

            // Speak response if enabled
            if (isSpeaking) {
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
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1;
            utterance.pitch = 1;
            window.speechSynthesis.speak(utterance);
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
                    agent: 'Student Mate',
                    text: "Chat cleared! How can I help you?",
                    timestamp: new Date().toISOString()
                }]);
            } catch (error) {
                console.error('Error clearing chat:', error);
            }
        }
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
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
            'General Assistant': '#6b7280',
            'Student Mate': '#6366f1'
        };
        return colors[agent] || '#6b7280';
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
                        title={isSpeaking ? 'Mute responses' : 'Enable voice'}
                    >
                        {isSpeaking ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </button>
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
                    Try: "I'm stressed about exams" • "Explain neural networks" • "Help me prioritize"
                </p>
            </div>
        </div>
    );
};

export default Chat;
