import PropTypes from 'prop-types';
import React from 'react';

const CampaignChip = ({ campaign, questHasCampaign, hasCampaigns }) => {
    if (questHasCampaign && campaign) {
        return (
            <div className="campaign-chip" title={`Campaign: ${campaign.name}`}>
                <div className="chip-avatar">
                    {campaign.image_url ? (
                        <img src={campaign.image_url} alt="" />
                    ) : (
                        (campaign.name || '?').charAt(0).toUpperCase()
                    )}
                </div>
                <div className="chip-content">
                    <span className="chip-name">{campaign.name}</span>
                    {(campaign.progress_summary || (campaign.stats && typeof campaign.stats.quests_total === 'number')) && (
                        <span className="chip-progress">
                            {campaign.progress_summary || `${campaign.stats?.quests_completed || 0}/${campaign.stats?.quests_total || 0}`}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    if (questHasCampaign && !campaign) {
        return (
            <div className="campaign-chip archived" title="Campaign archived">
                Archived
            </div>
        );
    }

    if (!questHasCampaign && hasCampaigns) {
        return (
            <div className="campaign-chip unassigned" title="No campaign">
                Unassigned
            </div>
        );
    }

    return null;
};

CampaignChip.propTypes = {
    campaign: PropTypes.shape({
        name: PropTypes.string,
        image_url: PropTypes.string,
        progress_summary: PropTypes.string,
        stats: PropTypes.shape({
            quests_completed: PropTypes.number,
            quests_total: PropTypes.number
        })
    }),
    questHasCampaign: PropTypes.bool.isRequired,
    hasCampaigns: PropTypes.bool
};

CampaignChip.defaultProps = {
    campaign: null,
    hasCampaigns: false
};

export const QuestHeader = ({
    description,
    priority,
    level,
    campaign,
    questHasCampaign,
    hasCampaigns,
    isCollapsed,
    onToggleCollapse
}) => (
    <div className="quest-header">
        <div className="left">
            <div className="quest-title-row">
                <h3>{description}</h3>
                <div className="quest-meta-tags">
                    <span className={`priority-pill ${priority}`}>{priority}</span>
                    <span className="level-pill">Lv. {level || 1}</span>
                    <CampaignChip
                        campaign={campaign}
                        questHasCampaign={questHasCampaign}
                        hasCampaigns={hasCampaigns}
                    />
                </div>
            </div>
        </div>
        <div className="right">
            <div className="quest-controls">
                <button
                    className="btn-ghost"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleCollapse();
                    }}
                    aria-label="toggle quest details"
                >
                    {isCollapsed ? 'Expand' : 'Minimize'}
                </button>
            </div>
        </div>
    </div>
);

QuestHeader.propTypes = {
    description: PropTypes.string.isRequired,
    priority: PropTypes.string.isRequired,
    level: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    campaign: PropTypes.object,
    questHasCampaign: PropTypes.bool,
    hasCampaigns: PropTypes.bool,
    isCollapsed: PropTypes.bool,
    onToggleCollapse: PropTypes.func.isRequired
};

QuestHeader.defaultProps = {
    level: 1,
    campaign: null,
    questHasCampaign: false,
    hasCampaigns: false,
    isCollapsed: false
};

export default QuestHeader;
