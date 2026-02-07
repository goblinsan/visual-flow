import React from 'react';

export function SignIn() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const redirectToSignIn = () => {
    // Cloudflare Access sign-in
    const signInUrl = `${origin}/_cf_access/sign_in?redirect_url=${encodeURIComponent(window.location.href)}`;
    window.location.href = signInUrl;
  };

  const signOut = () => {
    // Cloudflare Access sign-out
    const logoutUrl = `${origin}/cdn-cgi/access/logout?redirect=${encodeURIComponent(window.location.href)}`;
    window.location.href = logoutUrl;
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={redirectToSignIn}
        className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
        title="Sign in via Cloudflare Access (Google / GitHub / Apple)"
      >
        Sign in
      </button>
      <button
        onClick={signOut}
        className="px-3 py-1 rounded border text-sm"
        title="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}

export default SignIn;
