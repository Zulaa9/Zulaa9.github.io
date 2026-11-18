import { describe, expect, it } from 'vitest';
import { slugify } from '../admin/server';

describe('panel: nombres de archivo controlados', () => {
  it('genera identificadores y nombres seguros', () => {
    expect(slugify('Mi Proyecto Ñandú')).toBe('mi-proyecto-nandu');
    expect(slugify('../../etc/passwd')).toBe('etc-passwd');
    expect(slugify('  Captura   (1).PNG ')).toBe('captura-1-png');
    expect(slugify('')).toBe('');
  });
});
