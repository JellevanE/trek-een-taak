import PropTypes from 'prop-types';

/**
 * ActionButton - Reusable button component with built-in loading states
 * 
 * Features:
 * - Consistent styling via variant classes (primary, ghost, danger, start, complete)
 * - Loading state with CSS-based spinner animation
 * - Accessibility (aria-busy, aria-disabled)
 * - Retro arcade theme integration
 */
export const ActionButton = ({
    variant = 'primary',
    size,
    loading = false,
    disabled = false,
    loadingText,
    spinnerPosition = 'left',
    onClick,
    children,
    className = '',
    type = 'button',
    ...rest
}) => {
    const variantClass = variant ? `btn-${variant}` : '';
    const sizeClass = size ? `btn-${size}` : '';
    
    const classNames = [
        variantClass,
        sizeClass,
        className
    ].filter(Boolean).join(' ');

    const isDisabled = disabled || loading;

    const handleClick = (event) => {
        if (isDisabled || !onClick) return;
        onClick(event);
    };

    const renderContent = () => {
        if (!loading) {
            return <span className="btn-text">{children}</span>;
        }

        const text = loadingText || children;
        const spinner = <span className="btn-spinner" aria-hidden="true" />;

        if (spinnerPosition === 'replace') {
            return spinner;
        }

        if (spinnerPosition === 'right') {
            return (
                <>
                    <span className="btn-text btn-text-loading">{text}</span>
                    {spinner}
                </>
            );
        }

        // Default: left
        return (
            <>
                {spinner}
                <span className="btn-text btn-text-loading">{text}</span>
            </>
        );
    };

    return (
        <button
            type={type}
            className={classNames}
            disabled={isDisabled}
            onClick={handleClick}
            aria-busy={loading}
            aria-disabled={isDisabled}
            data-loading={loading || undefined}
            {...rest}
        >
            {renderContent()}
        </button>
    );
};

ActionButton.propTypes = {
    variant: PropTypes.oneOf(['primary', 'ghost', 'danger', 'start', 'complete', 'secondary', 'link']),
    size: PropTypes.oneOf(['small', 'large']),
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    loadingText: PropTypes.string,
    spinnerPosition: PropTypes.oneOf(['left', 'right', 'replace']),
    onClick: PropTypes.func,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    type: PropTypes.oneOf(['button', 'submit', 'reset'])
};

ActionButton.defaultProps = {
    variant: 'primary',
    size: undefined,
    loading: false,
    disabled: false,
    loadingText: undefined,
    spinnerPosition: 'left',
    onClick: undefined,
    className: '',
    type: 'button'
};

export default ActionButton;
