import { describe, it, expect } from 'vitest';
import { extractGpsFromImageFile } from '../exifGps';

describe('EXIF GPS Extractor', () => {
  it('retorna null para imagens não JPEG ou sem EXIF GPS', async () => {
    const fakeBlob = new Blob(['not an image or plain text'], { type: 'text/plain' });
    const result = await extractGpsFromImageFile(fakeBlob);
    expect(result).toBeNull();
  });

  it('processa adequadamente buffers vazios sem quebrar', async () => {
    const emptyBlob = new Blob([], { type: 'image/jpeg' });
    const result = await extractGpsFromImageFile(emptyBlob);
    expect(result).toBeNull();
  });
});
