import {
  computeHasNewUpdate,
  getLastSeenUpdateId,
  setLastSeenUpdateId,
} from './storylineReadState';

beforeEach(() => localStorage.clear());

test('no updates means no new update', () => {
  expect(computeHasNewUpdate({ campaignId: 1, updates: [] })).toBe(false);
  expect(computeHasNewUpdate(null)).toBe(false);
});

test('latest unseen update is new', () => {
  const storyline = { campaignId: 1, updates: [{ id: 'a' }, { id: 'b' }] };
  expect(computeHasNewUpdate(storyline)).toBe(true);
});

test('marking the latest seen clears new-update state', () => {
  const storyline = { campaignId: 1, updates: [{ id: 'a' }, { id: 'b' }] };
  setLastSeenUpdateId(1, 'b');
  expect(getLastSeenUpdateId(1)).toBe('b');
  expect(computeHasNewUpdate(storyline)).toBe(false);
});

test('last-seen is tracked per campaign', () => {
  setLastSeenUpdateId(1, 'b');
  expect(computeHasNewUpdate({ campaignId: 2, updates: [{ id: 'z' }] })).toBe(true);
});
