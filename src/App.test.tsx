import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from './App';

vi.mock('./assets/script/model', () => ({
  getModel: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  setModel: vi.fn(),
}));

test('renders the header and the upload screen', () => {
  render(<App />);
  expect(screen.getByText('REMOVE')).toBeInTheDocument();
  expect(screen.getByRole('button')).toBeInTheDocument();
});
