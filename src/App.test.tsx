import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders BrewChrome title', () => {
    render(<App />);
    expect(screen.getByText('BrewChrome')).toBeDefined();
  });

  it('renders upload area', () => {
    render(<App />);
    expect(screen.getByText(/drop images or zip files here/i)).toBeDefined();
  });
});
