'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';

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
    <div className="auth-box">
      <div className="card">
        <h1>Rolence Fund Management</h1>
        <p className="sub">{mode === 'login' ? 'Welcome back. Log in to continue.' : 'Create your own private account.'}</p>
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
          <a href="#" style={{ color: 'var(--brand)' }} onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }}>
            {mode === 'login' ? 'Create an account' : 'Log in'}
          </a>
        </p>
      </div>
    </div>
  );
}
