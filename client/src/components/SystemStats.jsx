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
        <div className="system-stats">
            <div
                className="stats-panel-header"
                onClick={() => setExpanded(!expanded)}
            >
                <span>📊 System Health</span>
                <span>{expanded ? '▼' : '▲'}</span>
            </div>

            {expanded && (
                <div className="stats-panel">
                    {/* Self-Evaluation */}
                    <div className="panel-card panel-success">
                        <div className="panel-title">
                            ✅ Self-Evaluation
                        </div>
                        <div className="panel-line">
                            Pass Rate: {stats.selfEvaluation?.passRate || 'N/A'}
                        </div>
                        <div className="panel-subline">
                            Total: {stats.selfEvaluation?.total || 0} evaluations
                        </div>
                    </div>

                    {/* Stall Detection */}
                    <div className="panel-card panel-warning">
                        <div className="panel-title">
                            🔄 Stall Detection
                        </div>
                        <div className="panel-line">
                            Active Users: {stats.stallDetection?.trackedUsers || 0}
                        </div>
                        <div className="panel-subline">
                            Recoveries: {stats.stallDetection?.totalRecoveryAttempts || 0}
                        </div>
                    </div>

                    {/* Progress Tracking */}
                    <div className="panel-card panel-info">
                        <div className="panel-title">
                            📋 Task Progress
                        </div>
                        <div className="panel-line">
                            Active Tasks: {stats.progressTracking?.activeTasks || 0}
                        </div>
                        <div className="panel-subline">
                            Completion: {stats.progressTracking?.completionRate || 'N/A'}
                        </div>
                    </div>

                    {/* Confidence */}
                    <div className="panel-card panel-purple">
                        <div className="panel-title">
                            🎯 Confidence
                        </div>
                        <div className="panel-line">
                            Avg Score: {stats.confidenceScoring?.averageConfidence || 'N/A'}
                        </div>
                    </div>

                    <div className="panel-footnote">
                        Last updated: {new Date(stats.timestamp).toLocaleTimeString()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemStats;
