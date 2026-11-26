'use client';
import { useEffect, useState, useMemo } from 'react';
import AppShell from '../../components/AppShell';
import { supabase } from '../../lib/supabase';
import { money, toUSD, INFLOW, OUTFLOW } from '../../lib/format';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#5b8cff', '#7c5cff', '#2ecc8f', '#ffb84d', '#ff5d73', '#4dd0e1'];

export default function Dashboard() {
  const [tx, setTx] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState(120);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [t, a, p, prof] = await Promise.all([
        supabase.from('transactions').select('*').order('tx_date', { ascending: false }),
        supabase.from('accounts').select('*'),
        supabase.from('projects').select('*'),
        supabase.from('profiles').select('preferred_currency').maybeSingle(),
      ]);
      setTx(t.data || []); setAccounts(a.data || []); setProjects(p.data || []);
      if (prof.data?.preferred_currency) setCurrency(prof.data.preferred_currency);
      setLoading(false);
    }
    load();
  }, []);

  const conv = (usd) => (currency === 'USD' ? usd : usd * rate);

  const stats = useMemo(() => {
    let invested = 0, withdrawn = 0, received = 0, savings = 0, expense = 0, income = 0, fees = 0;
    tx.forEach((t) => {
      const v = toUSD(t, rate);
      fees += t.currency === 'USD' ? Number(t.fee || 0) : Number(t.fee || 0) / (Number(t.usd_rate) || rate);
      if (t.type === 'deposit') invested += v;
      if (t.type === 'withdraw') withdrawn += v;
      if (t.type === 'payment_received') received += v;
      if (t.type === 'savings') savings += v;
      if (t.type === 'expense') expense += v;
      if (t.type === 'income') income += v;
    });
    const net = withdrawn + received + income - invested - expense - fees;
    return { invested, withdrawn, received, savings, expense, income, fees, net };
  }, [tx, rate]);

  const monthly = useMemo(() => {
    const map = {};
    tx.forEach((t) => {
      const m = (t.tx_date || '').slice(0, 7);
      if (!m) return;
      map[m] = map[m] || { month: m, in: 0, out: 0 };
      const v = toUSD(t, rate);
      if (INFLOW.includes(t.type)) map[m].in += v;
      if (OUTFLOW.includes(t.type)) map[m].out += v;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12)
      .map((r) => ({ ...r, in: +conv(r.in).toFixed(2), out: +conv(r.out).toFixed(2) }));
  }, [tx, rate, currency]);

  const byAccount = useMemo(() => {
    const map = {};
    tx.filter((t) => t.type === 'deposit').forEach((t) => {
      const name = accounts.find((a) => a.id === t.account_id)?.name || 'Unassigned';
      map[name] = (map[name] || 0) + toUSD(t, rate);
    });
    return Object.entries(map).map(([name, v]) => ({ name, value: +conv(v).toFixed(2) }));
  }, [tx, accounts, rate, currency]);

  const activeProjects = projects.filter((p) => p.status === 'ongoing').length;

  if (loading) return <AppShell><p className="sub">Loading...</p></AppShell>;

  return (
    <AppShell>
      <div className="header-row">
        <div>
          <h1>Dashboard</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Your complete money picture, in one place.</p>
        </div>
        <div className="row" style={{ maxWidth: 360 }}>
          <div>
            <label style={{ marginTop: 0 }}>Show totals in</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">US Dollar ($)</option>
              <option value="BDT">Taka (৳)</option>
            </select>
          </div>
          <div>
            <label style={{ marginTop: 0 }}>BDT per 1 USD</label>
            <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value) || 1)} />
          </div>
        </div>
      </div>

      <div className="grid grid-4">
        <div className="card"><div className="stat-label">Total invested</div><div className="stat-value">{money(conv(stats.invested), currency)}</div></div>
        <div className="card"><div className="stat-label">Total withdrawn</div><div className="stat-value">{money(conv(stats.withdrawn), currency)}</div></div>
        <div className="card"><div className="stat-label">Payments received</div><div className="stat-value green">{money(conv(stats.received), currency)}</div></div>
        <div className="card"><div className="stat-label">Savings kept</div><div className="stat-value amber">{money(conv(stats.savings), currency)}</div></div>
        <div className="card"><div className="stat-label">Total expenses</div><div className="stat-value red">{money(conv(stats.expense), currency)}</div></div>
        <div className="card"><div className="stat-label">Total fees paid</div><div className="stat-value">{money(conv(stats.fees), currency)}</div></div>
        <div className="card"><div className="stat-label">Net result</div><div className={'stat-value ' + (stats.net >= 0 ? 'green' : 'red')}>{money(conv(stats.net), currency)}</div></div>
        <div className="card"><div className="stat-label">Active projects</div><div className="stat-value">{activeProjects}</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Money in vs. out (monthly)</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid stroke="#263056" strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#8f9bc0" fontSize={12} />
                <YAxis stroke="#8f9bc0" fontSize={12} />
                <Tooltip contentStyle={{ background: '#131a30', border: '1px solid #263056', borderRadius: 10 }} />
                <Bar dataKey="in" name="In" fill="#2ecc8f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="out" name="Out" fill="#ff5d73" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <h2>Where your investment went</h2>
          <div style={{ height: 280 }}>
            {byAccount.length === 0 ? <p className="sub">No deposits yet.</p> : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byAccount} dataKey="value" nameKey="name" outerRadius={100} label>
                    {byAccount.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#131a30', border: '1px solid #263056', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
