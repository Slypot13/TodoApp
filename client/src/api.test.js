import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildTasksUrl, createApi } from './api.js';

describe('buildTasksUrl', () => {
  it('ajoute /tasks à l\'URL de base', () => {
    expect(buildTasksUrl('https://api.example.com')).toBe('https://api.example.com/tasks');
  });

  it('ignore le slash final', () => {
    expect(buildTasksUrl('https://api.example.com/', 4)).toBe('https://api.example.com/tasks/4');
  });
});

describe('createApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('remonte le message d\'erreur de l\'API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Le champ title est obligatoire' }),
    }));

    const api = createApi('https://api.example.com');
    await expect(api.create('')).rejects.toThrow('Le champ title est obligatoire');
  });
});
