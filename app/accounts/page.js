'use client';
import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabase';
import { money, toUSD } from '../../lib/format';

const TYPES = ['bank', 'stock', 'crypto', 'freelance', 'savings', 'mobile_banking', 'other'];
const empty = { name: '', type: 'bank', currency: 'USD', notes: '' };

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [tx, setTx] = useState([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const [a, t] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('transactions').select('*'),
    ]);
    setAccounts(a.data || []); setTx(t.data || []);
  }
  useEffect(() => { load(); }, []);

  function balanceOf(acc) {
    let b = 0;
    tx.filter((t) => t.account_id === acc.id).forEach((t) => {
      const v = t.currency === acc.currency ? Number(t.amount) : acc.currency === 'USD' ? toUSD(t) : Number(t.amount) * (Number(t.usd_rate) || 120);
      if (['deposit', 'savings', 'income', 'payment_received'].includes(t.type)) b += v;
      if (['withdraw', 'expense'].includes(t.type)) b -= v;
      b -= Number(t.fee || 0);
    });
    return b;
  }

  async function save(e) {
    e.preventDefault(); setError('');
    const q = editId ? supabase.from('accounts').update(form).eq('id', editId) : supabase.from('accounts').insert(form);
    const { error } = await q;
    if (error) return setError(error.message);
    setOpen(false); setForm(empty); setEditId(null); load();
  }

  async function remove(id) {
    if (!confirm('Delete this account? Its transactions will stay but lose the account link.')) return;
    await supabase.from('accounts').delete().eq('id', id);
    load();
  }

  return (
    <AppShell>
      <div className="header-row">
        <div><h1>Accounts</h1><p className="sub" style={{ marginBottom: 0 }}>Every bank, platform and wallet you use.</p></div>
        <button className="btn" onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}>+ New account</button>
      </div>

      <div className="grid grid-4">
        {accounts.map((a) => (
          <div className="card" key={a.id}>
            <span className="badge">{a.type.replace('_', ' ')}</span>
            <h2 style={{ marginTop: 10, marginBottom: 4 }}>{a.name}</h2>
            <div className="stat-label">Balance</div>
            <div className="stat-value">{money(balanceOf(a), a.currency)}</div>
            {a.notes && <p className="sub" style={{ marginTop: 8, marginBottom: 0, fontSize: 13 }}>{a.notes}</p>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn-ghost" onClick={() => { setForm({ name: a.name, type: a.type, currency: a.currency, notes: a.notes || '' }); setEditId(a.id); setOpen(true); }}>Edit</button>
              <button className="btn-danger" onClick={() => remove(a.id)}>Delete</button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && <p className="sub">No accounts yet. Add your first one.</p>}
      </div>

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{editId ? 'Edit account' : 'New account'}</h2>
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <div className="row">
              <div><label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select></div>
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
