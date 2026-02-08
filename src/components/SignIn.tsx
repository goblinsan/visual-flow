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

  // Extract first name from display name or email
  const getFirstName = (): string => {
    if (user?.display_name) {
      return user.display_name.split(' ')[0];
    }
    if (user?.email) {
      return user.email.split('@')[0].split('.')[0];
    }
    return 'User';
  };

  // Still loading — show nothing to avoid flash
  if (loading) return null;

  // Not authenticated - show sign in button
  if (!user || !user.authenticated || !user.id) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={signIn}
          className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10"
        >
          Sign in
        </button>
      </div>
    );
  }

  const displayLabel = user.display_name || user.email || 'User';
  const firstName = getFirstName();

  return (
    <div className="flex items-center gap-3">
      {/* Avatar circle */}
      <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-semibold text-white/90 uppercase select-none">
        {firstName.charAt(0)}
      </div>

      <div className="text-sm text-white/90">
        <span>Hi, <strong>{firstName}</strong></span>
      </div>

      <button
        onClick={signOut}
        className="text-sm px-3 py-1.5 rounded-md transition-colors duration-150 text-white/90 hover:bg-white/10 border border-white/10"
      >
        Sign out
      </button>

      {!user.display_name && (
        <button
          onClick={() => setEditing(true)}
          className="text-xs px-2 py-1 rounded-md transition-colors duration-150 text-white/70 hover:bg-white/10"
        >
          Set display name
        </button>
      )}

      {/* Display name editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Set Display Name</h3>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveDisplayName()}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              placeholder="Your name"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={saveDisplayName}
                className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignIn;
