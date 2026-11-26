'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabase';
import { money } from '../../lib/format';

const STATUSES = { not_started: 'Not started', ongoing: 'Ongoing', paused: 'Paused', completed: 'Completed' };
const empty = { name: '', description: '', client: '', status: 'ongoing', stage: '', start_date: '', end_date: '', budget: '', currency: 'USD', notes: '' };

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [tx, setTx] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  async function load() {
    const [p, t] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('project_id,type,amount,fee,currency'),
    ]);
    setProjects(p.data || []); setTx(t.data || []);
  }
  useEffect(() => { load(); }, []);

  function totals(p) {
    let spent = 0, received = 0, fees = 0;
    tx.filter((t) => t.project_id === p.id && t.currency === p.currency).forEach((t) => {
      fees += Number(t.fee || 0);
      if (t.type === 'expense' || t.type === 'deposit') spent += Number(t.amount);
      if (t.type === 'payment_received' || t.type === 'income') received += Number(t.amount);
    });
    return { spent, received, fees };
  }

  async function save(e) {
    e.preventDefault(); setError('');
    const payload = { ...form, budget: form.budget === '' ? null : Number(form.budget), start_date: form.start_date || null, end_date: form.end_date || null };
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
          const t = totals(p);
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
                <div><div className="stat-label">Spent</div><div className="red" style={{ fontWeight: 700 }}>{money(t.spent, p.currency)}</div></div>
                <div><div className="stat-label">Received</div><div className="green" style={{ fontWeight: 700 }}>{money(t.received, p.currency)}</div></div>
                <div><div className="stat-label">Fees</div><div style={{ fontWeight: 700 }}>{money(t.fees, p.currency)}</div></div>
                {p.budget != null && <div><div className="stat-label">Budget</div><div style={{ fontWeight: 700 }}>{money(p.budget, p.currency)}</div></div>}
              </div>
              <p className="sub" style={{ marginTop: 10, marginBottom: 0, fontSize: 13 }}>{p.start_date || '?'} → {p.end_date || 'ongoing'}</p>
              {p.notes && <p className="sub" style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}>{p.notes}</p>}
              <div className="row" style={{ marginTop: 14 }}>
                <button className="btn-ghost" onClick={() => { setForm({ name: p.name, description: p.description || '', client: p.client || '', status: p.status, stage: p.stage || '', start_date: p.start_date || '', end_date: p.end_date || '', budget: p.budget ?? '', currency: p.currency, notes: p.notes || '' }); setEditId(p.id); setOpen(true); }}>Edit</button>
                <button className="btn-danger" onClick={() => remove(p.id)}>Delete</button>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="sub">No projects yet. Add your first one.</p>}
      </div>

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
              <div><label>Budget / expected amount</label><input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
              <div><label>Currency</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD ($)</option><option value="BDT">BDT (৳)</option>
                </select></div>
            </div>
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
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
