'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import SakuraScene from '../../components/SakuraScene';

export default function Login() {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name } },
      });
      if (error) setError(error.message);
      else if (data.session) window.location.href = '/dashboard';
      else setInfo('Account created. Check your email to confirm, then log in.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else window.location.href = '/dashboard';
    }
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <SakuraScene count={60} />
      <div className="auth-box">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span className="brand-dot" /> <b style={{ fontSize: 20 }}>Rollins Fund</b>
          </Link>
        </div>
        <div className="card">
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="sub">{mode === 'login' ? 'Log in to see your money picture.' : 'Your own private space to track everything.'}</p>
          <form onSubmit={submit}>
            {mode === 'signup' && (<>
              <label>Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </>)}
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Password</label>
            <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div style={{ marginTop: 18 }}>
              <button className="btn" style={{ width: '100%' }} disabled={busy}>
                {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
              </button>
            </div>
            {error && <p className="error">{error}</p>}
            {info && <p className="ok">{info}</p>}
          </form>
          <p className="sub" style={{ marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <a href="#" style={{ color: 'var(--red)', fontWeight: 700 }} onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }}>
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
