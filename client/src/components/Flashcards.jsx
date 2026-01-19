import React, {useState, useEffect, useCallback} from 'react';
import {
    BookOpen, Plus, Edit2, Trash2, RotateCcw, Check, X,
    Brain, Flame, Star, Clock, TrendingUp, Shuffle,
    ChevronLeft, ChevronRight, Award, Target
} from 'lucide-react';
import {useToast} from '../context/ToastContext';

// SM-2 Spaced Repetition Algorithm
const calculateNextReview = (card, quality) => {
    // quality: 0-5 (0 = complete blackout, 5 = perfect)
    let {easeFactor, interval, repetitions} = card;

    if (quality < 3) {
        // Failed - reset
        repetitions = 0;
        interval = 1;
    } else {
        // Passed
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions++;

        // Update ease factor
        easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        easeFactor = Math.max(1.3, easeFactor);
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    return {
        easeFactor,
        interval,
        repetitions,
        nextReview: nextReview.toISOString(),
        lastReview: new Date().toISOString()
    };
};

const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'Biology', 'History', 'Literature', 'Programming', 'Languages', 'Other'];

const Flashcards = () => {
    const toast = useToast();
    const [decks, setDecks] = useState([]);
    const [activeDeck, setActiveDeck] = useState(null);
    const [studyMode, setStudyMode] = useState(false);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [showAddDeck, setShowAddDeck] = useState(false);
    const [showAddCard, setShowAddCard] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [studyCards, setStudyCards] = useState([]);
    const [sessionStats, setSessionStats] = useState({correct: 0, incorrect: 0, reviewed: 0});

    const [newDeck, setNewDeck] = useState({name: '', subject: 'Other', description: ''});
    const [newCard, setNewCard] = useState({front: '', back: '', tags: ''});

    // Load decks from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('flashcardDecks');
        if (saved) {
            setDecks(JSON.parse(saved));
        }
    }, []);

    // Save decks
    const saveDecks = (newDecks) => {
        setDecks(newDecks);
        localStorage.setItem('flashcardDecks', JSON.stringify(newDecks));
    };

    // Create new deck
    const createDeck = () => {
        if (!newDeck.name.trim()) {
            toast.warning('Please enter a deck name');
            return;
        }

        const deck = {
            id: Date.now(),
            ...newDeck,
            cards: [],
            createdAt: new Date().toISOString(),
            lastStudied: null,
            totalReviews: 0
        };

        saveDecks([deck, ...decks]);
        setNewDeck({name: '', subject: 'Other', description: ''});
        setShowAddDeck(false);
        toast.success('Deck created!');
    };

    // Add card to deck
    const addCard = () => {
        if (!newCard.front.trim() || !newCard.back.trim()) {
            toast.warning('Please fill in both sides of the card');
            return;
        }

        const card = {
            id: Date.now(),
            front: newCard.front.trim(),
            back: newCard.back.trim(),
            tags: newCard.tags.split(',').map(t => t.trim()).filter(Boolean),
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReview: new Date().toISOString(),
            lastReview: null,
            createdAt: new Date().toISOString()
        };

        const updatedDecks = decks.map(d =>
            d.id === activeDeck.id
                ? {...d, cards: [...d.cards, card]}
                : d
        );

        saveDecks(updatedDecks);
        setActiveDeck({...activeDeck, cards: [...activeDeck.cards, card]});
        setNewCard({front: '', back: '', tags: ''});
        setShowAddCard(false);
        toast.success('Card added!');
    };

    // Update card
    const updateCard = () => {
        if (!editingCard) return;

        const updatedDecks = decks.map(d =>
            d.id === activeDeck.id
                ? {
                    ...d,
                    cards: d.cards.map(c =>
                        c.id === editingCard.id ? editingCard : c
                    )
                }
                : d
        );

        saveDecks(updatedDecks);
        setActiveDeck({
            ...activeDeck,
            cards: activeDeck.cards.map(c => c.id === editingCard.id ? editingCard : c)
        });
        setEditingCard(null);
        toast.success('Card updated!');
    };

    // Delete card
    const deleteCard = (cardId) => {
        if (!window.confirm('Delete this card?')) return;

        const updatedDecks = decks.map(d =>
            d.id === activeDeck.id
                ? {...d, cards: d.cards.filter(c => c.id !== cardId)}
                : d
        );

        saveDecks(updatedDecks);
        setActiveDeck({
            ...activeDeck,
            cards: activeDeck.cards.filter(c => c.id !== cardId)
        });
        toast.info('Card deleted');
    };

    // Delete deck
    const deleteDeck = (deckId) => {
        if (!window.confirm('Delete this deck and all its cards?')) return;

        saveDecks(decks.filter(d => d.id !== deckId));
        if (activeDeck?.id === deckId) {
            setActiveDeck(null);
        }
        toast.info('Deck deleted');
    };

    // Get cards due for review
    const getDueCards = (deck) => {
        const now = new Date();
        return deck.cards.filter(card => new Date(card.nextReview) <= now);
    };

    // Start study session
    const startStudy = (deck, mode = 'due') => {
        let cards = [];

        if (mode === 'due') {
            cards = getDueCards(deck);
        } else if (mode === 'all') {
            cards = [...deck.cards];
        } else if (mode === 'new') {
            cards = deck.cards.filter(c => c.repetitions === 0);
        }

        if (cards.length === 0) {
            toast.info('No cards to study right now!');
            return;
        }

        // Shuffle cards
        cards = cards.sort(() => Math.random() - 0.5);

        setStudyCards(cards);
        setActiveDeck(deck);
        setCurrentCardIndex(0);
        setShowAnswer(false);
        setStudyMode(true);
        setSessionStats({correct: 0, incorrect: 0, reviewed: 0});
    };

    // Rate card during study
    const rateCard = (quality) => {
        const card = studyCards[currentCardIndex];
        const newSchedule = calculateNextReview(card, quality);

        const updatedCard = {...card, ...newSchedule};

        // Update stats
        setSessionStats(prev => ({
            correct: quality >= 3 ? prev.correct + 1 : prev.correct,
            incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
            reviewed: prev.reviewed + 1
        }));

        // Update deck
        const updatedDecks = decks.map(d =>
            d.id === activeDeck.id
                ? {
                    ...d,
                    cards: d.cards.map(c => c.id === card.id ? updatedCard : c),
                    lastStudied: new Date().toISOString(),
                    totalReviews: d.totalReviews + 1
                }
                : d
        );
        saveDecks(updatedDecks);

        // Next card
        if (currentCardIndex < studyCards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
            setShowAnswer(false);
        } else {
            // Session complete
            setStudyMode(false);
            toast.success(`Session complete! ${sessionStats.correct + (quality >= 3 ? 1 : 0)}/${sessionStats.reviewed + 1} correct`);
        }
    };

    // Calculate deck statistics
    const getDeckStats = (deck) => {
        const now = new Date();
        const due = deck.cards.filter(c => new Date(c.nextReview) <= now).length;
        const newCards = deck.cards.filter(c => c.repetitions === 0).length;
        const mastered = deck.cards.filter(c => c.interval >= 21).length;
        const avgEase = deck.cards.length > 0
            ? (deck.cards.reduce((sum, c) => sum + c.easeFactor, 0) / deck.cards.length).toFixed(2)
            : 0;

        return {due, newCards, mastered, avgEase, total: deck.cards.length};
    };

    // Render study mode
    if (studyMode && studyCards.length > 0) {
        const currentCard = studyCards[currentCardIndex];
        const progress = ((currentCardIndex + 1) / studyCards.length) * 100;

        return (
            <div className="flashcards-page study-mode">
                <div className="study-header">
                    <button className="btn-ghost" onClick={() => setStudyMode(false)}>
                        <X size={20} /> Exit
                    </button>
                    <div className="study-progress">
                        <span>{currentCardIndex + 1} / {studyCards.length}</span>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: `${progress}%`}} />
                        </div>
                    </div>
                    <div className="study-stats-mini">
                        <span className="stat-correct">✓ {sessionStats.correct}</span>
                        <span className="stat-incorrect">✗ {sessionStats.incorrect}</span>
                    </div>
                </div>

                <div className="study-card-container">
                    <div className={`study-card ${showAnswer ? 'flipped' : ''}`} onClick={() => setShowAnswer(true)}>
                        <div className="card-front">
                            <p>{currentCard.front}</p>
                            {!showAnswer && <span className="hint">Click to reveal answer</span>}
                        </div>
                        {showAnswer && (
                            <div className="card-back">
                                <p>{currentCard.back}</p>
                            </div>
                        )}
                    </div>
                </div>

                {showAnswer && (
                    <div className="rating-buttons">
                        <p>How well did you know this?</p>
                        <div className="rating-grid">
                            <button className="rating-btn rating-0" onClick={() => rateCard(0)}>
                                <span>😵</span>
                                <small>Blackout</small>
                            </button>
                            <button className="rating-btn rating-1" onClick={() => rateCard(1)}>
                                <span>😣</span>
                                <small>Wrong</small>
                            </button>
                            <button className="rating-btn rating-2" onClick={() => rateCard(2)}>
                                <span>😕</span>
                                <small>Hard</small>
                            </button>
                            <button className="rating-btn rating-3" onClick={() => rateCard(3)}>
                                <span>🤔</span>
                                <small>Good</small>
                            </button>
                            <button className="rating-btn rating-4" onClick={() => rateCard(4)}>
                                <span>😊</span>
                                <small>Easy</small>
                            </button>
                            <button className="rating-btn rating-5" onClick={() => rateCard(5)}>
                                <span>🎯</span>
                                <small>Perfect</small>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Render deck view
    if (activeDeck) {
        const stats = getDeckStats(activeDeck);

        return (
            <div className="flashcards-page">
                <div className="page-header">
                    <div>
                        <button className="btn-ghost mb-2" onClick={() => setActiveDeck(null)}>
                            <ChevronLeft size={20} /> Back to Decks
                        </button>
                        <h1>{activeDeck.name}</h1>
                        <p className="subtitle">{activeDeck.subject} • {stats.total} cards</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setShowAddCard(true)}>
                        <Plus size={20} /> Add Card
                    </button>
                </div>

                <div className="deck-stats-grid">
                    <div className="stat-card">
                        <Clock size={24} />
                        <div>
                            <span className="stat-value">{stats.due}</span>
                            <span className="stat-label">Due Now</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Star size={24} />
                        <div>
                            <span className="stat-value">{stats.newCards}</span>
                            <span className="stat-label">New</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Award size={24} />
                        <div>
                            <span className="stat-value">{stats.mastered}</span>
                            <span className="stat-label">Mastered</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <Brain size={24} />
                        <div>
                            <span className="stat-value">{stats.avgEase}</span>
                            <span className="stat-label">Avg Ease</span>
                        </div>
                    </div>
                </div>

                <div className="study-buttons">
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => startStudy(activeDeck, 'due')}
                        disabled={stats.due === 0}
                    >
                        <Flame size={20} /> Study Due ({stats.due})
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => startStudy(activeDeck, 'all')}
                        disabled={stats.total === 0}
                    >
                        <Shuffle size={20} /> Study All
                    </button>
                    <button
                        className="btn btn-ghost"
                        onClick={() => startStudy(activeDeck, 'new')}
                        disabled={stats.newCards === 0}
                    >
                        <Star size={20} /> New Cards Only
                    </button>
                </div>

                <div className="cards-list">
                    <h3>Cards ({activeDeck.cards.length})</h3>
                    {activeDeck.cards.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} />
                            <p>No cards yet. Add your first card!</p>
                        </div>
                    ) : (
                        activeDeck.cards.map(card => (
                            <div key={card.id} className="card-item">
                                <div className="card-content">
                                    <div className="card-front-preview">{card.front}</div>
                                    <div className="card-back-preview">{card.back}</div>
                                </div>
                                <div className="card-meta">
                                    <span className={`card-status ${card.repetitions === 0 ? 'new' : card.interval >= 21 ? 'mastered' : 'learning'}`}>
                                        {card.repetitions === 0 ? 'New' : card.interval >= 21 ? 'Mastered' : 'Learning'}
                                    </span>
                                    {card.tags.length > 0 && (
                                        <div className="card-tags">
                                            {card.tags.map((tag, i) => (
                                                <span key={i} className="tag">{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => setEditingCard(card)}><Edit2 size={16} /></button>
                                    <button onClick={() => deleteCard(card.id)}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Card Modal */}
                {showAddCard && (
                    <div className="modal-overlay" onClick={() => setShowAddCard(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2>Add New Card</h2>
                            <div className="form-group">
                                <label>Front (Question)</label>
                                <textarea
                                    value={newCard.front}
                                    onChange={e => setNewCard({...newCard, front: e.target.value})}
                                    placeholder="What is photosynthesis?"
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Back (Answer)</label>
                                <textarea
                                    value={newCard.back}
                                    onChange={e => setNewCard({...newCard, back: e.target.value})}
                                    placeholder="The process by which plants convert sunlight into energy..."
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={newCard.tags}
                                    onChange={e => setNewCard({...newCard, tags: e.target.value})}
                                    placeholder="biology, plants, chapter-5"
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setShowAddCard(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={addCard}>Add Card</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Card Modal */}
                {editingCard && (
                    <div className="modal-overlay" onClick={() => setEditingCard(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <h2>Edit Card</h2>
                            <div className="form-group">
                                <label>Front (Question)</label>
                                <textarea
                                    value={editingCard.front}
                                    onChange={e => setEditingCard({...editingCard, front: e.target.value})}
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label>Back (Answer)</label>
                                <textarea
                                    value={editingCard.back}
                                    onChange={e => setEditingCard({...editingCard, back: e.target.value})}
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setEditingCard(null)}>Cancel</button>
                                <button className="btn btn-primary" onClick={updateCard}>Save</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Render decks list
    return (
        <div className="flashcards-page">
            <div className="page-header">
                <div>
                    <h1><BookOpen size={28} /> Flashcards</h1>
                    <p className="subtitle">Spaced repetition for effective learning</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddDeck(true)}>
                    <Plus size={20} /> New Deck
                </button>
            </div>

            {/* Stats Overview */}
            <div className="flashcards-overview">
                <div className="overview-card">
                    <Target size={24} />
                    <div>
                        <span className="stat-value">
                            {decks.reduce((sum, d) => sum + getDeckStats(d).due, 0)}
                        </span>
                        <span className="stat-label">Cards Due Today</span>
                    </div>
                </div>
                <div className="overview-card">
                    <BookOpen size={24} />
                    <div>
                        <span className="stat-value">{decks.length}</span>
                        <span className="stat-label">Total Decks</span>
                    </div>
                </div>
                <div className="overview-card">
                    <Brain size={24} />
                    <div>
                        <span className="stat-value">
                            {decks.reduce((sum, d) => sum + d.cards.length, 0)}
                        </span>
                        <span className="stat-label">Total Cards</span>
                    </div>
                </div>
                <div className="overview-card">
                    <Award size={24} />
                    <div>
                        <span className="stat-value">
                            {decks.reduce((sum, d) => sum + getDeckStats(d).mastered, 0)}
                        </span>
                        <span className="stat-label">Mastered</span>
                    </div>
                </div>
            </div>

            {/* Decks Grid */}
            <div className="decks-grid">
                {decks.length === 0 ? (
                    <div className="empty-state">
                        <BookOpen size={64} />
                        <h3>No flashcard decks yet</h3>
                        <p>Create your first deck to start learning!</p>
                        <button className="btn btn-primary" onClick={() => setShowAddDeck(true)}>
                            <Plus size={20} /> Create Deck
                        </button>
                    </div>
                ) : (
                    decks.map(deck => {
                        const stats = getDeckStats(deck);
                        return (
                            <div key={deck.id} className="deck-card" onClick={() => setActiveDeck(deck)}>
                                <div className="deck-header">
                                    <h3>{deck.name}</h3>
                                    <span className="deck-subject">{deck.subject}</span>
                                </div>
                                <p className="deck-description">{deck.description || 'No description'}</p>
                                <div className="deck-stats">
                                    <span><Clock size={14} /> {stats.due} due</span>
                                    <span><Star size={14} /> {stats.newCards} new</span>
                                    <span><BookOpen size={14} /> {stats.total} total</span>
                                </div>
                                <div className="deck-actions" onClick={e => e.stopPropagation()}>
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={() => startStudy(deck, 'due')}
                                        disabled={stats.due === 0}
                                    >
                                        Study
                                    </button>
                                    <button
                                        className="btn btn-sm btn-ghost"
                                        onClick={() => deleteDeck(deck.id)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add Deck Modal */}
            {showAddDeck && (
                <div className="modal-overlay" onClick={() => setShowAddDeck(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Create New Deck</h2>
                        <div className="form-group">
                            <label>Deck Name</label>
                            <input
                                type="text"
                                value={newDeck.name}
                                onChange={e => setNewDeck({...newDeck, name: e.target.value})}
                                placeholder="e.g., Biology Chapter 5"
                            />
                        </div>
                        <div className="form-group">
                            <label>Subject</label>
                            <select
                                value={newDeck.subject}
                                onChange={e => setNewDeck({...newDeck, subject: e.target.value})}
                            >
                                {SUBJECTS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Description (optional)</label>
                            <textarea
                                value={newDeck.description}
                                onChange={e => setNewDeck({...newDeck, description: e.target.value})}
                                placeholder="What's this deck about?"
                                rows={2}
                            />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-ghost" onClick={() => setShowAddDeck(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={createDeck}>Create Deck</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Flashcards;
