import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

export const QuestEditForm = ({
    quest,
    editingQuest,
    inputRef,
    campaigns,
    hasCampaigns,
    onChange,
    onCancel,
    onSave,
    onCyclePriority,
    onCycleLevel
}) => {
    // Local state for the description to avoid re-renders on every keystroke
    const [localDescription, setLocalDescription] = useState(editingQuest?.description || '');
    
    // Sync local state when editingQuest.id changes (switching to edit a different quest)
    const editingQuestId = editingQuest?.id;
    useEffect(() => {
        setLocalDescription(editingQuest?.description || '');
    }, [editingQuestId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleLocalChange = useCallback((e) => {
        const { name, value } = e.target;
        if (name === 'description') {
            setLocalDescription(value);
        } else {
            // For non-description fields, propagate immediately
            onChange(e);
        }
    }, [onChange]);

    const handleSave = useCallback(() => {
        // Build the final payload with local description
        const finalData = {
            ...editingQuest,
            description: localDescription
        };
        onSave(finalData);
    }, [localDescription, editingQuest, onSave]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
        }
    }, [handleSave, onCancel]);

    if (!quest || !editingQuest) return null;
    const currentPriority = editingQuest.priority || 'medium';
    const currentLevel = editingQuest.task_level || 1;
    const currentCampaignId = editingQuest.campaign_id !== null && editingQuest.campaign_id !== undefined
        ? String(editingQuest.campaign_id)
        : '';

    return (
        <div className="edit-quest-form" key={quest.id}>
            <input
                type="text"
                name="description"
                value={localDescription}
                onChange={handleLocalChange}
                onKeyDown={handleKeyDown}
                ref={inputRef}
            />
            <div className="edit-quest-footer">
                <div className="edit-quest-meta">
                    <div className="edit-quest-toggles">
                        <button type="button" className="btn-ghost" onClick={onCyclePriority}>
                            Priority: {currentPriority}
                        </button>
                        <button type="button" className="btn-ghost" onClick={onCycleLevel}>
                            Level: {currentLevel}
                        </button>
                    </div>
                    <label className="edit-quest-campaign" htmlFor={`edit-campaign-${quest.id}`}>
                        <span>Campaign</span>
                        <div className="campaign-select compact">
                            <select
                                id={`edit-campaign-${quest.id}`}
                                name="campaign_id"
                                value={currentCampaignId}
                                onChange={handleLocalChange}
                            >
                                <option value="">{hasCampaigns ? 'No campaign' : 'No campaigns yet'}</option>
                                {campaigns.map((campaign) => (
                                    <option key={campaign.id} value={campaign.id}>
                                        {campaign.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </label>
                </div>
                <div className="edit-actions">
                    <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
                    <button type="button" className="btn-primary" onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

QuestEditForm.propTypes = {
    quest: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired
    }),
    editingQuest: PropTypes.shape({
        description: PropTypes.string,
        priority: PropTypes.string,
        task_level: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        campaign_id: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.oneOf([null])])
    }),
    inputRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({ current: PropTypes.any })
    ]),
    campaigns: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        name: PropTypes.string
    })),
    hasCampaigns: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onCyclePriority: PropTypes.func.isRequired,
    onCycleLevel: PropTypes.func.isRequired
};

QuestEditForm.defaultProps = {
    quest: null,
    editingQuest: null,
    inputRef: null,
    campaigns: [],
    hasCampaigns: false
};

export default QuestEditForm;
