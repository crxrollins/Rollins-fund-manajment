'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const links = [
  ['/dashboard', 'Dashboard'],
  ['/accounts', 'Accounts'],
  ['/transactions', 'Transactions'],
  ['/projects', 'Projects'],
];

export default function AppShell({ children }) {
  const path = usePathname();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = '/login';
      else { setEmail(data.session.user.email); setReady(true); }
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  if (!ready) return <div className="container"><p className="sub">Loading...</p></div>;

  return (
    <>
      <div className="nav">
        <span className="logo">Rolence Fund</span>
        {links.map(([href, label]) => (
          <Link key={href} href={href} className={'link ' + (path === href ? 'active' : '')}>{label}</Link>
        ))}
        <span className="spacer" />
        <span className="sub" style={{ margin: '0 10px 0 0', fontSize: 13 }}>{email}</span>
        <button className="btn-ghost" onClick={logout}>Log out</button>
      </div>
      <div className="container">{children}</div>
    </>
  );
}
