'use client';
import { useEffect, useState, useMemo } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabase';
import { money } from '../../lib/format';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const MARKETS = { forex: 'Currency (Forex)', gold: 'Gold', crypto: 'Crypto', stock: 'Stock', index: 'Index', other: 'Other' };
const RESULTS = { open: 'Open', profit: 'Profit', loss: 'Loss', breakeven: 'Breakeven' };

const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const empty = () => ({
  opened_at: nowLocal(), instrument: '', market: 'forex', direction: 'buy', amount: '', currency: 'USD',
  leverage: '', duration_minutes: '', entry_price: '', exit_price: '', strategy: '',
  result: 'open', pnl: '', reason: '', lesson: '',
});

function fmtDuration(m) {
  if (m == null || m === '') return '-';
  const n = Number(m);
  if (n < 60) return n + ' min';
  const h = Math.floor(n / 60), r = n % 60;
  return h + 'h' + (r ? ' ' + r + 'm' : '');
}

export default function Trades() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty());
  const [editId, setEditId] = useState(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [fMarket, setFMarket] = useState('');
  const [fResult, setFResult] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState(null);

  async function load() {
    const { data } = await supabase.from('trades').select('*').order('opened_at', { ascending: false });
    setRows(data || []);
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => rows.filter((r) =>
    (!fMarket || r.market === fMarket) &&
    (!fResult || r.result === fResult) &&
    (!search || [r.instrument, r.strategy, r.reason, r.lesson].join(' ').toLowerCase().includes(search.toLowerCase()))
  ), [rows, fMarket, fResult, search]);

  const stats = useMemo(() => {
    const closed = rows.filter((r) => r.result !== 'open');
    const wins = closed.filter((r) => r.result === 'profit').length;
    const losses = closed.filter((r) => r.result === 'loss').length;
    const total = rows.reduce((s, r) => s + Number(r.pnl || 0), 0);
    const winRate = closed.length ? (wins / closed.length) * 100 : 0;
    const grossWin = rows.filter((r) => Number(r.pnl) > 0).reduce((s, r) => s + Number(r.pnl), 0);
    const grossLoss = Math.abs(rows.filter((r) => Number(r.pnl) < 0).reduce((s, r) => s + Number(r.pnl), 0));
    return { total, wins, losses, winRate, trades: rows.length, pf: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : 0 };
  }, [rows]);

  const curve = useMemo(() => {
    let sum = 0;
    return [...rows].sort((a, b) => new Date(a.opened_at) - new Date(b.opened_at)).map((r, i) => {
      sum += Number(r.pnl || 0);
      return { n: i + 1, total: +sum.toFixed(2) };
    });
  }, [rows]);

  const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

  async function save(e) {
    e.preventDefault(); setError('');
    let pnl = Number(form.pnl || 0);
    if (form.result === 'loss' && pnl > 0) pnl = -pnl;
    if (form.result === 'profit' && pnl < 0) pnl = -pnl;
    if (form.result === 'breakeven' || form.result === 'open') pnl = form.result === 'open' ? 0 : pnl;
    const payload = {
      ...form,
      opened_at: new Date(form.opened_at).toISOString(),
      amount: Number(form.amount || 0),
      leverage: numOrNull(form.leverage),
      duration_minutes: numOrNull(form.duration_minutes),
      entry_price: numOrNull(form.entry_price),
      exit_price: numOrNull(form.exit_price),
      pnl,
    };
    const q = editId ? supabase.from('trades').update(payload).eq('id', editId) : supabase.from('trades').insert(payload);
    const { error } = await q;
    if (error) return setError(error.message);
    setOpen(false); setForm(empty()); setEditId(null); load();
  }

  async function remove(id) {
    if (!confirm('Delete this trade?')) return;
    await supabase.from('trades').delete().eq('id', id);
    load();
  }

  function edit(r) {
    const d = new Date(r.opened_at);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setForm({
      opened_at: d.toISOString().slice(0, 16), instrument: r.instrument, market: r.market, direction: r.direction,
      amount: String(r.amount ?? ''), currency: r.currency, leverage: r.leverage ?? '', duration_minutes: r.duration_minutes ?? '',
      entry_price: r.entry_price ?? '', exit_price: r.exit_price ?? '', strategy: r.strategy || '',
      result: r.result, pnl: String(r.pnl ?? ''), reason: r.reason || '', lesson: r.lesson || '',
    });
    setEditId(r.id); setView(null); setOpen(true);
  }

  const pnlClass = (v) => (Number(v) > 0 ? 'green' : Number(v) < 0 ? 'red' : '');

  return (
    <AppShell>
      <div className="header-row">
        <div><h1>Trading Journal</h1><p className="sub" style={{ marginBottom: 0 }}>Log every trade, and learn why it won or lost.</p></div>
        <button className="btn" onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }}>+ New trade</button>
      </div>

      <div className="grid grid-4">
        <div className="card"><div className="stat-label">Total trades</div><div className="stat-value">{stats.trades}</div></div>
        <div className="card"><div className="stat-label">Net profit / loss</div><div className={'stat-value ' + pnlClass(stats.total)}>{money(stats.total, 'USD')}</div></div>
        <div className="card"><div className="stat-label">Win rate</div><div className="stat-value">{stats.winRate.toFixed(1)}%</div></div>
        <div className="card"><div className="stat-label">Wins / Losses</div><div className="stat-value"><span className="green">{stats.wins}</span> / <span className="red">{stats.losses}</span></div></div>
        <div className="card"><div className="stat-label">Profit factor</div><div className="stat-value">{stats.pf === Infinity ? '∞' : stats.pf.toFixed(2)}</div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Profit / loss curve</h2>
        <div style={{ height: 220 }}>
          {curve.length === 0 ? <p className="sub">No trades yet.</p> : (
            <ResponsiveContainer>
              <LineChart data={curve}>
                <CartesianGrid stroke="#263056" strokeDasharray="3 3" />
                <XAxis dataKey="n" stroke="#8f9bc0" fontSize={12} />
                <YAxis stroke="#8f9bc0" fontSize={12} />
                <Tooltip contentStyle={{ background: '#131a30', border: '1px solid #263056', borderRadius: 10 }} />
                <Line type="monotone" dataKey="total" stroke="#5b8cff" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16, marginBottom: 16 }}>
        <div className="row">
          <div><label style={{ marginTop: 0 }}>Market</label>
            <select value={fMarket} onChange={(e) => setFMarket(e.target.value)}>
              <option value="">All</option>
              {Object.entries(MARKETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label style={{ marginTop: 0 }}>Result</label>
            <select value={fResult} onChange={(e) => setFResult(e.target.value)}>
              <option value="">All</option>
              {Object.entries(RESULTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div><label style={{ marginTop: 0 }}>Search</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="instrument, strategy, reason" /></div>
        </div>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Instrument</th><th>Side</th><th>Amount</th><th>Leverage</th><th>Held</th><th>Strategy</th><th>Result</th><th>P/L</th><th></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.opened_at).toLocaleString()}</td>
                <td><b>{r.instrument}</b><div className="sub" style={{ marginBottom: 0, fontSize: 12 }}>{MARKETS[r.market]}</div></td>
                <td><span className={'badge ' + (r.direction === 'buy' ? 'ongoing' : 'paused')}>{r.direction}</span></td>
                <td>{money(r.amount, r.currency)}</td>
                <td>{r.leverage ? r.leverage + 'x' : '-'}</td>
                <td>{fmtDuration(r.duration_minutes)}</td>
                <td>{r.strategy || '-'}</td>
                <td><span className={'badge ' + (r.result === 'profit' ? 'ongoing' : r.result === 'loss' ? 'paused' : '')}>{RESULTS[r.result]}</span></td>
                <td className={pnlClass(r.pnl)}><b>{money(r.pnl, r.currency)}</b></td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn-ghost" style={{ padding: '4px 10px', marginRight: 6 }} onClick={() => setView(r)}>Details</button>
                  <button className="btn-ghost" style={{ padding: '4px 10px', marginRight: 6 }} onClick={() => edit(r)}>Edit</button>
                  <button className="btn-danger" onClick={() => remove(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={10} className="sub">No trades found.</td></tr>}
          </tbody>
        </table>
      </div>

      {view && (
        <div className="modal-bg" onClick={() => setView(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h2>{view.instrument} ({view.direction})</h2>
            <p className="sub">{new Date(view.opened_at).toLocaleString()} · {MARKETS[view.market]} · held {fmtDuration(view.duration_minutes)}</p>
            <div className="row">
              <div><div className="stat-label">Entry</div><b>{view.entry_price ?? '-'}</b></div>
              <div><div className="stat-label">Exit</div><b>{view.exit_price ?? '-'}</b></div>
              <div><div className="stat-label">P/L</div><b className={pnlClass(view.pnl)}>{money(view.pnl, view.currency)}</b></div>
            </div>
            <label>Strategy / basis of the trade</label>
            <p>{view.strategy || '-'}</p>
            <label>Why it ended in {RESULTS[view.result].toLowerCase()}</label>
            <p>{view.reason || '-'}</p>
            <label>Lesson learned</label>
            <p>{view.lesson || '-'}</p>
            <div className="row" style={{ marginTop: 18 }}>
              <button className="btn" onClick={() => edit(view)}>Edit</button>
              <button className="btn-ghost" onClick={() => setView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2>{editId ? 'Edit trade' : 'New trade'}</h2>
            <div className="row">
              <div><label>Date and time</label><input type="datetime-local" value={form.opened_at} onChange={(e) => setForm({ ...form, opened_at: e.target.value })} required /></div>
              <div><label>Instrument (e.g. XAUUSD, EURUSD, BTCUSD)</label><input value={form.instrument} onChange={(e) => setForm({ ...form, instrument: e.target.value })} required /></div>
            </div>
            <div className="row">
              <div><label>Market</label>
                <select value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}>
                  {Object.entries(MARKETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label>Direction</label>
                <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                  <option value="buy">Buy</option><option value="sell">Sell</option>
                </select></div>
            </div>
            <div className="row">
              <div><label>Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
              <div><label>Currency</label>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD ($)</option><option value="BDT">BDT (৳)</option>
                </select></div>
              <div><label>Leverage (e.g. 100)</label><input type="number" step="0.01" min="0" value={form.leverage} onChange={(e) => setForm({ ...form, leverage: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>Held for (minutes)</label><input type="number" min="0" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></div>
              <div><label>Entry price</label><input type="number" step="any" value={form.entry_price} onChange={(e) => setForm({ ...form, entry_price: e.target.value })} /></div>
              <div><label>Exit price</label><input type="number" step="any" value={form.exit_price} onChange={(e) => setForm({ ...form, exit_price: e.target.value })} /></div>
            </div>
            <label>Strategy / what you based this trade on</label>
            <input value={form.strategy} onChange={(e) => setForm({ ...form, strategy: e.target.value })} placeholder="e.g. support bounce, news, breakout" />
            <div className="row">
              <div><label>Result</label>
                <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
                  {Object.entries(RESULTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></div>
              <div><label>Profit / loss amount</label><input type="number" step="0.01" value={form.pnl} onChange={(e) => setForm({ ...form, pnl: e.target.value })} /></div>
            </div>
            <label>Why did it win or lose?</label>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <label>Lesson learned</label>
            <textarea rows={2} value={form.lesson} onChange={(e) => setForm({ ...form, lesson: e.target.value })} />
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
