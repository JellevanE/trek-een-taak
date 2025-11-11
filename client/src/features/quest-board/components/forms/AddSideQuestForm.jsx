import PropTypes from 'prop-types';
import React from 'react';

export const AddSideQuestForm = ({
    questId,
    value,
    inputRef,
    onChange,
    onAdd,
    onCancel,
    onFocus,
    onBlur
}) => {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onAdd();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
        }
    };

    return (
        <div className="add-side-quest">
            <input
                ref={inputRef}
                type="text"
                placeholder="Add a side-quest"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={handleKeyDown}
                data-quest-id={questId}
            />
            <button type="button" className="btn-link" onClick={onAdd}>Add</button>
        </div>
    );
};

AddSideQuestForm.propTypes = {
    questId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    value: PropTypes.string,
    inputRef: PropTypes.oneOfType([
        PropTypes.func,
        PropTypes.shape({ current: PropTypes.any })
    ]),
    onChange: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func
};

AddSideQuestForm.defaultProps = {
    value: '',
    inputRef: null,
    onFocus: undefined,
    onBlur: undefined
};

export default AddSideQuestForm;
