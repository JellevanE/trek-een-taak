import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RegistrationWizard from './RegistrationWizard.jsx';

// The wizard opens on a welcome screen; every flow test starts by stepping
// past it so the helpers below land on the account-details form.
function renderWizard(props = {}) {
    const utils = render(
        <RegistrationWizard onSuccess={jest.fn()} onCancel={jest.fn()} {...props} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    return utils;
}

// Helper: fill step 1 with values that pass *local* validation.
function fillStep1(
    { username = 'newhero', password = 'sup3rsecret!', email = '' } = {},
) {
    fireEvent.change(screen.getByLabelText(/^username/i), {
        target: { value: username },
    });
    if (email) {
        fireEvent.change(screen.getByLabelText(/^email/i), {
            target: { value: email },
        });
    }
    fireEvent.change(screen.getByLabelText(/^password/i), {
        target: { value: password },
    });
    fireEvent.change(screen.getByLabelText(/^confirm password/i), {
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

    renderWizard();
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

    renderWizard();
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

    renderWizard();
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
    renderWizard();
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

// --- New-flow coverage -------------------------------------------------------

function mockHappyPath(registerResponse = {}) {
    const fetchMock = jest.fn((url) => {
        const u = String(url);
        if (u.includes('/check-username/')) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ available: true }),
            });
        }
        if (u.includes('/api/users/register')) {
            return Promise.resolve({
                ok: true,
                status: 201,
                json: () =>
                    Promise.resolve({
                        token: 'jwt-123',
                        user: {
                            username: 'newhero',
                            profile: { display_name: 'New Hero', class: 'mage', avatar: null },
                        },
                        ...registerResponse,
                    }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    global.fetch = fetchMock;
    return fetchMock;
}

test('opens on the welcome step and only shows the account form after Get Started', () => {
    render(<RegistrationWizard onSuccess={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText(/welcome, adventurer/i)).toBeInTheDocument();
    expect(screen.queryByText('Create Your Account')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
});

test('shows a confirmation step after registering and only signs in on the CTA', async () => {
    mockHappyPath();
    const onSuccess = jest.fn();
    renderWizard({ onSuccess });
    fillStep1();
    clickContinue();
    expect(await screen.findByText('Set Up Your Profile')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /complete registration/i }));

    // Account exists, but we hand off explicitly rather than vanishing.
    expect(await screen.findByText(/achievement unlocked/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome, new hero/i)).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /enter the quest board/i }));
    expect(onSuccess).toHaveBeenCalledWith(
        'jwt-123',
        expect.objectContaining({ username: 'newhero' }),
    );
});

test('sends the chosen avatar preset in the registration payload', async () => {
    const fetchMock = mockHappyPath();
    renderWizard();
    fillStep1();
    clickContinue();
    expect(await screen.findByText('Set Up Your Profile')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Starborn' }));
    fireEvent.click(screen.getByRole('button', { name: /complete registration/i }));
    await screen.findByText(/achievement unlocked/i);

    const registerCall = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/users/register')
    );
    const body = JSON.parse(registerCall[1].body);
    expect(body.profile.avatar).toBe('preset:starborn');
    expect(body.profile.display_name).toBe('newhero'); // auto-filled from username
});

test('progress indicator lets the user jump back to a completed step', async () => {
    mockHappyPath();
    renderWizard();
    fillStep1();
    clickContinue();
    expect(await screen.findByText('Set Up Your Profile')).toBeInTheDocument();

    // Upcoming step is not clickable, completed one is.
    expect(screen.getByRole('button', { name: /step 4 of 4/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /step 2 of 4/i }));
    expect(screen.getByText('Create Your Account')).toBeInTheDocument();
    // Typed values survive the round trip.
    expect(screen.getByLabelText(/^username/i)).toHaveValue('newhero');
});

test('blocks the submit and points at the first invalid field on local validation errors', () => {
    global.fetch = jest.fn();
    renderWizard();
    fillStep1({ username: 'ab' }); // too short
    clickContinue();

    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^username/i)).toHaveFocus();
});
