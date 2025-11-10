import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuestHeader } from '../QuestHeader.jsx';
import { createCampaignFixture } from '../../../features/quest-board/test-data/questFixtures.js';

const baseProps = {
    priority: 'normal',
    level: 2,
    campaign: null,
    questHasCampaign: false,
    hasCampaigns: false,
    isCollapsed: false,
    onToggleCollapse: jest.fn()
};

describe('QuestHeader', () => {
    it('renders long descriptions without trimming and exposes the full text via title', () => {
        const longDescription = 'Neon '.repeat(60).trim();
        render(
            <QuestHeader
                {...baseProps}
                description={longDescription}
            />
        );

        const heading = screen.getByTestId('quest-heading');
        expect(heading).toHaveTextContent(longDescription);
        expect(heading).toHaveAttribute('title', longDescription);
    });

    it('falls back to "Untitled quest" when description is empty or whitespace', () => {
        render(
            <QuestHeader
                {...baseProps}
                description="   "
            />
        );

        expect(screen.getByTestId('quest-heading')).toHaveTextContent('Untitled quest');
    });

    it('supports emoji/special characters and still renders metadata', () => {
        const emojiDescription = '🔥 Calibrate neon beacons 🚀';
        render(
            <QuestHeader
                {...baseProps}
                description={emojiDescription}
                campaign={createCampaignFixture({ name: 'Emoji Ops' })}
                questHasCampaign
                hasCampaigns
            />
        );

        expect(screen.getByText(emojiDescription)).toBeInTheDocument();
        expect(screen.getByText('Emoji Ops')).toBeInTheDocument();
    });
});
