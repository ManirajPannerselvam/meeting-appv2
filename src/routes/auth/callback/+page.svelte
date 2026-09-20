<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  
  let status = 'Verifying your login...';
  let errorMsg = '';

  onMount(async () => {
    try {
      // 1. Prevent double exchange - if session exists, go directly
      const { data: existing } = await supabase.auth.getSession();
      if (existing?.session) {
        status = 'Already logged in, redirecting...';
        window.location.replace('/chat');
        return;
      }

      // 2. Validate URL has auth code - security check
      const url = new URL(window.location.href);
      const hasCode = url.searchParams.has('code') || window.location.hash.includes('access_token');
      
      if (!hasCode) {
        errorMsg = 'Invalid or expired link. Please request new magic link.';
        setTimeout(() => window.location.replace('/login'), 2000);
        return;
      }

      // 3. Exchange code for session - core login
      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      
      if (error) {
        console.error('Auth exchange failed:', error.message);
        // Secure error - don't leak details to user
        if (error.message.toLowerCase().includes('expired')) {
          errorMsg = 'Link expired. Please request new link.';
        } else {
          errorMsg = 'Verification failed. Please try again.';
        }
        setTimeout(() => window.location.replace('/login'), 2500);
        return;
      }

      // 4. Success - Verify session created
      if (data?.session) {
        status = 'Login successful! Redirecting...';
        // Clean URL - remove code from address bar (security)
        window.history.replaceState({}, '', '/auth/callback');
        // Hard replace - faster & prevents back button to callback (for 50k scale)
        window.location.replace('/chat');
      } else {
        errorMsg = 'Session not created. Please try login again.';
        setTimeout(() => window.location.replace('/login'), 2000);
      }

    } catch (err) {
      console.error('Callback error:', err);
      errorMsg = 'Something went wrong. Redirecting to login...';
      setTimeout(() => window.location.replace('/login'), 2000);
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 p-4">
  <div class="bg-white p-8 rounded-xl shadow-md w-full max-w-sm text-center">
    {#if errorMsg}
      <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-red-600 text-xl">✕</span>
      </div>
      <h2 class="font-semibold text-gray-900">Verification Failed</h2>
      <p class="text-sm text-red-600 mt-2">{errorMsg}</p>
      <p class="text-xs text-gray-500 mt-3">Redirecting to login...</p>
    {:else}
      <div class="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <h2 class="font-semibold text-gray-900">{status}</h2>
      <p class="text-xs text-gray-500 mt-2">Please wait, this is secure...</p>
    {/if}
  </div>
</div>