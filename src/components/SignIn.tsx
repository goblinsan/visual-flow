import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type UserInfo = { id: string | null; email: string | null; display_name?: string | null; authenticated?: boolean };

export function SignIn() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  // Fetch current user identity via the ApiClient (which already handles
  // the correct base URL and auth headers for both dev and production).
  useEffect(() => {
    apiClient.whoami().then(({ data }) => {
      if (data) setUser(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.display_name) setNameInput(user.display_name);
  }, [user]);

  const signIn = () => {
    const origin = window.location.origin;
    window.location.href = `${origin}/_cf_access/sign_in?redirect_url=${encodeURIComponent(window.location.href)}`;
  };

  const signOut = () => {
    const origin = window.location.origin;
    window.location.href = `${origin}/cdn-cgi/access/logout?redirect=${encodeURIComponent(window.location.href)}`;
  };

  const saveDisplayName = async () => {
    const n = nameInput.trim();
    if (!n) return;
    const { data } = await apiClient.updateDisplayName(n);
    if (data?.ok) {
      setUser(prev => prev ? { ...prev, display_name: n } : prev);
      setEditing(false);
    }
  };

  // Still loading — show nothing to avoid flash
  if (loading) return null;

  // Not authenticated - show sign in button
  if (!user || !user.authenticated || !user.id) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={signIn}
          className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white bg-blue-600 hover:bg-blue-500"
        >
          Sign in
        </button>
      </div>
    );
  }

  const displayLabel = user.display_name || user.email || 'User';

  return (
    <div className="flex items-center gap-3">
      {/* Avatar circle */}
      <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold text-white/90 uppercase select-none">
        {displayLabel.charAt(0)}
      </div>

      <div className="text-sm text-white/90">
        {user.display_name ? (
          <span>{user.display_name}</span>
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
                onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
                className="text-sm px-2 py-1 rounded-md bg-white/10 text-white placeholder:text-white/60 border border-white/10"
                placeholder="Display name"
                autoFocus
              />
              <button onClick={saveDisplayName} className="text-sm px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-500 transition-colors">Save</button>
              <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 border border-white/10">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10">Set name</button>
              <button onClick={signOut} className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 border border-white/10">Sign out</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SignIn;
