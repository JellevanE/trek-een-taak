import PropTypes from 'prop-types';
import React from 'react';
import Icon from '../../../components/Icon.jsx';

/**
 * RegistrationErrorBoundary
 * -------------------------
 * Catches render errors inside the wizard so a bug in one step can't take
 * the whole sign-in screen down. "Try again" re-mounts the children; the
 * optional `onReset` lets the wizard rewind to a known-good step first.
 */
export default class RegistrationErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
        this.handleRetry = this.handleRetry.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        if (this.props.onError) {
            this.props.onError(error, info);
        } else {
            console.error('Registration wizard crashed:', error, info);
        }
    }

    handleRetry() {
        if (this.props.onReset) this.props.onReset();
        this.setState({ error: null });
    }

    render() {
        if (!this.state.error) return this.props.children;

        return (
            <div className='registration-step registration-error' role='alert'>
                <div className='registration-error-icon'>
                    <Icon name='exclaimation' size={28} />
                </div>
                <h2>Something went sideways</h2>
                <p>
                    The registration form hit an unexpected error. Your typed details are
                    kept — try again, or head back to sign in.
                </p>
                <div className='form-actions'>
                    {this.props.onCancel && (
                        <button type='button' className='btn-ghost' onClick={this.props.onCancel}>
                            Back to sign in
                        </button>
                    )}
                    <button type='button' className='btn-primary' onClick={this.handleRetry}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }
}

RegistrationErrorBoundary.propTypes = {
    children: PropTypes.node,
    onReset: PropTypes.func,
    onCancel: PropTypes.func,
    onError: PropTypes.func,
};
