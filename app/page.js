'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import SakuraScene from '../components/SakuraScene';

const FEATURES = [
  ['01', 'Every transaction', 'Log deposits, withdrawals, payments received and savings in USD or Taka.'],
  ['02', 'Investments at a glance', 'See where your money went and what each platform holds right now.'],
  ['03', 'Project tracking', 'Stage, status, spending, fees, profit or loss, all in one card.'],
  ['04', 'Screenshot proof', 'Attach screenshots to every entry so you always remember why.'],
  ['05', 'Private by design', 'Your account, your data. Nobody else can see your records.'],
  ['06', 'Clear dashboard', 'Totals, monthly charts and net result, updated as you add entries.'],
];

export default function Landing() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div>
      <section className="hero">
        <SakuraScene count={90} />
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-dot" /> <b style={{ fontSize: 18 }}>Rollins Fund</b>
          </div>
          <Link href={signedIn ? '/dashboard' : '/login'} className="btn-ghost">{signedIn ? 'Open dashboard' : 'Log in'}</Link>
        </div>
        <div className="hero-inner">
          <h1>Master your money. <span>Calmly and clearly.</span></h1>
          <p className="lead">Track every transaction, investment and project in one beautiful place. Add proof, see profit and loss, and always know where you stand.</p>
          <div className="hero-actions">
            <Link href={signedIn ? '/dashboard' : '/login'} className="btn btn-big">{signedIn ? 'Go to dashboard' : 'Get started free'}</Link>
            <a href="#features" className="btn-ghost btn-big" style={{ padding: '14px 26px', borderRadius: 12 }}>See features</a>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <h2>Everything you need, nothing you don't</h2>
        <p className="sub">Built for people who invest, trade and take on projects.</p>
        <div className="grid grid-4">
          {FEATURES.map(([num, title, text]) => (
            <div className="card" key={title}>
              <div className="stat-label" style={{ color: 'var(--red)' }}>{num}</div>
              <h2 style={{ margin: '6px 0' }}>{title}</h2>
              <p className="sub" style={{ marginBottom: 0, fontSize: 14 }}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="footer">Rollins Fund Management. Your records, your control.</div>
    </div>
  );
}
