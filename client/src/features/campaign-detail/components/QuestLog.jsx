import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const groupByDate = (updates) => {
    const groups = {};
    for (const update of updates) {
        const key = new Date(update.generatedAt).toLocaleDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(update);
    }
    // Reverse chronological: most recent date first
    return Object.entries(groups).sort(
        (a, b) => new Date(b[1][0].generatedAt) - new Date(a[1][0].generatedAt),
    );
};

const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const QuestLog = ({ updates }) => {
    const [expandedIds, setExpandedIds] = React.useState({});
    const bottomRef = React.useRef(null);

    React.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, []);

    if (!updates || updates.length === 0) {
        return <div className='quest-log-empty'>No story entries yet.</div>;
    }

    const grouped = groupByDate(updates);

    const toggleExpand = (id) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className='quest-log'>
            {grouped.map(([date, entries]) => (
                <React.Fragment key={date}>
                    <div className='quest-log-date-header'>{date}</div>
                    {entries
                        .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))
                        .map((entry) => (
                            <div
                                key={entry.id}
                                className='quest-log-entry'
                                onClick={() => toggleExpand(entry.id)}
                            >
                                <span className={`quest-log-badge ${entry.type}`}>
                                    {entry.type}
                                </span>
                                <div className='quest-log-body'>
                                    <AnimatePresence mode='wait' initial={false}>
                                        <motion.div
                                            key={expandedIds[entry.id] ? 'expanded' : 'collapsed'}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className={`quest-log-text ${
                                                expandedIds[entry.id] ? 'expanded' : ''
                                            }`}
                                        >
                                            {entry.text}
                                        </motion.div>
                                    </AnimatePresence>
                                    <div className='quest-log-time'>
                                        {formatTime(entry.generatedAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                </React.Fragment>
            ))}
            <div ref={bottomRef} />
        </div>
    );
};
