import React from 'react';

export const SettingsTab = ({
    campaign,
    formValues,
    formBusy,
    formError,
    onFieldChange,
    onSubmit,
    onCancel,
}) => {
    return (
        <form className='campaign-form' onSubmit={onSubmit}>
            <div className='campaign-form-title'>Edit Campaign</div>
            <label className='campaign-form-field'>
                <span>Name</span>
                <input
                    type='text'
                    value={formValues.name}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    disabled={formBusy}
                    required
                />
            </label>
            <label className='campaign-form-field'>
                <span>Description</span>
                <textarea
                    value={formValues.description}
                    onChange={(e) => onFieldChange('description', e.target.value)}
                    disabled={formBusy}
                    rows={2}
                />
            </label>
            <label className='campaign-form-field'>
                <span>Image URL</span>
                <input
                    type='url'
                    value={formValues.image_url}
                    onChange={(e) => onFieldChange('image_url', e.target.value)}
                    disabled={formBusy}
                    placeholder='https://example.com/banner.png'
                />
            </label>
            {formError && <div className='campaign-form-error'>{formError}</div>}
            <div className='campaign-form-actions'>
                <button
                    type='submit'
                    className='btn-primary btn-small'
                    disabled={formBusy}
                >
                    Save
                </button>
                <button
                    type='button'
                    className='btn-ghost btn-small'
                    onClick={onCancel}
                    disabled={formBusy}
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};
