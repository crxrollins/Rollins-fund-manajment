'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import ScreenshotPicker from '../../components/ScreenshotPicker';
import { supabase } from '../../lib/supabase';
import { money } from '../../lib/format';

const STATUSES = { not_started: 'Not started', ongoing: 'Ongoing', paused: 'Paused', completed: 'Completed' };
const empty = {
  name: '', description: '', client: '', status: 'ongoing', stage: '', start_date: '', end_date: '',
  budget: '', spent: '', received: '', fees: '', currency: 'USD', notes: '', screenshots: [],
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [big, setBig] = useState(null);
  const [thumbs, setThumbs] = useState({});

  async function load() {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    const list = data || [];
    setProjects(list);
    const all = list.flatMap((p) => p.screenshots || []);
    if (all.length) {
      const { data: signed } = await supabase.storage.from('screenshots').createSignedUrls(all, 3600);
      const map = {};
      (signed || []).forEach((d) => { if (d.signedUrl) map[d.path] = d.signedUrl; });
      setThumbs(map);
    }
  }
  useEffect(() => { load(); }, []);

  const num = (v) => (v === '' || v == null ? 0 : Number(v));
  const profit = (p) => num(p.received) - num(p.spent) - num(p.fees);

  async function save(e) {
    e.preventDefault(); setError('');
    const payload = {
      ...form,
      budget: form.budget === '' ? null : Number(form.budget),
      spent: num(form.spent), received: num(form.received), fees: num(form.fees),
      start_date: form.start_date || null, end_date: form.end_date || null,
    };
    const q = editId ? supabase.from('projects').update(payload).eq('id', editId) : supabase.from('projects').insert(payload);
    const { error } = await q;
    if (error) return setError(error.message);
    setOpen(false); setForm(empty); setEditId(null); load();
  }

  async function remove(id) {
    if (!confirm('Delete this project?')) return;
    await supabase.from('projects').delete().eq('id', id);
    load();
  }

  function edit(p) {
    setForm({
      name: p.name, description: p.description || '', client: p.client || '', status: p.status, stage: p.stage || '',
      start_date: p.start_date || '', end_date: p.end_date || '', budget: p.budget ?? '',
      spent: p.spent ?? '', received: p.received ?? '', fees: p.fees ?? '',
      currency: p.currency, notes: p.notes || '', screenshots: p.screenshots || [],
    });
    setEditId(p.id); setOpen(true);
  }

  const shown = projects.filter((p) => !filter || p.status === filter);

  return (
    <AppShell>
      <div className="header-row">
        <div><h1>Projects</h1><p className="sub" style={{ marginBottom: 0 }}>What you are working on, where it stands, and what it costs.</p></div>
        <div className="row" style={{ maxWidth: 360 }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn" onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}>+ New project</button>
        </div>
      </div>

      <div className="grid grid-2">
        {shown.map((p) => {
          const pl = profit(p);
          return (
            <div className="card" key={p.id}>
              <div className="header-row" style={{ marginBottom: 8 }}>
                <h2 style={{ marginBottom: 0 }}>{p.name}</h2>
                <span className={'badge ' + p.status}>{STATUSES[p.status]}</span>
              </div>
              {p.client && <p className="sub" style={{ marginBottom: 6 }}>Client / source: {p.client}</p>}
              {p.description && <p style={{ marginBottom: 10 }}>{p.description}</p>}
              <p className="sub" style={{ marginBottom: 10 }}>Stage: <b style={{ color: 'var(--text)' }}>{p.stage || 'Not set'}</b></p>
              <div className="row">
                <div><div className="stat-label">Spent</div><div className="red" style={{ fontWeight: 700 }}>{money(p.spent, p.currency)}</div></div>
                <div><div className="stat-label">Received</div><div className="green" style={{ fontWeight: 700 }}>{money(p.received, p.currency)}</div></div>
                <div><div className="stat-label">Fees</div><div style={{ fontWeight: 700 }}>{money(p.fees, p.currency)}</div></div>
                {p.budget != null && <div><div className="stat-label">Budget</div><div style={{ fontWeight: 700 }}>{money(p.budget, p.currency)}</div></div>}
              </div>
              <div className="card" style={{ marginTop: 12, background: 'var(--panel-2)', padding: 12 }}>
                <div className="stat-label">{pl >= 0 ? 'Profit' : 'Loss'}</div>
                <div className={pl >= 0 ? 'green' : 'red'} style={{ fontSize: 22, fontWeight: 700 }}>{money(Math.abs(pl), p.currency)}</div>
              </div>
              {(p.screenshots || []).length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {p.screenshots.map((s) => thumbs[s] ? (
                    <img key={s} src={thumbs[s]} alt="proof" onClick={() => setBig(thumbs[s])}
                      style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                  ) : null)}
                </div>
              )}
              <p className="sub" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>{p.start_date || '?'} → {p.end_date || 'ongoing'}</p>
              {p.notes && <p className="sub" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>{p.notes}</p>}
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn-ghost" onClick={() => edit(p)}>Edit</button>
                <button className="btn-danger" onClick={() => remove(p.id)}>Delete</button>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="sub">No projects yet. Add your first one.</p>}
      </div>

      {big && (
        <div className="modal-bg" style={{ zIndex: 100 }} onClick={() => setBig(null)}>
          <img src={big} alt="screenshot" style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 12 }} />
        </div>
      )}

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{editId ? 'Edit project' : 'New project'}</h2>
            <label>Project name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <label>Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="row">
              <div><label>Client / source</label><input value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} /></div>
              <div><label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <label>Current stage (e.g. planning, working, review, delivery)</label>
            <input value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} />
            <div className="row">
              <div><label>Start date</label><input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><label>End date</label><input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Currency</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD ($)</option><option value="BDT">BDT (৳)</option>
                </select></div>
              <div><label>Budget / expected amount</label><input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Total spent</label><input type="number" step="0.01" min="0" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} /></div>
              <div><label>Total received</label><input type="number" step="0.01" min="0" value={form.received} onChange={(e) => setForm({ ...form, received: e.target.value })} /></div>
              <div><label>Fees paid</label><input type="number" step="0.01" min="0" value={form.fees} onChange={(e) => setForm({ ...form, fees: e.target.value })} /></div>
            </div>
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <ScreenshotPicker paths={form.screenshots} onChange={(p) => setForm({ ...form, screenshots: p })} />
            {error && <p className="error">{error}</p>}
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn">Save</button>
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
