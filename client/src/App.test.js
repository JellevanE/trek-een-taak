import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app header', () => {
  render(<App />);
  const header = screen.getByRole('heading', { level: 1, name: /Quest Tracker/i });
  expect(header).toBeInTheDocument();
});
