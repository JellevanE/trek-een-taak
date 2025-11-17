import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const header = screen.getByRole('heading', { level: 1, name: /Quest Tracker/i });
  expect(header).toBeInTheDocument();
});

const originalFetch = global.fetch;

const okResponse = (data) => Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve(data)
});

afterEach(() => {
  if (originalFetch) {
    global.fetch = originalFetch;
  } else {
    delete global.fetch;
  }
  window.localStorage.clear();
});

function setupAuthenticatedApp(fetchImplementation) {
  window.localStorage.setItem('auth_token', 'test-token');
  global.fetch = jest.fn(fetchImplementation);
  return render(<App />);
}

test('campaign sidebar filters quests and fetches scoped tasks', async () => {
  const campaigns = [
    { id: 1, name: 'Campaign Alpha', progress_summary: '1/2', stats: { quests_completed: 1, quests_total: 2 } },
    { id: 2, name: 'Campaign Beta', progress_summary: '0/1', stats: { quests_completed: 0, quests_total: 1 } }
  ];
  const quests = [
    { id: 10, description: 'Alpha quest', status: 'todo', priority: 'medium', task_level: 1, campaign_id: 1 },
    { id: 11, description: 'Loose quest', status: 'todo', priority: 'low', task_level: 1, campaign_id: null }
  ];
  const filteredQuests = [
    { id: 10, description: 'Alpha quest', status: 'todo', priority: 'medium', task_level: 1, campaign_id: 1 }
  ];

  setupAuthenticatedApp((url, options = {}) => {
    if (url === '/api/users/me') return okResponse({ user: { rpg: { level: 1 } } });
    if (url === '/api/campaigns') return okResponse({ campaigns });
    if (url === '/api/tasks') return okResponse({ tasks: quests });
    if (url === '/api/tasks?campaign_id=1') return okResponse({ tasks: filteredQuests });
    throw new Error(`Unhandled request: ${url} ${JSON.stringify(options)}`);
  });

  await waitFor(() => expect(screen.getByText('Alpha quest')).toBeInTheDocument());

  const sidebar = screen.getByText('Campaigns').closest('aside');
  expect(sidebar).toBeTruthy();
  const campaignButton = within(sidebar).getByRole('button', { name: /Campaign Alpha/i });
  fireEvent.click(campaignButton);

  await waitFor(() => {
    expect(screen.getByText('Alpha quest')).toBeInTheDocument();
    expect(screen.queryByText('Loose quest')).not.toBeInTheDocument();
  });

  const fetchCalls = global.fetch.mock.calls.map(([requestUrl]) => requestUrl);
  expect(fetchCalls).toContain('/api/tasks?campaign_id=1');
});

test('creating a quest submits selected campaign id', async () => {
  const campaigns = [
    { id: 1, name: 'Campaign Alpha', progress_summary: '0/0', stats: { quests_completed: 0, quests_total: 0 } }
  ];
  const quests = [];
  const postBodies = [];

  setupAuthenticatedApp((url, options = {}) => {
    if (url === '/api/users/me') return okResponse({ user: { rpg: { level: 1 } } });
    if (url === '/api/campaigns') return okResponse({ campaigns });
    if (url === '/api/tasks' && (!options.method || options.method === 'GET')) return okResponse({ tasks: quests });
    if (url === '/api/tasks' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      postBodies.push(body);
      return okResponse({
        id: 42,
        description: body.description,
        status: 'todo',
        priority: body.priority || 'medium',
        task_level: body.task_level || 1,
        campaign_id: body.campaign_id
      });
    }
    throw new Error(`Unhandled request: ${url} ${JSON.stringify(options)}`);
  });

  await waitFor(() => expect(screen.getByRole('button', { name: /Add Quest/i })).toBeInTheDocument());

  const input = screen.getByPlaceholderText(/Quest description/i);
  fireEvent.change(input, { target: { value: 'Join campaign' } });

  const select = screen.getByRole('combobox', { name: /Assign quest to campaign/i });
  fireEvent.change(select, { target: { value: '1' } });

  fireEvent.click(screen.getByRole('button', { name: /Add Quest/i }));

  await waitFor(() => expect(postBodies.length).toBeGreaterThan(0));

  expect(postBodies[0]).toMatchObject({
    description: 'Join campaign',
    campaign_id: 1
  });
});

test('allows creating a campaign from the sidebar', async () => {
  let campaigns = [];
  const quests = [];
  let createdPayload = null;

  setupAuthenticatedApp((url, options = {}) => {
    if (url === '/api/users/me') return okResponse({ user: { rpg: { level: 1 } } });
    if (url === '/api/campaigns' && (!options.method || options.method === 'GET')) {
      return okResponse({ campaigns });
    }
    if (url === '/api/tasks' && (!options.method || options.method === 'GET')) {
      return okResponse({ tasks: quests });
    }
    if (url.startsWith('/api/tasks?')) {
      return okResponse({ tasks: [] });
    }
    if (url === '/api/campaigns' && options.method === 'POST') {
      createdPayload = JSON.parse(options.body);
      const newCampaign = {
        id: 5,
        name: createdPayload.name,
        description: createdPayload.description || '',
        image_url: createdPayload.image_url || null,
        progress_summary: '0/0',
        stats: { quests_completed: 0, quests_total: 0 }
      };
      campaigns = [...campaigns, newCampaign];
      return okResponse(newCampaign);
    }
    if (url.startsWith('/api/tasks?campaign_id=')) {
      return okResponse({ tasks: [] });
    }
    throw new Error(`Unhandled request: ${url} ${JSON.stringify(options)}`);
  });

  await waitFor(() => expect(screen.getByRole('button', { name: /New Campaign/i })).toBeInTheDocument());

  fireEvent.click(screen.getByRole('button', { name: /New Campaign/i }));

  fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Skyward League' } });
  fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Test description' } });
  fireEvent.change(screen.getByLabelText(/Image URL/i), { target: { value: 'https://example.com/banner.png' } });

  fireEvent.click(screen.getByRole('button', { name: /Create$/i }));

  await waitFor(() => {
    const campaignButton = screen.getByRole('button', { name: /Skyward League/i });
    expect(campaignButton).toHaveAttribute('aria-pressed', 'true');
  });

  expect(createdPayload).toMatchObject({
    name: 'Skyward League',
    description: 'Test description',
    image_url: 'https://example.com/banner.png'
  });

  expect(screen.queryByText(/Create Campaign/i)).not.toBeInTheDocument();
});

test('allows editing the selected campaign', async () => {
  let campaigns = [
    { id: 3, name: 'Original Name', description: 'Initial', image_url: null, progress_summary: '0/1', stats: { quests_completed: 0, quests_total: 1 } }
  ];
  const quests = [{ id: 30, description: 'Quest', status: 'todo', priority: 'medium', task_level: 1, campaign_id: 3 }];
  let updatedPayload = null;

  setupAuthenticatedApp((url, options = {}) => {
    if (url === '/api/users/me') return okResponse({ user: { rpg: { level: 1 } } });
    if (url === '/api/campaigns' && (!options.method || options.method === 'GET')) {
      return okResponse({ campaigns });
    }
    if (url === '/api/tasks' && (!options.method || options.method === 'GET')) {
      return okResponse({ tasks: quests });
    }
    if (url.startsWith('/api/tasks?')) {
      return okResponse({ tasks: quests.filter(q => String(q.campaign_id) === url.split('=').pop()) });
    }
    if (url === '/api/campaigns/3' && options.method === 'PATCH') {
      updatedPayload = JSON.parse(options.body);
      campaigns = [{
        ...campaigns[0],
        name: updatedPayload.name,
        description: updatedPayload.description || '',
        image_url: updatedPayload.image_url || null
      }];
      return okResponse(campaigns[0]);
    }
    throw new Error(`Unhandled request: ${url} ${JSON.stringify(options)}`);
  });

  await waitFor(() => expect(screen.getByRole('button', { name: /Campaigns/i })).toBeInTheDocument());

  const sidebar = screen.getByText('Campaigns').closest('aside');
  expect(sidebar).toBeTruthy();
  const campaignButton = within(sidebar).getByRole('button', { name: /Original Name/i });
  fireEvent.click(campaignButton);

  fireEvent.click(screen.getByRole('button', { name: /Edit Selected/i }));

  const nameInput = screen.getByLabelText(/Name/i);
  fireEvent.change(nameInput, { target: { value: 'Renamed Campaign' } });

  fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

  await waitFor(() => {
    const renamedButton = within(sidebar).getByRole('button', { name: /Renamed Campaign/i });
    expect(renamedButton).toHaveAttribute('aria-pressed', 'true');
  });

  expect(updatedPayload).toMatchObject({
    name: 'Renamed Campaign'
  });
});

test('add side quest button works even when quest already has side quests', async () => {
  const quests = [
    {
      id: 501,
      description: 'Master quest',
      status: 'todo',
      priority: 'medium',
      task_level: 1,
      campaign_id: null,
      side_quests: [
        { id: 9001, description: 'Gather crystals', status: 'todo' }
      ]
    }
  ];

  setupAuthenticatedApp((url, options = {}) => {
    if (url === '/api/users/me') return okResponse({ user: { rpg: { level: 3 } } });
    if (url === '/api/campaigns') return okResponse({ campaigns: [] });
    if (url === '/api/tasks' && (!options.method || options.method === 'GET')) return okResponse({ tasks: quests });
    if (url.startsWith('/api/tasks?')) return okResponse({ tasks: quests });
    throw new Error(`Unhandled request: ${url} ${JSON.stringify(options)}`);
  });

  await waitFor(() => expect(screen.getByText('Master quest')).toBeInTheDocument());

  const questCard = screen.getByText('Master quest').closest('.quest');
  expect(questCard).toBeTruthy();
  const addButton = within(questCard).getByRole('button', { name: /\+ Add Side Quest/i });
  fireEvent.click(addButton);

  await waitFor(() => {
    expect(screen.getByPlaceholderText(/Add a side-quest/i)).toBeInTheDocument();
  });
});

