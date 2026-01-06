import React, {useState, useEffect} from 'react';

const VoiceInput = ({onSpeechInput}) => {
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState(null);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();

            recognitionInstance.continuous = false;
            recognitionInstance.lang = 'en-US';
            recognitionInstance.interimResults = false;

            recognitionInstance.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                console.log("Heard:", transcript);
                onSpeechInput(transcript);
                setIsListening(false);
            };

            recognitionInstance.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        } else {
            console.warn("Web Speech API not supported in this browser.");
        }
    }, [onSpeechInput]);

    const toggleListening = () => {
        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
            setIsListening(true);
        }
    };

    if (!recognition) {
        return <div>Voice input not supported in this browser.</div>;
    }

    return (
        <div style={{textAlign: 'center'}}>
            <button
                onClick={toggleListening}
                style={{
                    padding: '15px 30px',
                    fontSize: '18px',
                    borderRadius: '50px',
                    border: 'none',
                    backgroundColor: isListening ? '#dc3545' : '#28a745',
                    color: 'white',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
            >
                {isListening ? '🛑 Stop Listening' : '🎤 Tap to Speak'}
            </button>
            <p style={{marginTop: '10px', color: '#666'}}>
                {isListening ? "Listening..." : "Click microphone to start"}
            </p>
        </div>
    );
};

export default VoiceInput;
