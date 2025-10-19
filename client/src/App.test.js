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
