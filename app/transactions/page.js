'use client';
import { useEffect, useState, useMemo } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabase';
import { money, TX_TYPES, INFLOW } from '../../lib/format';

const today = () => new Date().toISOString().slice(0, 10);
const empty = () => ({
  tx_date: today(), type: 'deposit', amount: '', currency: 'USD', usd_rate: '',
  fee: '0', account_id: '', project_id: '', source: '', destination: '', notes: '',
});

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [fType, setFType] = useState('');
  const [fAccount, setFAccount] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    const [t, a, p] = await Promise.all([
      supabase.from('transactions').select('*').order('tx_date', { ascending: false }),
      supabase.from('accounts').select('id,name'),
      supabase.from('projects').select('id,name'),
    ]);
    setRows(t.data || []); setAccounts(a.data || []); setProjects(p.data || []);
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => rows.filter((r) =>
    (!fType || r.type === fType) &&
    (!fAccount || r.account_id === fAccount) &&
    (!search || [r.notes, r.source, r.destination].join(' ').toLowerCase().includes(search.toLowerCase()))
  ), [rows, fType, fAccount, search]);

  const nameOf = (list, id) => list.find((x) => x.id === id)?.name || '-';

  async function save(e) {
    e.preventDefault(); setError('');
    const payload = {
      ...form,
      amount: Number(form.amount),
      fee: Number(form.fee || 0),
      usd_rate: form.usd_rate === '' ? null : Number(form.usd_rate),
      account_id: form.account_id || null,
      project_id: form.project_id || null,
    };
    const q = editId ? supabase.from('transactions').update(payload).eq('id', editId) : supabase.from('transactions').insert(payload);
    const { error } = await q;
    if (error) return setError(error.message);
    setOpen(false); setForm(empty()); setEditId(null); load();
  }

  async function remove(id) {
    if (!confirm('Delete this transaction?')) return;
    await supabase.from('transactions').delete().eq('id', id);
    load();
  }

  function edit(r) {
    setForm({
      tx_date: r.tx_date, type: r.type, amount: String(r.amount), currency: r.currency,
      usd_rate: r.usd_rate ?? '', fee: String(r.fee || 0), account_id: r.account_id || '',
      project_id: r.project_id || '', source: r.source || '', destination: r.destination || '', notes: r.notes || '',
    });
    setEditId(r.id); setOpen(true);
  }

  function exportCsv() {
    const head = ['date', 'type', 'amount', 'currency', 'usd_rate', 'fee', 'account', 'project', 'from', 'to', 'notes'];
    const lines = shown.map((r) => [r.tx_date, r.type, r.amount, r.currency, r.usd_rate ?? '', r.fee, nameOf(accounts, r.account_id), nameOf(projects, r.project_id), r.source || '', r.destination || '', (r.notes || '').replace(/\n/g, ' ')]
      .map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','));
    const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'transactions.csv'; a.click();
  }

  return (
    <AppShell>
      <div className="header-row">
        <div><h1>Transactions</h1><p className="sub" style={{ marginBottom: 0 }}>Deposits, withdrawals, payments, savings and expenses.</p></div>
        <div className="row" style={{ maxWidth: 320 }}>
          <button className="btn-ghost" onClick={exportCsv}>Export CSV</button>
          <button className="btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }}>+ New entry</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <div><label style={{ marginTop: 0 }}>Type</label>
            <select value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="">All</option>
              {Object.entries(TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label style={{ marginTop: 0 }}>Account</label>
            <select value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
              <option value="">All</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select></div>
          <div><label style={{ marginTop: 0 }}>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="notes, from, to" /></div>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Account</th><th>Project</th><th>From → To</th><th>Amount</th><th>Fee</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{r.tx_date}</td>
                <td><span className="badge">{TX_TYPES[r.type]}</span></td>
                <td>{nameOf(accounts, r.account_id)}</td>
                <td>{nameOf(projects, r.project_id)}</td>
                <td>{(r.source || '-') + ' → ' + (r.destination || '-')}</td>
                <td className={INFLOW.includes(r.type) ? 'green' : 'red'}>{money(r.amount, r.currency)}</td>
                <td>{Number(r.fee) ? money(r.fee, r.currency) : '-'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn-ghost" style={{ padding: '4px 10px', marginRight: 6 }} onClick={() => edit(r)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={8} className="sub">No transactions found.</td></tr>}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{editId ? 'Edit entry' : 'New entry'}</h2>
            <div className="row">
              <div><label>Date</label><input type="date" value={form.tx_date} onChange={(e) => setForm({ ...form, tx_date: e.target.value })} required /></div>
              <div><label>Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(TX_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
            </div>
            <div className="row">
              <div><label>Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><label>Currency</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD ($)</option><option value="BDT">BDT (৳)</option>
                </select></div>
            </div>
            <div className="row">
              <div><label>BDT per 1 USD (optional)</label><input type="number" step="0.0001" value={form.usd_rate} onChange={(e) => setForm({ ...form, usd_rate: e.target.value })} /></div>
              <div><label>Fee / charge</label><input type="number" step="0.01" min="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Account</label>
                <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
                  <option value="">None</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select></div>
              <div><label>Project</label>
                <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">None</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>
            </div>
            <div className="row">
              <div><label>Money came from</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              <div><label>Money went to</label><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
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
