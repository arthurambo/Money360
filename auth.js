/* ═══════════════════════════════════════════
   MONEY360 — auth.js
   • Tela de login / cadastro (Supabase Auth)
   • Login com e-mail e senha
   • Login com Google (OAuth)
   • Controle de sessão e logout
═══════════════════════════════════════════ */
'use strict';

/* ── CONFIGURAÇÃO DO SUPABASE ──────────────────────────────
   Substitua pelos dados do seu projeto em:
   https://app.supabase.com → seu projeto → Project Settings → API
   ─────────────────────────────────────────────────────── */
const SUPABASE_URL = 'https://rkkterzrriikricxwmzd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJra3Rlcnpycmlpa3JpY3h3bXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDI2NjksImV4cCI6MjA5NjUxODY2OX0.e8oZ1fMZEbVmQ31aPwDcq78k9t2Ypg3IZHr7QrHk6e8';

const sb = (window.supabase && window.supabase.createClient
            && !SUPABASE_URL.includes('SEU-PROJETO')
            && !SUPABASE_ANON_KEY.includes('SUA-CHAVE'))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

window._sb = sb;

document.addEventListener('DOMContentLoaded', () => {

  const q = id => document.getElementById(id);

  const authScreen = q('auth-screen');
  const appScreen  = q('app-screen');
  const painelLogin    = q('auth-login');
  const painelRegister = q('auth-register');

  function toast(msg) {
    if (window._mostrarToast) window._mostrarToast(msg);
  }

  function esconderLoading() {
    const el = document.getElementById('loading-screen');
    if (!el) return;
    el.classList.add('loading--done');
    setTimeout(() => {
      el.classList.add('loading--out');
      setTimeout(() => el.remove(), 320);
    }, 180);
  }

  function mostrarApp() {
    esconderLoading();
    authScreen.style.display = 'none';
    appScreen.style.display  = '';
    setTimeout(() => window._notif?.verificar(), 1500);
    setTimeout(() => window._verificarCobrancasAutomaticas?.(), 1500);
    setTimeout(() => window._verificarRecebimentosAutomaticos?.(), 1500);
  }

  function mostrarAuth() {
    esconderLoading();
    appScreen.style.display  = 'none';
    authScreen.style.display = '';
  }

  function mostrarPainel(nome) {
    painelLogin.classList.toggle('auth-panel--ativo', nome === 'login');
    painelRegister.classList.toggle('auth-panel--ativo', nome === 'register');
    clearErrors();
  }

  function showError(id, msg) {
    const el = q(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'flex';
  }

  function clearErrors() {
    ['login-error', 'reg-error'].forEach(id => {
      const el = q(id);
      if (el) el.style.display = 'none';
    });
  }

  /* ── Alternar entre painéis de login/cadastro ── */
  q('go-register')?.addEventListener('click', () => mostrarPainel('register'));
  q('go-login')?.addEventListener('click', () => mostrarPainel('login'));

  /* ── Modo local (sem login, usa apenas localStorage) ── */
  q('btn-modo-local')?.addEventListener('click', () => {
    const el = q('config-user-email');
    if (el) el.textContent = 'Modo local (sem login)';
    mostrarApp();
  });

  /* ── Mostrar/ocultar senha ── */
  document.querySelectorAll('.auth-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = q(btn.dataset.target);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.classList.toggle('auth-eye--ativo');
    });
  });

  /* ── Sessão ao carregar a página ── */
  async function iniciar() {
    if (!sb) {
      // Sem configuração do Supabase: mantém usuário na tela de login,
      // mas o app continua funcional via localStorage.
      mostrarAuth();
      return;
    }

    const { data } = await sb.auth.getSession();
    if (data?.session) {
      aplicarSessao(data.session);
      mostrarApp();
    } else {
      mostrarAuth();
    }

    sb.auth.onAuthStateChange((_event, session) => {
      if (session) {
        aplicarSessao(session);
        mostrarApp();
      } else {
        mostrarAuth();
      }
    });
  }

  const ADMIN_EMAILS = ['ambrosio.arthur@gmail.com', 'dracoforgegm@gmail.com'];

  function aplicarSessao(session) {
    const email = session?.user?.email || session?.user?.user_metadata?.email || '';
    const el = q('config-user-email');
    if (el) el.textContent = email || '—';
    const btnAdmin = q('btn-admin');
    if (btnAdmin) btnAdmin.style.display = ADMIN_EMAILS.includes(email) ? '' : 'none';
    window._sync?.carregarDoSupabase(session);
  }

  /* ── Login com e-mail e senha ── */
  let loginEmAndamento = false;
  async function handleLogin() {
    if (loginEmAndamento) return;
    const email    = (q('login-email')?.value || '').trim();
    const password = q('login-password')?.value || '';

    clearErrors();
    if (!email)               return showError('login-error', '⚠️ Digite seu e-mail.');
    if (!email.includes('@')) return showError('login-error', '⚠️ E-mail inválido.');
    if (!password)            return showError('login-error', '⚠️ Digite sua senha.');
    if (!sb)                  return showError('login-error', '⚠️ Login indisponível: configure o Supabase em auth.js.');

    loginEmAndamento = true;
    const btn = q('login-btn');
    const txtOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          showError('login-error', '❌ E-mail ou senha incorretos.');
        } else if (error.message.includes('Email not confirmed')) {
          showError('login-error', '⚠️ Confirme seu e-mail antes de entrar.');
        } else {
          showError('login-error', '❌ ' + error.message);
        }
        return;
      }
      aplicarSessao(data.session);
      toast('✅ Bem-vindo(a)!');
      mostrarApp();
    } catch (err) {
      showError('login-error', '⚠️ Não foi possível conectar. Verifique sua internet.');
    } finally {
      loginEmAndamento = false;
      btn.disabled = false;
      btn.innerHTML = txtOriginal;
    }
  }

  /* ── Cadastro com e-mail e senha ── */
  let registroEmAndamento = false;
  async function handleRegister() {
    if (registroEmAndamento) return;
    const email    = (q('reg-email')?.value || '').trim();
    const password = q('reg-password')?.value || '';
    const confirm  = q('reg-confirm')?.value || '';

    clearErrors();
    if (!email)               return showError('reg-error', '⚠️ Digite seu e-mail.');
    if (!email.includes('@')) return showError('reg-error', '⚠️ E-mail inválido.');
    if (!password)            return showError('reg-error', '⚠️ Crie uma senha.');
    if (password.length < 6)  return showError('reg-error', '⚠️ A senha deve ter ao menos 6 caracteres.');
    if (password !== confirm) return showError('reg-error', '❌ As senhas não coincidem.');
    if (!sb)                  return showError('reg-error', '⚠️ Cadastro indisponível: configure o Supabase em auth.js.');

    registroEmAndamento = true;
    const btn = q('register-btn');
    const txtOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = 'Criando conta...';

    try {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          showError('reg-error', '❌ Este e-mail já possui uma conta. Faça login.');
        } else {
          showError('reg-error', '❌ ' + error.message);
        }
        return;
      }

      if (data.session) {
        aplicarSessao(data.session);
        toast('✅ Conta criada com sucesso!');
        mostrarApp();
      } else {
        // Supabase não gerou sessão — pode ser email já existente via Google/OAuth
        // ou confirmação de e-mail pendente. Tenta login para distinguir os casos.
        const { data: loginData, error: loginErr } = await sb.auth.signInWithPassword({ email, password });
        if (loginData?.session) {
          aplicarSessao(loginData.session);
          toast('✅ Conta criada com sucesso!');
          mostrarApp();
        } else if (loginErr) {
          // Login com senha falhou → e-mail já existe por outro método (Google, etc.)
          showError('reg-error', '❌ Este e-mail já possui uma conta vinculada ao Google. Use o botão "Entrar com Google".');
        } else {
          // Sessão pendente de confirmação de e-mail
          toast('📧 Verifique seu e-mail para confirmar o cadastro.');
        }
      }
    } catch (err) {
      showError('reg-error', '⚠️ Não foi possível conectar. Verifique sua internet.');
    } finally {
      registroEmAndamento = false;
      btn.disabled = false;
      btn.innerHTML = txtOriginal;
    }
  }

  /* ── Login com Google ── */
  async function handleGoogleLogin() {
    if (!sb) {
      showError('login-error', '⚠️ Login com Google indisponível: configure o Supabase em auth.js.');
      return;
    }
    const btn    = q('google-btn');
    const btnReg = q('google-btn-register');
    if (btn)    { btn.disabled    = true; btn.textContent    = 'Redirecionando...'; }
    if (btnReg) { btnReg.disabled = true; btnReg.textContent = 'Redirecionando...'; }

    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname },
    });

    if (error) {
      showError('login-error', '❌ ' + error.message);
      if (btn)    { btn.disabled    = false; btn.textContent    = 'Entrar com Google'; }
      if (btnReg) { btnReg.disabled = false; btnReg.textContent = 'Criar conta com Google'; }
    }
  }

  /* ── Logout ── */
  async function handleLogout() {
    if (sb) await sb.auth.signOut();
    window._sync?.desativarSync();
    mostrarAuth();
    toast('👋 Você saiu.');
  }

  /* ── Eventos ── */
  q('login-btn')?.addEventListener('click', handleLogin);
  q('register-btn')?.addEventListener('click', handleRegister);
  q('google-btn')?.addEventListener('click', handleGoogleLogin);
  q('google-btn-register')?.addEventListener('click', handleGoogleLogin);
  q('btn-sair')?.addEventListener('click', handleLogout);
  q('btn-admin')?.addEventListener('click', () => { window.location.href = './admin.html'; });

  ['login-email', 'login-password'].forEach(id => {
    q(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });
  ['reg-email', 'reg-password', 'reg-confirm'].forEach(id => {
    q(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); });
  });

  iniciar();
});
