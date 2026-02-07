import { useEffect, useState } from 'react';

export function SignIn() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const [user, setUser] = useState<{ id: string; email: string; display_name?: string | null } | null>(null);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  useEffect(() => {
    fetch('/api/whoami', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user?.display_name) setNameInput(user.display_name);
  }, [user]);

  const redirectToSignIn = () => {
    const signInUrl = `${origin}/_cf_access/sign_in?redirect_url=${encodeURIComponent(window.location.href)}`;
    window.location.href = signInUrl;
  };

  const signOut = () => {
    const logoutUrl = `${origin}/cdn-cgi/access/logout?redirect=${encodeURIComponent(window.location.href)}`;
    window.location.href = logoutUrl;
  };

  const saveDisplayName = async () => {
    const n = nameInput.trim();
    if (!n) return;
    const res = await fetch('/api/user/display-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ display_name: n }),
    });
    if (res.ok) {
      setUser(prev => prev ? { ...prev, display_name: n } : prev);
      setEditing(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={redirectToSignIn}
          className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm text-white/90">
        {user.display_name ? (
          <span>Hi, <strong>{user.display_name}</strong></span>
        ) : (
          <span>{user.email}</span>
        )}
      </div>
      {user.display_name ? (
        <button
          onClick={signOut}
          className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 border border-white/10"
        >
          Sign out
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                className="text-sm px-2 py-1 rounded-md bg-white/10 text-white placeholder:text-white/60"
                placeholder="Display name"
              />
              <button onClick={saveDisplayName} className="text-sm px-3 py-1.5 rounded-md bg-green-600 text-white">Save</button>
              <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 border border-white/10">Cancel</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10">Set name</button>
          )}
        </div>
      )}
    </div>
  );
}

export default SignIn;
