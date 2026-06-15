import React from 'react';
import PropTypes from 'prop-types';

import angleLeft from '../assets/icons/angle-left-solid.svg';
import angleRight from '../assets/icons/angle-right-solid.svg';
import plus from '../assets/icons/plus-solid.svg';
import book from '../assets/icons/book-solid.svg';
import timesCircle from '../assets/icons/times-circle-solid.svg';
import infoCircle from '../assets/icons/info-circle-solid.svg';
import pencil from '../assets/icons/pencil-solid.svg';
import user from '../assets/icons/user-solid.svg';
import cog from '../assets/icons/cog-solid.svg';

/**
 * Icon
 * ----
 * Renders a pixel-art glyph from the SVG set in ../assets/icons. The SVG is
 * applied as a CSS mask so the shape inherits `currentColor` and matches the
 * surrounding text (active/muted/etc.) instead of being a fixed-colour image.
 */
const ICONS = {
    'angle-left': angleLeft,
    'angle-right': angleRight,
    plus,
    book,
    'times-circle': timesCircle,
    'info-circle': infoCircle,
    pencil,
    user,
    cog,
};

export default function Icon({ name, size = 18, className = '', title }) {
    const src = ICONS[name];
    if (!src) return null;
    return (
        <span
            className={`ui-icon ${className}`.trim()}
            role={title ? 'img' : undefined}
            aria-label={title || undefined}
            aria-hidden={title ? undefined : true}
            style={{
                width: size,
                height: size,
                maskImage: `url(${src})`,
                WebkitMaskImage: `url(${src})`,
            }}
        />
    );
}

Icon.propTypes = {
    name: PropTypes.oneOf(Object.keys(ICONS)).isRequired,
    size: PropTypes.number,
    className: PropTypes.string,
    title: PropTypes.string,
};
