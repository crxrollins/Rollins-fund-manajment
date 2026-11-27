'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const MAX_WIDTH = 1600;

async function shrink(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.8));
}

export default function ScreenshotPicker({ paths = [], onChange }) {
  const [urls, setUrls] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [big, setBig] = useState(null);

  useEffect(() => {
    async function sign() {
      if (!paths.length) return setUrls({});
      const { data } = await supabase.storage.from('screenshots').createSignedUrls(paths, 3600);
      const map = {};
      (data || []).forEach((d) => { if (d.signedUrl) map[d.path] = d.signedUrl; });
      setUrls(map);
    }
    sign();
  }, [paths.join('|')]);

  async function add(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setError(''); setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    const added = [];
    for (const f of files) {
      try {
        const blob = await shrink(f);
        const path = uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
        const { error } = await supabase.storage.from('screenshots').upload(path, blob, { contentType: 'image/jpeg' });
        if (error) throw error;
        added.push(path);
      } catch (err) {
        setError('Could not upload one image: ' + (err.message || 'unknown error'));
      }
    }
    setBusy(false);
    if (added.length) onChange([...paths, ...added]);
  }

  async function remove(p) {
    if (!confirm('Remove this screenshot?')) return;
    await supabase.storage.from('screenshots').remove([p]);
    onChange(paths.filter((x) => x !== p));
  }

  return (
    <div>
      <label>Screenshots (proof)</label>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        {paths.map((p) => (
          <div key={p} style={{ position: 'relative' }}>
            {urls[p] ? (
              <img src={urls[p]} alt="screenshot" onClick={() => setBig(urls[p])}
                style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: 10, background: 'var(--panel-2)' }} />
            )}
            <button type="button" onClick={() => remove(p)}
              style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 999, border: 0, background: 'var(--red)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>x</button>
          </div>
        ))}
      </div>
      <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={add} disabled={busy} />
      {busy && <p className="sub" style={{ marginTop: 6, marginBottom: 0 }}>Uploading...</p>}
      {error && <p className="error">{error}</p>}
      {big && (
        <div className="modal-bg" style={{ zIndex: 100 }} onClick={() => setBig(null)}>
          <img src={big} alt="screenshot" style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
