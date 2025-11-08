import { describe, it, expect } from 'vitest';

describe('Sanity checks', () => {
  it('should run unit tests', () => {
    expect(true).toBe(true);
  });

  it('should have access to environment', () => {
    expect(process.env).toBeDefined();
  });

  it('should perform basic math', () => {
    expect(2 + 2).toBe(4);
  });
});
