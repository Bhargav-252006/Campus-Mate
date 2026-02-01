import {useState} from 'react';

/**
 * 👍👎 FEEDBACK BUTTON COMPONENT
 * 
 * Allows users to rate AI responses.
 * Helps improve the system through human feedback.
 */
const FeedbackButton = ({messageId, onFeedback}) => {
    const [feedback, setFeedback] = useState(null); // 'helpful' | 'unhelpful' | null
    const [showThanks, setShowThanks] = useState(false);

    const handleFeedback = (type) => {
        setFeedback(type);
        setShowThanks(true);

        // Notify parent component
        if (onFeedback) {
            onFeedback(messageId, type);
        }

        // Hide thanks message after 2 seconds
        setTimeout(() => {
            setShowThanks(false);
        }, 2000);
    };

    // Already rated
    if (feedback) {
        if (showThanks) {
            return (
                <span className="feedback-thanks" style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginLeft: '8px'
                }}>
                    Thanks for your feedback! 💙
                </span>
            );
        }
        return null;
    }

    return (
        <div className="feedback-buttons" style={{
            display: 'inline-flex',
            gap: '4px',
            marginLeft: '8px',
            opacity: 0.7
        }}>
            <button
                onClick={() => handleFeedback('helpful')}
                title="This was helpful"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
                👍
            </button>
            <button
                onClick={() => handleFeedback('unhelpful')}
                title="This wasn't helpful"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.2)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
                👎
            </button>
        </div>
    );
};

export default FeedbackButton;
