import PropTypes from 'prop-types';
import React from 'react';

export const QuestBoardContext = React.createContext(null);

export const QuestBoardProvider = ({ value, children }) => (
    <QuestBoardContext.Provider value={value}>
        {children}
    </QuestBoardContext.Provider>
);

QuestBoardProvider.propTypes = {
    value: PropTypes.object.isRequired,
    children: PropTypes.node.isRequired
};

export const useQuestBoardContext = () => {
    const context = React.useContext(QuestBoardContext);
    if (context === null) {
        throw new Error('useQuestBoardContext must be used within a QuestBoardProvider');
    }
    return context;
};

export default QuestBoardContext;
