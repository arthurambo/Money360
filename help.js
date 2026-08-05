/* ═══════════════════════════════════════════
   MONEY360 — help.js
   Botão de ajuda flutuante + modal com categorias
═══════════════════════════════════════════ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const q   = id => document.getElementById(id);
  const esc = s  => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function fmtData(s) {
    if (!s) return '';
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const STORAGE_KEY = 'money360_ajuda';

  const CATS = {
    bug: {
      emoji: '🐛',
      nome: 'Relatar Bug',
      desc: 'Encontrou algo que não funciona corretamente? Descreva o problema com o máximo de detalhes — o que estava fazendo, o que esperava ver e o que aconteceu de fato.',
    },
    recurso: {
      emoji: '💡',
      nome: 'Sugerir Recurso',
      desc: 'Tem uma ideia que tornaria o Money360 ainda melhor? Conta pra gente! Sua sugestão é muito bem-vinda.',
    },
    duvida: {
      emoji: '❓',
      nome: 'Dúvida',
      desc: 'Ficou com alguma dúvida sobre como usar o app ou sobre alguma funcionalidade? Pergunte aqui à vontade.',
    },
  };

  const CAT_LABEL  = { bug: '🐛 Bug', recurso: '💡 Recurso', duvida: '❓ Dúvida' };
  const STATUS_MAP = {
    pendente:   { cls: 'ajuda-status--pendente',   txt: 'Pendente' },
    respondido: { cls: 'ajuda-status--respondido', txt: 'Respondido' },
    resolvido:  { cls: 'ajuda-status--resolvido',  txt: 'Resolvido' },
  };

  const modal     = q('modal-ajuda');
  const catsEl    = q('ajuda-cats');
  const relatosEl = q('ajuda-relatos');
  const formEl    = q('ajuda-form');
  const tituloEl  = q('ajuda-modal-titulo');
  const voltarBtn = q('ajuda-voltar');

  /* ── Open / close ── */
  function abrirModal()  { modal?.classList.add('modal--aberto'); mostrarCats(); }
  function fecharModal() { modal?.classList.remove('modal--aberto'); }

  q('btn-ajuda')?.addEventListener('click', abrirModal);
  q('btn-ajuda-mobile')?.addEventListener('click', abrirModal);
  q('ajuda-fechar')?.addEventListener('click', fecharModal);
  modal?.addEventListener('click', e => { if (e.target === modal) fecharModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal?.classList.contains('modal--aberto')) fecharModal();
  });
  voltarBtn?.addEventListener('click', mostrarCats);

  /* ── View switching ── */
  function setView(titulo, showCats, showRelatos, showForm) {
    if (tituloEl)  tituloEl.textContent    = titulo;
    if (catsEl)    catsEl.style.display    = showCats    ? '' : 'none';
    if (relatosEl) relatosEl.style.display = showRelatos ? '' : 'none';
    if (formEl)    formEl.style.display    = showForm    ? '' : 'none';
    if (voltarBtn) voltarBtn.style.display = (showRelatos || showForm) ? '' : 'none';
  }

  function mostrarCats()    { setView('Como podemos ajudar?', true,  false, false); }
  function mostrarRelatos() { setView('Seus Relatos',         false, true,  false); renderRelatos(); }
  function mostrarForm(cat) { setView(CATS[cat]?.nome || 'Ajuda', false, false, true); renderForm(cat); }

  /* ── localStorage ── */
  function getRelatos() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
  function addRelato(r) {
    const l = getRelatos(); l.unshift(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l));
  }

  /* ── Render category grid ── */
  function renderCats() {
    if (!catsEl) return;
    const items = [
      { key: 'meus',    emoji: '📋', nome: 'Seus Relatos',   desc: 'Veja suas mensagens enviadas e as respostas da equipe.' },
      { key: 'bug',     ...CATS.bug },
      { key: 'recurso', ...CATS.recurso },
      { key: 'duvida',  ...CATS.duvida },
    ];
    catsEl.innerHTML = items.map(c =>
      `<button class="ajuda-cat" data-key="${c.key}">
        <span class="ajuda-cat-emoji">${c.emoji}</span>
        <strong class="ajuda-cat-nome">${c.nome}</strong>
        <span class="ajuda-cat-desc">${c.desc}</span>
      </button>`
    ).join('');
    catsEl.querySelectorAll('.ajuda-cat').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.key === 'meus') mostrarRelatos();
        else mostrarForm(btn.dataset.key);
      });
    });
  }

  /* ── Render form ── */
  function renderForm(cat) {
    if (!formEl) return;
    formEl.innerHTML = `
      <p class="ajuda-form-desc">${esc(CATS[cat]?.desc || '')}</p>
      <div class="campo-grupo">
        <label class="campo-label">Título</label>
        <input id="ajuda-f-titulo" class="campo-input" type="text" placeholder="Resumo em uma linha…" maxlength="120" />
      </div>
      <div class="campo-grupo">
        <label class="campo-label">Descrição</label>
        <textarea id="ajuda-f-desc" class="campo-input ajuda-textarea" placeholder="Quanto mais detalhes, melhor…" maxlength="2000" rows="5"></textarea>
      </div>
      <p id="ajuda-f-erro" class="msg-erro" style="display:none"></p>
      <button id="ajuda-f-enviar" class="btn-primario">Enviar</button>
      <div id="ajuda-f-ok" class="ajuda-sucesso" style="display:none">
        ✅ Enviado com sucesso! Agradecemos o seu contato. Retornaremos em breve.
      </div>`;
    q('ajuda-f-enviar')?.addEventListener('click', () => enviarRelato(cat));
  }

  /* ── Submit ── */
  async function enviarRelato(cat) {
    const titulo    = (q('ajuda-f-titulo')?.value || '').trim();
    const descricao = (q('ajuda-f-desc')?.value   || '').trim();
    const erroEl    = q('ajuda-f-erro');
    const btnEl     = q('ajuda-f-enviar');
    const okEl      = q('ajuda-f-ok');

    if (!titulo)    { if (erroEl) { erroEl.textContent = '⚠️ Digite o título.';      erroEl.style.display = 'flex'; } return; }
    if (!descricao) { if (erroEl) { erroEl.textContent = '⚠️ Digite a descrição.';   erroEl.style.display = 'flex'; } return; }
    if (erroEl) erroEl.style.display = 'none';
    if (btnEl)  { btnEl.disabled = true; btnEl.textContent = 'Enviando…'; }

    const id = crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now().toString(36);
    const relato = {
      id, categoria: cat, titulo, descricao,
      status: 'pendente', criado_em: new Date().toISOString(),
      resposta: null, respondido_em: null,
    };
    addRelato(relato);

    const sb = window._sb;
    if (sb) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          const email = session.user.email || session.user.user_metadata?.email || '';
          await sb.from('ajuda_relatos').insert({
            id, user_id: session.user.id, user_email: email,
            categoria: cat, titulo, descricao,
          });
        }
      } catch (e) { console.warn('[help] supabase insert:', e); }
    }

    if (okEl)  okEl.style.display  = '';
    if (btnEl) btnEl.style.display = 'none';
    window._mostrarToast?.('✅ Mensagem enviada!');
  }

  /* ── Render "Seus Relatos" ── */
  async function renderRelatos() {
    if (!relatosEl) return;
    relatosEl.innerHTML = '<div class="ajuda-carregando">Carregando…</div>';
    let lista = getRelatos();

    const sb = window._sb;
    if (sb) {
      try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
          const { data } = await sb.from('ajuda_relatos')
            .select('id,categoria,titulo,descricao,status,resposta,respondido_em,criado_em')
            .eq('user_id', session.user.id)
            .order('criado_em', { ascending: false });
          if (data?.length) {
            lista = data;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
          }
        }
      } catch (e) { console.warn('[help] fetch relatos:', e); }
    }

    if (!lista.length) {
      relatosEl.innerHTML = `<div class="ajuda-vazio">
        Você ainda não enviou nenhuma mensagem.<br>Use as categorias acima para entrar em contato.
      </div>`;
      return;
    }

    relatosEl.innerHTML = lista.map(r => {
      const st = STATUS_MAP[r.status] || STATUS_MAP.pendente;
      return `<div class="ajuda-relato">
        <div class="ajuda-relato-head">
          <span class="ajuda-relato-cat">${CAT_LABEL[r.categoria] || r.categoria}</span>
          <span class="ajuda-status ${st.cls}">${st.txt}</span>
          <span class="ajuda-relato-data">${fmtData(r.criado_em)}</span>
        </div>
        <div class="ajuda-relato-titulo">${esc(r.titulo)}</div>
        <div class="ajuda-relato-descricao">${esc(r.descricao)}</div>
        ${r.resposta ? `
          <div class="ajuda-resposta">
            <div class="ajuda-resposta-label">💬 Resposta da equipe · ${fmtData(r.respondido_em)}</div>
            <p>${esc(r.resposta)}</p>
          </div>` : ''}
      </div>`;
    }).join('');
  }

  renderCats();
});
