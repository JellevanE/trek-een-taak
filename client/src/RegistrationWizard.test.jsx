import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegistrationWizard from './RegistrationWizard';

// Helper: fill step 1 with values that pass *local* validation.
function fillStep1(
    { username = 'newhero', password = 'sup3rsecret!', email = '' } = {},
) {
    fireEvent.change(screen.getByLabelText('Username *'), {
        target: { value: username },
    });
    if (email) {
        fireEvent.change(screen.getByLabelText('Email (Optional)'), {
            target: { value: email },
        });
    }
    fireEvent.change(screen.getByLabelText('Password *'), {
        target: { value: password },
    });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), {
        target: { value: password },
    });
}

function clickContinue() {
    fireEvent.click(
        screen.getByRole('button', { name: /create account|continue/i }),
    );
}

afterEach(() => {
    jest.restoreAllMocks();
});

test('does NOT advance to step 2 when the server reports the username is taken', async () => {
    global.fetch = jest.fn((url) => {
        if (String(url).includes('/check-username/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ available: false }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<RegistrationWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fillStep1();
    clickContinue();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    // We must stay on step 1 — the username was rejected.
    expect(screen.queryByText('Set Up Your Profile')).not.toBeInTheDocument();
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
});

test('does NOT advance to step 2 when password is shorter than the server minimum (8)', async () => {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ available: true }),
        })
    );

    render(<RegistrationWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fillStep1({ password: 'pass12' }); // 6 chars — accepted by old client rule, rejected by server
    clickContinue();

    // Give any async work a chance to run, then assert we never left step 1.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByText('Set Up Your Profile')).not.toBeInTheDocument();
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
});

test('advances to step 2 once the username is confirmed available and inputs are valid', async () => {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ available: true }),
        })
    );

    render(<RegistrationWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fillStep1();
    clickContinue();

    expect(await screen.findByText('Set Up Your Profile')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/check-username/'),
    );
});

// Drives the wizard from a fresh render all the way to clicking
// "Complete Registration" on step 2, with check-username mocked as available.
async function reachAndSubmitStep2() {
    render(<RegistrationWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);
    fillStep1();
    clickContinue();
    expect(await screen.findByText('Set Up Your Profile')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /complete registration/i }));
}

test('returns to step 1 when registration fails because the username was taken at submit time', async () => {
    global.fetch = jest.fn((url) => {
        const u = String(url);
        if (u.includes('/check-username/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ available: true }),
            });
        }
        if (u.includes('/api/users/register')) {
            return Promise.resolve({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Username taken' }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await reachAndSubmitStep2();

    // The conflict belongs to step 1, so we must bounce back there and surface it.
    expect(await screen.findByText('Create Your Account')).toBeInTheDocument();
    expect(screen.queryByText('Set Up Your Profile')).not.toBeInTheDocument();
    expect(screen.getByText(/username taken/i)).toBeInTheDocument();
});

test('keeps the user on step 2 with a friendly message when rate limited', async () => {
    global.fetch = jest.fn((url) => {
        const u = String(url);
        if (u.includes('/check-username/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ available: true }),
            });
        }
        if (u.includes('/api/users/register')) {
            return Promise.resolve({
                ok: false,
                status: 429,
                json: () =>
                    Promise.resolve({
                        error: 'Too many registration attempts. Please try again later.',
                    }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await reachAndSubmitStep2();

    // A rate limit isn't a step-1 data problem — stay put and tell them to wait.
    expect(await screen.findByText(/too many/i)).toBeInTheDocument();
    expect(screen.getByText('Set Up Your Profile')).toBeInTheDocument();
});

test('does not retry the failed registration request', async () => {
    const fetchMock = jest.fn((url) => {
        const u = String(url);
        if (u.includes('/check-username/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ available: true }),
            });
        }
        return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'Username taken' }),
        });
    });
    global.fetch = fetchMock;

    await reachAndSubmitStep2();
    await screen.findByText(/username taken/i);

    const registerCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/api/users/register')
    );
    expect(registerCalls).toHaveLength(1);
});
