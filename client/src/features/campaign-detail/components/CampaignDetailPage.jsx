import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StoryTab } from './StoryTab.jsx';
import { SettingsTab } from './SettingsTab.jsx';

const CampaignDetailPage = ({
    campaign,
    storyline,
    storylineHasUpdate,
    storylineIsGenerating,
    onCheckStorylineUpdate,
    onMarkStorylineAsRead,
    initialTab = 'story',
    onOpenEditForm,
    campaignFormValues,
    campaignFormBusy,
    campaignFormError,
    onCampaignFieldChange,
    onCampaignFormSubmit,
    onCampaignFormCancel,
    onClose,
}) => {
    const [activeTab, setActiveTab] = React.useState(initialTab);

    React.useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const switchToSettings = () => {
        onOpenEditForm();
        setActiveTab('settings');
    };

    if (!campaign) return null;

    return (
        <motion.div
            className='campaign-detail-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <div className='campaign-detail-page'>
                {/* Header */}
                <div className='campaign-detail-header'>
                    <button
                        type='button'
                        className='campaign-detail-back'
                        onClick={onClose}
                        aria-label='Close campaign detail'
                    >
                        &#8592;
                    </button>
                    <div className='campaign-detail-avatar'>
                        {campaign.image_url
                            ? <img src={campaign.image_url} alt='' />
                            : (campaign.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className='campaign-detail-title'>{campaign.name}</div>
                </div>

                {/* Tabs */}
                <div className='campaign-detail-tabs'>
                    <button
                        type='button'
                        className={`campaign-detail-tab ${activeTab === 'story' ? 'active' : ''}`}
                        onClick={() => setActiveTab('story')}
                    >
                        Story
                        {storylineHasUpdate && <span className='storyline-dot' />}
                    </button>
                    <button
                        type='button'
                        className={`campaign-detail-tab ${
                            activeTab === 'settings' ? 'active' : ''
                        }`}
                        onClick={switchToSettings}
                    >
                        Settings
                    </button>
                </div>

                {/* Tab content */}
                <AnimatePresence mode='wait'>
                    {activeTab === 'story'
                        ? (
                            <motion.div
                                key='story'
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 12 }}
                                transition={{ duration: 0.15 }}
                            >
                                <StoryTab
                                    storyline={storyline}
                                    hasNewUpdate={storylineHasUpdate}
                                    isGenerating={storylineIsGenerating}
                                    onCheckUpdate={onCheckStorylineUpdate}
                                    onMarkAsRead={onMarkStorylineAsRead}
                                />
                            </motion.div>
                        )
                        : (
                            <motion.div
                                key='settings'
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -12 }}
                                transition={{ duration: 0.15 }}
                            >
                                <SettingsTab
                                    campaign={campaign}
                                    formValues={campaignFormValues}
                                    formBusy={campaignFormBusy}
                                    formError={campaignFormError}
                                    onFieldChange={onCampaignFieldChange}
                                    onSubmit={onCampaignFormSubmit}
                                    onCancel={onCampaignFormCancel}
                                />
                            </motion.div>
                        )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default CampaignDetailPage;
