/* ═══════════════════════════════════════════
   MONEY360 — share.js
   Botão de compartilhamento com opções
═══════════════════════════════════════════ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const q = id => document.getElementById(id);

  const APP_URL = 'https://arthurambo.github.io/Money360/';

  const MSG_WA = `Seu dinheiro desescondido! Lembrei de você porque finalmente achei um app de finanças que não parece uma planilha chata da faculdade.

O Money360 organiza todas as suas contas, te avisa antes dos boletos vencerem e funciona direto no celular ou PC.

Dá uma olhada, vale muito a pena: ${APP_URL}`;

  const modal = q('modal-compartilhar');

  function abrirShare() {
    modal?.classList.add('modal--aberto');
    const btnNative = q('share-native');
    if (btnNative) btnNative.style.display = navigator.share ? '' : 'none';
    resetCopyBtn();
  }

  function fecharShare() { modal?.classList.remove('modal--aberto'); }

  ['btn-compartilhar', 'btn-compartilhar-mobile'].forEach(id =>
    q(id)?.addEventListener('click', abrirShare)
  );
  q('share-fechar')?.addEventListener('click', fecharShare);
  modal?.addEventListener('click', e => { if (e.target === modal) fecharShare(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('modal--aberto')) fecharShare();
  });

  /* ── WhatsApp ── */
  q('share-whatsapp')?.addEventListener('click', () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(MSG_WA), '_blank', 'noopener');
  });

  /* ── Copiar link ── */
  function resetCopyBtn() {
    const btn = q('share-copy');
    if (!btn) return;
    btn.innerHTML = `<span class="share-opt-icon">🔗</span><div class="share-opt-info"><strong>Copiar link</strong><span>Cole onde quiser</span></div>`;
  }

  q('share-copy')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      const btn = q('share-copy');
      if (btn) btn.innerHTML = `<span class="share-opt-icon">✅</span><div class="share-opt-info"><strong>Link copiado!</strong><span>${APP_URL}</span></div>`;
      setTimeout(resetCopyBtn, 2500);
      window._mostrarToast?.('🔗 Link copiado!');
    } catch {
      window._mostrarToast?.('⚠️ Não foi possível copiar.');
    }
  });

  /* ── Web Share API (Share with...) ── */
  q('share-native')?.addEventListener('click', async () => {
    try {
      await navigator.share({
        title: 'Money360',
        text: 'Seu dinheiro desescondido! Organize suas finanças de verdade.',
        url: APP_URL,
      });
    } catch (e) {
      if (e.name !== 'AbortError') window._mostrarToast?.('⚠️ Não foi possível compartilhar.');
    }
  });
});
