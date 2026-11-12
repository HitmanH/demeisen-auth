/* Demeisen Auth (browser) v1.0.0 — sign-in for single-page apps with an OpenID Connect provider
   (AWS Cognito hosted sign-in by default), using the authorization-code flow with PKCE and a public client.
   Plain script, no build step: defines window.DemeisenAuth. Tokens are kept in sessionStorage (per tab).

   const auth = DemeisenAuth({ authDomain: 'x.auth.eu-west-2.amazoncognito.com', clientId: '...' });
   await auth.finishSignIn();            // on page load: completes a sign-in redirect if there is one
   if (!auth.idToken()) auth.signIn();   // send the person to the sign-in page
   fetch('/api', { headers: { authorization: 'Bearer ' + auth.idToken() } });
   auth.signOut();

   Options: authDomain, clientId, scope ('openid email'), storageKey ('demeisen-id-token'),
   redirectUri (default: site root), and for non-Cognito providers authorizeUrl / tokenUrl / logoutUrl. */
(function (root) {
  'use strict';
  const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const randomStr = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
  const claims = t => JSON.parse(decodeURIComponent(escape(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));

  root.DemeisenAuth = function (o) {
    const key = o.storageKey || 'demeisen-id-token', pkceKey = key + ':pkce', scope = o.scope || 'openid email';
    const redirectUri = () => o.redirectUri || location.origin + '/';
    const url = (name, path) => o[name] || `https://${o.authDomain}${path}`;

    function idToken() {
      const t = sessionStorage.getItem(key);
      try { return t && claims(t).exp * 1000 > Date.now() + 30000 ? t : null; } catch (e) { return null; }
    }
    // Remembers the in-page location (hash) so the person returns to where they were.
    async function signIn() {
      const verifier = randomStr(), state = randomStr();
      sessionStorage.setItem(pkceKey, JSON.stringify({ verifier, state, hash: location.hash }));
      const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
      location.assign(url('authorizeUrl', '/oauth2/authorize') + '?' + new URLSearchParams({ response_type: 'code', client_id: o.clientId,
        redirect_uri: redirectUri(), scope, state, code_challenge_method: 'S256', code_challenge: challenge }));
    }
    // Returns true if this page load completed a sign-in; throws if the response can't be trusted.
    async function finishSignIn() {
      const q = new URLSearchParams(location.search), code = q.get('code');
      if (!code) return false;
      const saved = JSON.parse(sessionStorage.getItem(pkceKey) || '{}');
      sessionStorage.removeItem(pkceKey);
      history.replaceState(null, '', new URL(redirectUri()).pathname + (saved.hash || ''));
      if (q.get('state') !== saved.state) throw new Error('Sign-in could not be verified. Please try again.');
      const r = await fetch(url('tokenUrl', '/oauth2/token'), { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', client_id: o.clientId, code, redirect_uri: redirectUri(), code_verifier: saved.verifier }) });
      if (!r.ok) throw new Error('Sign-in failed. Please try again.');
      sessionStorage.setItem(key, (await r.json()).id_token);
      return true;
    }
    function forget() { sessionStorage.removeItem(key); }
    function signOut() {
      forget();
      location.assign(url('logoutUrl', '/logout') + '?' + new URLSearchParams({ client_id: o.clientId, logout_uri: redirectUri() }));
    }
    function email() { const t = idToken(); return t ? claims(t).email || null : null; }
    return { idToken, signIn, finishSignIn, signOut, forget, email, claims };
  };
})(window);
