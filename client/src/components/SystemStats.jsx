import {useState, useEffect} from 'react';
import {getEnhancementStats} from '../services/api';

/**
 * 📊 SYSTEM STATS COMPONENT
 * 
 * Displays enhancement system statistics.
 * Shows self-evaluation, stall detection, and progress tracking metrics.
 */
const SystemStats = ({refreshInterval = 30000}) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);

    const fetchStats = async () => {
        try {
            const data = await getEnhancementStats();
            setStats(data);
            setError(null);
        } catch (err) {
            setError('Failed to load stats');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, refreshInterval);
        return () => clearInterval(interval);
    }, [refreshInterval]);

    if (loading) return null;
    if (error) return null;
    if (!stats) return null;

    return (
        <div className="system-stats" style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'var(--card-bg, #1a1a2e)',
            border: '1px solid var(--border-color, #2d2d44)',
            borderRadius: '12px',
            padding: '12px',
            fontSize: '0.75rem',
            maxWidth: '280px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            transition: 'all 0.3s ease'
        }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: expanded ? '10px' : 0
                }}
            >
                <span style={{fontWeight: 600}}>📊 System Health</span>
                <span style={{opacity: 0.6}}>{expanded ? '▼' : '▲'}</span>
            </div>

            {expanded && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {/* Self-Evaluation */}
                    <div style={{
                        padding: '8px',
                        background: 'rgba(100,255,100,0.1)',
                        borderRadius: '8px'
                    }}>
                        <div style={{fontWeight: 600, marginBottom: '4px'}}>
                            ✅ Self-Evaluation
                        </div>
                        <div style={{opacity: 0.8}}>
                            Pass Rate: {stats.selfEvaluation?.passRate || 'N/A'}
                        </div>
                        <div style={{opacity: 0.6}}>
                            Total: {stats.selfEvaluation?.total || 0} evaluations
                        </div>
                    </div>

                    {/* Stall Detection */}
                    <div style={{
                        padding: '8px',
                        background: 'rgba(255,200,100,0.1)',
                        borderRadius: '8px'
                    }}>
                        <div style={{fontWeight: 600, marginBottom: '4px'}}>
                            🔄 Stall Detection
                        </div>
                        <div style={{opacity: 0.8}}>
                            Active Users: {stats.stallDetection?.trackedUsers || 0}
                        </div>
                        <div style={{opacity: 0.6}}>
                            Recoveries: {stats.stallDetection?.totalRecoveryAttempts || 0}
                        </div>
                    </div>

                    {/* Progress Tracking */}
                    <div style={{
                        padding: '8px',
                        background: 'rgba(100,150,255,0.1)',
                        borderRadius: '8px'
                    }}>
                        <div style={{fontWeight: 600, marginBottom: '4px'}}>
                            📋 Task Progress
                        </div>
                        <div style={{opacity: 0.8}}>
                            Active Tasks: {stats.progressTracking?.activeTasks || 0}
                        </div>
                        <div style={{opacity: 0.6}}>
                            Completion: {stats.progressTracking?.completionRate || 'N/A'}
                        </div>
                    </div>

                    {/* Confidence */}
                    <div style={{
                        padding: '8px',
                        background: 'rgba(200,100,255,0.1)',
                        borderRadius: '8px'
                    }}>
                        <div style={{fontWeight: 600, marginBottom: '4px'}}>
                            🎯 Confidence
                        </div>
                        <div style={{opacity: 0.8}}>
                            Avg Score: {stats.confidenceScoring?.averageConfidence || 'N/A'}
                        </div>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        opacity: 0.5,
                        fontSize: '0.65rem',
                        marginTop: '4px'
                    }}>
                        Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemStats;
