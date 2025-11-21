import React from 'react';
import { render } from '@testing-library/react';
import { ThemePreviewPage } from '../ThemePreviewPage.jsx';
import { THEME_PROFILES } from '../index.js';

describe('ThemePreviewPage', () => {
    it('renders every theme column and matches snapshot', () => {
        const { getByText, asFragment } = render(
            <ThemePreviewPage
                currentThemeId="neon_arcade"
                themeLabel="Neon Arcade"
                toggleTheme={() => {}}
                soundVolume={65}
                setSoundVolume={() => {}}
                soundFxMeta={{ formats: ['audio/webm', 'audio/mpeg'], maxFileSizeKb: 50 }}
            />
        );

        Object.values(THEME_PROFILES).forEach((profile) => {
            expect(getByText(profile.label)).toBeInTheDocument();
        });

        expect(asFragment()).toMatchSnapshot();
    });
});
