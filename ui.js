/* ═══════════════════════════════════════════
   MINHA CARTEIRA — ui.js v2.2
   • Navegação entre views
   • Tema mobile
   • Hamburger / sidebar mobile
   • View Transações (tabela espelho + filtros)
   • View Assinaturas (CRUD completo)
   • View Relatórios
   • Configurações (exportar/importar/apagar)
   • Toast de notificação
═══════════════════════════════════════════ */
'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── Helpers ── */
  const q  = id => document.getElementById(id);
  const abrirModal  = el => el && el.classList.add('modal--aberto');
  const fecharModal = el => el && el.classList.remove('modal--aberto');

  function moeda(v) { return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }
  function fmtData(s) { if(!s)return''; const[a,m,d]=s.split('-'); return `${d}/${m}/${a}`; }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function getTransacoes() { try { return JSON.parse(localStorage.getItem('carteira_transacoes'))||[]; } catch{return[];} }

  /* ══════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════ */
  const toastEl = q('toast');
  function mostrarToast(msg, dur=3000) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('toast--show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove('toast--show'), dur);
  }
  window._mostrarToast = mostrarToast;

  /* ══════════════════════════════════════════
     NAVEGAÇÃO DE VIEWS
  ══════════════════════════════════════════ */
  const navLinks = document.querySelectorAll('.nav-item[data-view]');
  const views    = document.querySelectorAll('.view');

  function mostrarView(nome) {
    views.forEach(v => v.classList.remove('view--active'));
    navLinks.forEach(l => l.classList.remove('nav-item--active'));
    const ve = q('view-'+nome);
    if (ve) ve.classList.add('view--active');
    const le = document.querySelector(`.nav-item[data-view="${nome}"]`);
    if (le) le.classList.add('nav-item--active');
    toggleSidebar(false);
    if (nome === 'relatorios')  renderRelatorios();
    if (nome === 'transacoes')  renderTabelaTransacoes();
    if (nome === 'assinaturas') renderAssinaturas();
    if (nome === 'renda')       renderRenda();
    if (nome === 'configuracoes') syncTemaConfig();
  }

  navLinks.forEach(l => l.addEventListener('click', e => { e.preventDefault(); mostrarView(l.dataset.view); }));

  /* ══════════════════════════════════════════
     SIDEBAR MOBILE
  ══════════════════════════════════════════ */
  const sidebar = q('sidebar');
  const overlay = q('sidebar-overlay');

  function toggleSidebar(force) {
    const open = force !== undefined ? force : !sidebar.classList.contains('sidebar--open');
    sidebar.classList.toggle('sidebar--open', open);
    overlay.classList.toggle('active', open);
    document.body.classList.toggle('no-scroll', open);
  }

  q('btn-hamburger')?.addEventListener('click', () => toggleSidebar());
  overlay?.addEventListener('click', () => toggleSidebar(false));

  /* ══════════════════════════════════════════
     TEMA
  ══════════════════════════════════════════ */
  q('btn-tema-mobile')?.addEventListener('click', () => q('btn-tema')?.click());
  q('btn-tema-config2')?.addEventListener('click', () => q('btn-tema')?.click());

  function syncTemaConfig() {
    const claro = document.documentElement.classList.contains('claro');
    const lbl = q('config-tema-label');
    if (lbl) lbl.textContent = claro ? 'Claro' : 'Escuro';
  }

  new MutationObserver(() => {
    const claro = document.documentElement.classList.contains('claro');
    const ic = q('btn-tema')?.querySelector('.tema-icon');
    if (ic) ic.textContent = claro ? 'Tema Claro' : 'Tema Escuro';
    const sol = q('btn-tema')?.querySelector('.icon-sol');
    const lua = q('btn-tema')?.querySelector('.icon-lua');
    if (sol) sol.style.display = claro ? 'none' : '';
    if (lua) lua.style.display = claro ? '' : 'none';
    syncTemaConfig();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  /* ══════════════════════════════════════════
     DATA NO CABEÇALHO
  ══════════════════════════════════════════ */
  const anoEl = q('ano');
  if (anoEl) anoEl.textContent = new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  /* ══════════════════════════════════════════
     NOVA TRANSAÇÃO — tela cheia no mobile
  ══════════════════════════════════════════ */
  const painelNovaTransacao = q('painel-nova-transacao');

  function abrirNovaTransacaoMobile() {
    painelNovaTransacao?.classList.add('painel--aberto');
    document.body.classList.add('no-scroll');
  }
  function fecharNovaTransacaoMobile() {
    painelNovaTransacao?.classList.remove('painel--aberto');
    document.body.classList.remove('no-scroll');
  }
  window._fecharNovaTransacaoMobile = fecharNovaTransacaoMobile;

  q('btn-abrir-nova-transacao')   ?.addEventListener('click', abrirNovaTransacaoMobile);
  q('btn-fechar-nova-transacao')  ?.addEventListener('click', fecharNovaTransacaoMobile);

  /* ══════════════════════════════════════════
     ATALHO NOVA TRANSAÇÃO
  ══════════════════════════════════════════ */
  q('btn-nova-transacao-atalho')?.addEventListener('click', () => {
    mostrarView('dashboard');
    if (window.matchMedia('(max-width: 860px)').matches) abrirNovaTransacaoMobile();
    setTimeout(() => q('input-descricao')?.focus(), 100);
  });

  /* ══════════════════════════════════════════
     VIEW TRANSAÇÕES — tabela espelho
  ══════════════════════════════════════════ */
  function catMapUI() {
    return window._catsMgr ? window._catsMgr.getCatMap() : { outros: { emoji: '📦', nome: 'Outros' } };
  }

  function renderTabelaTransacoes(lista) {
    if (!lista) lista = getTransacoes();
    const corpo  = q('tabela-body2');
    const vazio  = q('lista-vazia2');
    const tabela = q('tabela-transacoes2');
    const badge  = q('contagem2');
    if (!corpo) return;
    corpo.innerHTML = '';
    const sorted = [...lista].sort((a,b)=>b.data.localeCompare(a.data));
    const empty = !sorted.length;
    if (vazio)  vazio.style.display  = empty ? 'flex' : 'none';
    if (tabela) tabela.style.display = empty ? 'none' : '';

    sorted.forEach(t => {
      const _cm = catMapUI(); const cat = _cm[t.categoria]||_cm.outros||{emoji:'📦',nome:t.categoria};
      const tr  = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-data">${fmtData(t.data)}</td>
        <td>${esc(t.descricao)}</td>
        <td><span class="chip-categoria">${cat.emoji} ${cat.nome}</span></td>
        <td><span class="badge badge--${t.tipo}">${t.tipo==='receita'?'↑':'↓'} ${t.tipo}</span></td>
        <td class="td-valor valor-${t.tipo}">${t.tipo==='receita'?'+':'−'} ${moeda(t.valor)}</td>
        <td class="td-acoes">
          <button class="btn-editar"  title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
          <button class="btn-excluir" title="Remover">×</button>
        </td>`;
      tr.querySelector('.btn-editar') .addEventListener('click', () => window._abrirEdicao?.(t.id));
      tr.querySelector('.btn-excluir').addEventListener('click', () => window._solicitarExclusao?.(t.id));
      corpo.appendChild(tr);
    });
    if (badge) badge.textContent = `${lista.length}`;
  }

  q('btn-filtrar2')?.addEventListener('click', () => {
    const ini  = q('filtro2-inicio')?.value || '';
    const fim  = q('filtro2-fim')?.value    || '';
    const tipo = q('filtro2-tipo')?.value   || 'todos';
    const cat  = q('filtro2-categoria')?.value || 'todas';
    const res  = getTransacoes().filter(t => {
      return (tipo==='todos'||t.tipo===tipo) && (cat==='todas'||t.categoria===cat)
          && (!ini||t.data>=ini) && (!fim||t.data<=fim);
    });
    renderTabelaTransacoes(res);
  });

  q('btn-limpar-filtro2')?.addEventListener('click', () => {
    ['filtro2-inicio','filtro2-fim'].forEach(id => { const e=q(id); if(e)e.value=''; });
    ['filtro2-tipo','filtro2-categoria'].forEach(id => { const e=q(id); if(e)e.value=e.options[0].value; });
    renderTabelaTransacoes();
  });

  /* ══════════════════════════════════════════
     ASSINATURAS
  ══════════════════════════════════════════ */
  const STORAGE_ASS = 'carteira_assinaturas';
  // Cores fixas para as categorias padrão (mantém o visual já conhecido).
  // Categorias novas/customizadas recebem uma cor automática (hash do id).
  const COR_CAT_ASS = {
    streaming:'#7C6FF7', musica:'#2EC4B6', software:'#5B9CF6',
    cloud:'#30D988', 'servico-digital':'#FFC542', funcionario:'#FF5C7A',
    internet:'#fb923c', seguro:'#f472b6', academia:'#34d399',
    educacao_assinatura:'#94a3b8', outros_assinatura:'#6b7280',
  };
  const PALETA_COR_ASS = ['#7C6FF7','#2EC4B6','#5B9CF6','#30D988','#FFC542','#FF5C7A','#fb923c','#f472b6','#34d399','#94a3b8','#a78bfa','#22d3ee'];

  function catAssInfo(id) {
    const cm = window._catsMgr?.getCatMap() || {};
    return cm[id] || cm['outros_assinatura'] || { emoji: '📦', nome: 'Outros' };
  }

  function corCatAss(id) {
    if (COR_CAT_ASS[id]) return COR_CAT_ASS[id];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return PALETA_COR_ASS[hash % PALETA_COR_ASS.length];
  }

  function getAssinaturas() { try { return JSON.parse(localStorage.getItem(STORAGE_ASS))||[]; } catch{return[];} }
  function saveAssinaturas(a) { try { localStorage.setItem(STORAGE_ASS,JSON.stringify(a)); } catch{} }

  function renderAssinaturas() {
    const lista  = getAssinaturas();
    const grid   = q('ass-grid');
    const vazio  = q('ass-vazio');
    const badge  = q('nav-badge-assinaturas');
    if (!grid) return;
    grid.innerHTML = '';

    /* Resumo */
    const totalMensal = lista.reduce((a,s)=>a+s.valor,0);
    const el1 = q('ass-total-mensal'); if (el1) el1.textContent = moeda(totalMensal);
    const el2 = q('ass-total-anual');  if (el2) el2.textContent = moeda(totalMensal*12);
    const el3 = q('ass-total-qtd');    if (el3) el3.textContent = lista.length;

    /* Badge na nav */
    if (badge) { badge.textContent = lista.length||''; badge.style.display = lista.length ? '' : 'none'; }

    if (!lista.length) {
      if (vazio) vazio.style.display = 'flex';
      return;
    }
    if (vazio) vazio.style.display = 'none';

    /* Ordena por categoria */
    const sorted = [...lista].sort((a,b)=>a.categoria.localeCompare(b.categoria)||a.nome.localeCompare(b.nome));

    sorted.forEach(s => {
      const info = catAssInfo(s.categoria);
      const cor  = corCatAss(s.categoria);
      const card = document.createElement('div');
      card.className = 'ass-card';
      card.innerHTML = `
        <div class="ass-card-accent" style="background:${cor}"></div>
        <div class="ass-card-body">
          <div class="ass-card-top">
            <div class="ass-card-icon" style="background:${cor}22;color:${cor}">${info.emoji}</div>
            <div class="ass-card-acoes">
              <button class="btn-editar ass-btn-edit" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
              <button class="btn-excluir ass-btn-del" title="Remover">×</button>
            </div>
          </div>
          <h4 class="ass-card-nome">${esc(s.nome)}</h4>
          <span class="ass-card-cat">${info.nome}</span>
          <div class="ass-card-valores">
            <div><p class="ass-val-label">Por mês</p><p class="ass-val-num">${moeda(s.valor)}</p></div>
            <div><p class="ass-val-label">Por ano</p><p class="ass-val-num">${moeda(s.valor*12)}</p></div>
            ${s.vencimento ? `<div><p class="ass-val-label">Vence dia</p><p class="ass-val-num">${s.vencimento}</p></div>` : ''}
          </div>
          ${(s.parcela || s.cobrancaAutomatica) ? `<div class="ass-card-selos">
            ${s.parcela ? `<span class="ass-selo">📆 Última parcela: ${fmtData(s.dataUltimaParcela)}</span>` : ''}
            ${s.cobrancaAutomatica ? `<span class="ass-selo ass-selo--auto">⚡ Cobrança automática</span>` : ''}
          </div>` : ''}
          ${s.notas ? `<p class="ass-card-notas">${esc(s.notas)}</p>` : ''}
        </div>`;
      card.querySelector('.ass-btn-edit').addEventListener('click', () => abrirModalAssinatura(s.id));
      card.querySelector('.ass-btn-del') .addEventListener('click', () => removerAssinatura(s.id));
      grid.appendChild(card);
    });
  }

  /* ── Modal assinatura ── */
  const modalAss = q('modal-assinatura');

  function abrirModalAssinatura(id) {
    const titulo = q('ass-modal-titulo');
    const errEl  = q('ass-msg-erro');
    if (errEl) errEl.style.display = 'none';

    if (id) {
      const ass = getAssinaturas().find(a=>a.id===id);
      if (!ass) return;
      if (titulo)             titulo.textContent = 'Editar Assinatura';
      if (q('ass-edit-id'))   q('ass-edit-id').value   = ass.id;
      if (q('ass-nome'))      q('ass-nome').value       = ass.nome;
      if (q('ass-valor'))     q('ass-valor').value      = ass.valor;
      if (q('ass-vencimento'))q('ass-vencimento').value = ass.vencimento||'';
      window._catsMgr?.populateSelectByTipo('ass-categoria', 'assinatura', ass.categoria);
      if (q('ass-parcela'))   q('ass-parcela').checked   = !!ass.parcela;
      if (q('ass-data-ultima-parcela')) q('ass-data-ultima-parcela').value = ass.dataUltimaParcela||'';
      if (q('ass-cobranca-automatica')) q('ass-cobranca-automatica').checked = !!ass.cobrancaAutomatica;
      atualizarVisibilidadeParcela();
      if (q('ass-notas'))     q('ass-notas').value      = ass.notas||'';
    } else {
      if (titulo) titulo.textContent = 'Nova Assinatura';
      if (q('ass-edit-id'))   q('ass-edit-id').value   = '';
      if (q('ass-nome'))      q('ass-nome').value       = '';
      if (q('ass-valor'))     q('ass-valor').value      = '';
      if (q('ass-vencimento'))q('ass-vencimento').value = '';
      const primeiraAss = window._catsMgr?.getCatsByTipo('assinatura')[0]?.id;
      window._catsMgr?.populateSelectByTipo('ass-categoria', 'assinatura', primeiraAss);
      if (q('ass-parcela'))   q('ass-parcela').checked   = false;
      if (q('ass-data-ultima-parcela')) q('ass-data-ultima-parcela').value = '';
      if (q('ass-cobranca-automatica')) q('ass-cobranca-automatica').checked = false;
      atualizarVisibilidadeParcela();
      if (q('ass-notas'))     q('ass-notas').value      = '';
    }
    abrirModal(modalAss);
    q('ass-nome')?.focus();
  }

  function atualizarVisibilidadeParcela() {
    const wrap = q('ass-parcela-data-wrap');
    if (wrap) wrap.style.display = q('ass-parcela')?.checked ? '' : 'none';
  }
  q('ass-parcela')?.addEventListener('change', atualizarVisibilidadeParcela);

  function salvarAssinatura() {
    const id      = q('ass-edit-id')?.value    || '';
    const nome    = q('ass-nome')?.value.trim()|| '';
    const vStr    = q('ass-valor')?.value      || '';
    const venc    = q('ass-vencimento')?.value || '';
    const cat     = q('ass-categoria')?.value  || 'outros_assinatura';
    const nota    = q('ass-notas')?.value.trim()|| '';
    const parcela = !!q('ass-parcela')?.checked;
    const dataUltimaParcela = parcela ? (q('ass-data-ultima-parcela')?.value || '') : '';
    const cobrancaAutomatica = !!q('ass-cobranca-automatica')?.checked;
    const errEl= q('ass-msg-erro');

    function errAss(msg) { if(errEl){errEl.textContent=msg;errEl.style.display='flex';} }

    if (!nome) return errAss('Informe o nome do serviço.');
    const v = parseFloat(vStr);
    if (!vStr||isNaN(v)||v<=0) return errAss('Informe um valor mensal válido.');

    let lista = getAssinaturas();
    if (id) {
      const idx = lista.findIndex(a=>a.id===id);
      if (idx !== -1) lista[idx] = {...lista[idx], nome, valor:v, vencimento:venc?+venc:'', categoria:cat, notas:nota, parcela, dataUltimaParcela, cobrancaAutomatica};
    } else {
      lista.push({ id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,5)), nome, valor:v, vencimento:venc?+venc:'', categoria:cat, notas:nota, parcela, dataUltimaParcela, cobrancaAutomatica });
    }
    saveAssinaturas(lista);
    fecharModal(modalAss);
    renderAssinaturas();
    mostrarToast(id ? '✏️ Assinatura atualizada!' : '✅ Assinatura adicionada!');
  }

  function removerAssinatura(id) {
    const lista = getAssinaturas().filter(a=>a.id!==id);
    saveAssinaturas(lista);
    renderAssinaturas();
    mostrarToast('🗑️ Assinatura removida.');
  }

  /* ── Cobrança automática ──────────────────── */

  function diasAteVencimentoAss(diaVenc) {
    const agora = new Date();
    const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const cand  = new Date(agora.getFullYear(), agora.getMonth(), diaVenc);
    if (diaVenc < agora.getDate()) cand.setMonth(cand.getMonth() + 1);
    return Math.round((cand - hoje) / 86400000);
  }

  // Tenta achar uma categoria de despesa com o mesmo nome da categoria de
  // assinatura (ex.: "Educação"); se não achar, usa "Outros" (despesa).
  function categoriaDespesaParaAssinatura(assCategoriaId) {
    const cm = window._catsMgr?.getCatMap() || {};
    const assCat = cm[assCategoriaId];
    if (!assCat) return 'outros';
    const despesas = window._catsMgr?.getCatsByTipo('despesa') || [];
    const match = despesas.find(d => d.nome === assCat.nome);
    return match ? match.id : 'outros';
  }

  function verificarCobrancasAutomaticas() {
    const lista  = getAssinaturas();
    const hoje   = new Date();
    const hojeStr = hoje.toISOString().split('T')[0];
    let mudou = false;

    lista.forEach(ass => {
      if (!ass.cobrancaAutomatica || !ass.vencimento) return;
      if (ass.ultimaCobrancaAutomatica === hojeStr) return; // já lançada hoje
      if (ass.parcela && ass.dataUltimaParcela && hojeStr > ass.dataUltimaParcela) return; // parcelamento já terminou

      const diff = diasAteVencimentoAss(Number(ass.vencimento));
      if (diff === 0) {
        const categoria = categoriaDespesaParaAssinatura(ass.categoria);
        window._adicionarTransacaoAutomatica?.('despesa', ass.nome, ass.valor, hojeStr, categoria);
        ass.ultimaCobrancaAutomatica = hojeStr;
        mudou = true;
        mostrarToast(`⚡ ${ass.nome}: cobrança lançada automaticamente!`);
      }
    });

    if (mudou) saveAssinaturas(lista);
  }

  window._renderAssinaturas = renderAssinaturas;
  window._verificarCobrancasAutomaticas = verificarCobrancasAutomaticas;

  q('btn-nova-assinatura')?.addEventListener('click', () => abrirModalAssinatura(null));
  q('ass-modal-salvar')   ?.addEventListener('click', salvarAssinatura);
  q('ass-modal-cancelar') ?.addEventListener('click', () => fecharModal(modalAss));
  q('ass-modal-fechar')   ?.addEventListener('click', () => fecharModal(modalAss));
  modalAss?.addEventListener('click', e => { if(e.target===modalAss) fecharModal(modalAss); });

  /* ══════════════════════════════════════════
     RENDA (fontes de renda)
  ══════════════════════════════════════════ */
  const STORAGE_RENDA = 'carteira_rendas';
  const COR_CAT_RENDA = { salario:'#30D988', freelance:'#5B9CF6', investimento:'#7C6FF7', outros_receita:'#94a3b8' };
  const PALETA_COR_RENDA = ['#30D988','#5B9CF6','#7C6FF7','#2EC4B6','#FFC542','#34d399','#a78bfa','#22d3ee','#fb923c','#f472b6'];

  function catRendaInfo(id) {
    const cm = window._catsMgr?.getCatMap() || {};
    return cm[id] || cm['outros_receita'] || { emoji: '💰', nome: 'Outros' };
  }

  function corCatRenda(id) {
    if (COR_CAT_RENDA[id]) return COR_CAT_RENDA[id];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    return PALETA_COR_RENDA[hash % PALETA_COR_RENDA.length];
  }

  function getRendas() { try { return JSON.parse(localStorage.getItem(STORAGE_RENDA))||[]; } catch{return[];} }
  function saveRendas(a) { try { localStorage.setItem(STORAGE_RENDA,JSON.stringify(a)); } catch{} }

  function renderRenda() {
    const lista  = getRendas();
    const grid   = q('renda-grid');
    const vazio  = q('renda-vazio');
    const badge  = q('nav-badge-renda');
    if (!grid) return;
    grid.innerHTML = '';

    const totalMensal = lista.reduce((a,s)=>a+s.valor,0);
    const el1 = q('renda-total-mensal'); if (el1) el1.textContent = moeda(totalMensal);
    const el2 = q('renda-total-anual');  if (el2) el2.textContent = moeda(totalMensal*12);
    const el3 = q('renda-total-qtd');    if (el3) el3.textContent = lista.length;

    if (badge) { badge.textContent = lista.length||''; badge.style.display = lista.length ? '' : 'none'; }

    if (!lista.length) {
      if (vazio) vazio.style.display = 'flex';
      return;
    }
    if (vazio) vazio.style.display = 'none';

    const sorted = [...lista].sort((a,b)=>a.categoria.localeCompare(b.categoria)||a.nome.localeCompare(b.nome));

    sorted.forEach(s => {
      const info = catRendaInfo(s.categoria);
      const cor  = corCatRenda(s.categoria);
      const card = document.createElement('div');
      card.className = 'ass-card';
      card.innerHTML = `
        <div class="ass-card-accent" style="background:${cor}"></div>
        <div class="ass-card-body">
          <div class="ass-card-top">
            <div class="ass-card-icon" style="background:${cor}22;color:${cor}">${info.emoji}</div>
            <div class="ass-card-acoes">
              <button class="btn-editar renda-btn-edit" title="Editar"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg></button>
              <button class="btn-excluir renda-btn-del" title="Remover">×</button>
            </div>
          </div>
          <h4 class="ass-card-nome">${esc(s.nome)}</h4>
          <span class="ass-card-cat">${info.nome}</span>
          <div class="ass-card-valores">
            <div><p class="ass-val-label">Por mês</p><p class="ass-val-num">${moeda(s.valor)}</p></div>
            <div><p class="ass-val-label">Por ano</p><p class="ass-val-num">${moeda(s.valor*12)}</p></div>
            ${s.diaRecebimento ? `<div><p class="ass-val-label">Recebe dia</p><p class="ass-val-num">${s.diaRecebimento}</p></div>` : ''}
          </div>
          ${s.recebimentoAutomatico ? `<div class="ass-card-selos">
            <span class="ass-selo ass-selo--auto">⚡ Recebimento automático</span>
          </div>` : ''}
          ${s.notas ? `<p class="ass-card-notas">${esc(s.notas)}</p>` : ''}
        </div>`;
      card.querySelector('.renda-btn-edit').addEventListener('click', () => abrirModalRenda(s.id));
      card.querySelector('.renda-btn-del') .addEventListener('click', () => removerRenda(s.id));
      grid.appendChild(card);
    });
  }

  const modalRenda = q('modal-renda');

  function abrirModalRenda(id) {
    const titulo = q('renda-modal-titulo');
    const errEl  = q('renda-msg-erro');
    if (errEl) errEl.style.display = 'none';

    if (id) {
      const r = getRendas().find(a=>a.id===id);
      if (!r) return;
      if (titulo)              titulo.textContent = 'Editar Fonte de Renda';
      if (q('renda-edit-id'))  q('renda-edit-id').value = r.id;
      if (q('renda-nome'))     q('renda-nome').value     = r.nome;
      if (q('renda-valor'))    q('renda-valor').value    = r.valor;
      if (q('renda-dia'))      q('renda-dia').value      = r.diaRecebimento||'';
      window._catsMgr?.populateSelectByTipo('renda-categoria', 'receita', r.categoria);
      if (q('renda-recebimento-automatico')) q('renda-recebimento-automatico').checked = !!r.recebimentoAutomatico;
      if (q('renda-notas'))    q('renda-notas').value    = r.notas||'';
    } else {
      if (titulo) titulo.textContent = 'Nova Fonte de Renda';
      if (q('renda-edit-id'))  q('renda-edit-id').value = '';
      if (q('renda-nome'))     q('renda-nome').value     = '';
      if (q('renda-valor'))    q('renda-valor').value    = '';
      if (q('renda-dia'))      q('renda-dia').value      = '';
      const primeiraRenda = window._catsMgr?.getCatsByTipo('receita')[0]?.id;
      window._catsMgr?.populateSelectByTipo('renda-categoria', 'receita', primeiraRenda);
      if (q('renda-recebimento-automatico')) q('renda-recebimento-automatico').checked = false;
      if (q('renda-notas'))    q('renda-notas').value    = '';
    }
    abrirModal(modalRenda);
    q('renda-nome')?.focus();
  }

  function salvarRenda() {
    const id   = q('renda-edit-id')?.value    || '';
    const nome = q('renda-nome')?.value.trim()|| '';
    const vStr = q('renda-valor')?.value      || '';
    const dia  = q('renda-dia')?.value        || '';
    const cat  = q('renda-categoria')?.value  || 'outros_receita';
    const nota = q('renda-notas')?.value.trim()|| '';
    const recebimentoAutomatico = !!q('renda-recebimento-automatico')?.checked;
    const errEl= q('renda-msg-erro');

    function errRenda(msg) { if(errEl){errEl.textContent=msg;errEl.style.display='flex';} }

    if (!nome) return errRenda('Informe o nome da fonte.');
    const v = parseFloat(vStr);
    if (!vStr||isNaN(v)||v<=0) return errRenda('Informe um valor mensal válido.');

    let lista = getRendas();
    if (id) {
      const idx = lista.findIndex(a=>a.id===id);
      if (idx !== -1) lista[idx] = {...lista[idx], nome, valor:v, diaRecebimento:dia?+dia:'', categoria:cat, notas:nota, recebimentoAutomatico};
    } else {
      lista.push({ id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2,5)), nome, valor:v, diaRecebimento:dia?+dia:'', categoria:cat, notas:nota, recebimentoAutomatico });
    }
    saveRendas(lista);
    fecharModal(modalRenda);
    renderRenda();
    mostrarToast(id ? '✏️ Fonte de renda atualizada!' : '✅ Fonte de renda adicionada!');
  }

  function removerRenda(id) {
    const lista = getRendas().filter(a=>a.id!==id);
    saveRendas(lista);
    renderRenda();
    mostrarToast('🗑️ Fonte de renda removida.');
  }

  /* ── Recebimento automático ──────────────────── */

  function diasAteRecebimento(diaRec) {
    const agora = new Date();
    const hoje  = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const cand  = new Date(agora.getFullYear(), agora.getMonth(), diaRec);
    if (diaRec < agora.getDate()) cand.setMonth(cand.getMonth() + 1);
    return Math.round((cand - hoje) / 86400000);
  }

  function verificarRecebimentosAutomaticos() {
    const lista  = getRendas();
    const hojeStr = new Date().toISOString().split('T')[0];
    let mudou = false;

    lista.forEach(r => {
      if (!r.recebimentoAutomatico || !r.diaRecebimento) return;
      if (r.ultimoRecebimentoAutomatico === hojeStr) return; // já lançado hoje

      const diff = diasAteRecebimento(Number(r.diaRecebimento));
      if (diff === 0) {
        window._adicionarTransacaoAutomatica?.('receita', r.nome, r.valor, hojeStr, r.categoria || 'outros_receita');
        r.ultimoRecebimentoAutomatico = hojeStr;
        mudou = true;
        mostrarToast(`⚡ ${r.nome}: receita lançada automaticamente!`);
      }
    });

    if (mudou) saveRendas(lista);
  }

  window._renderRenda = renderRenda;
  window._verificarRecebimentosAutomaticos = verificarRecebimentosAutomaticos;

  q('btn-nova-renda')      ?.addEventListener('click', () => abrirModalRenda(null));
  q('renda-modal-salvar')  ?.addEventListener('click', salvarRenda);
  q('renda-modal-cancelar')?.addEventListener('click', () => fecharModal(modalRenda));
  q('renda-modal-fechar')  ?.addEventListener('click', () => fecharModal(modalRenda));
  modalRenda?.addEventListener('click', e => { if(e.target===modalRenda) fecharModal(modalRenda); });

  /* ══════════════════════════════════════════
     RELATÓRIOS
  ══════════════════════════════════════════ */
  const CORES_REL = ['#7C6FF7','#2EC4B6','#FF5C7A','#FFC542','#5B9CF6','#30D988','#fb923c','#f472b6','#34d399','#94a3b8'];

  let periodoRel = 28; // dias; 0 = todo período

  function filtrarTransacoesPorPeriodo(dias) {
    const todas = getTransacoes();
    if (dias === 0) return todas;
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    const limiteStr = limite.toISOString().split('T')[0];
    return todas.filter(t => t.data >= limiteStr);
  }

  // Liga botões de período dos relatórios
  document.querySelectorAll('.periodo-btn-rel').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.periodo-btn-rel').forEach(b => b.classList.remove('periodo-btn--ativo'));
      btn.classList.add('periodo-btn--ativo');
      periodoRel = +btn.dataset.dias;
      renderRelatorios();
    });
  });

  const NOMES_MESES_PROJ = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  // Parcelas terminam na data da última parcela: a assinatura deixa de
  // entrar na despesa de meses posteriores a esse mês/ano.
  function assinaturaAtivaEm(ass, ano, mesIdx) {
    if (!ass.parcela || !ass.dataUltimaParcela) return true;
    const d = new Date(ass.dataUltimaParcela + 'T00:00:00');
    return (ano * 12 + mesIdx) <= (d.getFullYear() * 12 + d.getMonth());
  }

  function renderProjecao() {
    const todasTx     = getTransacoes();
    const recTotal    = todasTx.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
    const despTotal   = todasTx.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0);
    const saldoAtual  = recTotal - despTotal;

    const hojeP = new Date();
    const assinaturas = getAssinaturas();
    const rendaMensal   = getRendas().reduce((a, r) => a + (r.valor || 0), 0);
    const despesaMensal = assinaturas
      .filter(a => assinaturaAtivaEm(a, hojeP.getFullYear(), hojeP.getMonth()))
      .reduce((a, s) => a + (s.valor || 0), 0);
    const sobraMensal   = rendaMensal - despesaMensal;

    const elSaldo = q('proj-saldo-atual'), elRenda = q('proj-renda-mensal'),
          elDesp  = q('proj-despesa-mensal'), elSobra = q('proj-sobra-mensal');
    if (elSaldo)  { elSaldo.textContent  = moeda(saldoAtual);  elSaldo.className  = 'ass-resumo-valor ' + (saldoAtual  >= 0 ? 'valor-receita' : 'valor-despesa'); }
    if (elRenda)    elRenda.textContent    = moeda(rendaMensal);
    if (elDesp)     elDesp.textContent     = moeda(despesaMensal);
    if (elSobra) { elSobra.textContent = moeda(sobraMensal); elSobra.className = 'ass-resumo-valor ' + (sobraMensal >= 0 ? 'valor-receita' : 'valor-despesa'); }

    const meses = [];
    let saldoAcumulado = saldoAtual;
    for (let m = 1; m <= 12; m++) {
      const d = new Date(hojeP.getFullYear(), hojeP.getMonth() + m, 1);
      const rendaMes   = rendaMensal;
      const despesaMes = assinaturas
        .filter(a => assinaturaAtivaEm(a, d.getFullYear(), d.getMonth()))
        .reduce((a, s) => a + (s.valor || 0), 0);
      saldoAcumulado += (rendaMes - despesaMes);
      meses.push({
        label: NOMES_MESES_PROJ[d.getMonth()] + '/' + String(d.getFullYear()).slice(2),
        renda: rendaMes, despesa: despesaMes, saldo: saldoAcumulado,
      });
    }

    const cvP = q('grafico-projecao'), vazP = q('proj-vazio'), listaP = q('proj-lista');
    const semDados = !rendaMensal && !despesaMensal;

    if (cvP) {
      if (semDados) {
        cvP.style.display = 'none';
        if (vazP) vazP.style.display = 'block';
        if (listaP) listaP.innerHTML = '';
      } else {
        cvP.style.display = 'block';
        if (vazP) vazP.style.display = 'none';

        const ctxP = cvP.getContext('2d');
        ctxP.clearRect(0, 0, cvP.width, cvP.height);
        const cs = getComputedStyle(document.documentElement);
        const clrSuccess = cs.getPropertyValue('--color-success').trim() || '#30D988';
        const clrDanger  = cs.getPropertyValue('--color-danger').trim()  || '#FF5C7A';
        const clrGrid    = cs.getPropertyValue('--border-subtle').trim() || '#2a2d3d';
        const clrText    = cs.getPropertyValue('--text-tertiary').trim()|| '#9094a8';

        const padL = 54, padR = 14, padT = 16, padB = 28;
        const w = cvP.width - padL - padR, h = cvP.height - padT - padB;
        const valores = meses.map(m => m.saldo);
        const maxV = Math.max(...valores, 0), minV = Math.min(...valores, 0);
        const span = (maxV - minV) || 1;
        const zeroY = padT + h - ((0 - minV) / span) * h;

        ctxP.strokeStyle = clrGrid; ctxP.lineWidth = 1;
        ctxP.beginPath(); ctxP.moveTo(padL, zeroY); ctxP.lineTo(padL + w, zeroY); ctxP.stroke();

        const step = w / meses.length, barW = step * 0.6;
        meses.forEach((m, i) => {
          const x = padL + step * i + (step - barW) / 2;
          const barH = Math.max(Math.abs(m.saldo) / span * h, 1);
          const y = m.saldo >= 0 ? zeroY - barH : zeroY;
          ctxP.fillStyle = m.saldo >= 0 ? clrSuccess : clrDanger;
          ctxP.fillRect(x, y, barW, barH);
          ctxP.fillStyle = clrText;
          ctxP.font = `600 10px 'Plus Jakarta Sans',sans-serif`;
          ctxP.textAlign = 'center';
          ctxP.fillText(m.label, x + barW / 2, padT + h + 18);
        });
      }

      if (listaP) {
        listaP.innerHTML = meses.map(m => `
          <div class="proj-row">
            <span class="proj-row-mes">${m.label}</span>
            <div class="proj-row-valores">
              <span class="valor-receita">+${moeda(m.renda)}</span>
              <span class="valor-despesa">−${moeda(m.despesa)}</span>
              <span class="proj-row-saldo ${m.saldo >= 0 ? 'valor-receita' : 'valor-despesa'}">${moeda(m.saldo)}</span>
            </div>
          </div>`).join('');
      }
    }
  }

  function renderRelatorios() {
    renderProjecao();
    const tx = filtrarTransacoesPorPeriodo(periodoRel);
    /* Balanço por categoria */
    const divCat = q('rel-categorias');
    const relVaz = q('rel-vazio');
    if (divCat) {
      divCat.innerHTML = '';
      const mapa = {};
      tx.forEach(t => {
        if (!mapa[t.categoria]) mapa[t.categoria]={rec:0,des:0};
        mapa[t.categoria][t.tipo==='receita'?'rec':'des'] += t.valor;
      });
      const entradas = Object.entries(mapa).sort((a,b)=>(b[1].rec+b[1].des)-(a[1].rec+a[1].des));
      if (!entradas.length) { if(relVaz) relVaz.style.display='block'; }
      else {
        if(relVaz) relVaz.style.display='none';
        entradas.forEach(([cat,v])=>{
          const _cm3 = catMapUI(); const info = _cm3[cat]||_cm3.outros||{emoji:'📦',nome:cat};
          const saldo = v.rec-v.des, max = Math.max(v.rec,v.des,1);
          const row = document.createElement('div'); row.className='rel-cat-row';
          row.innerHTML=`
            <div class="rel-cat-nome"><span class="rel-cat-emoji">${info.emoji}</span><span>${info.nome}</span></div>
            <div class="rel-cat-barras">
              <div class="rel-barra-wrap"><div class="rel-barra rel-barra--receita" style="width:${(v.rec/max*100).toFixed(1)}%"></div></div>
              <div class="rel-barra-wrap"><div class="rel-barra rel-barra--despesa" style="width:${(v.des/max*100).toFixed(1)}%"></div></div>
            </div>
            <div class="rel-cat-valores">
              <span class="valor-receita">+${moeda(v.rec)}</span>
              <span class="valor-despesa">−${moeda(v.des)}</span>
              <span class="rel-cat-saldo ${saldo>=0?'valor-receita':'valor-despesa'}">${saldo>=0?'+':'−'}${moeda(Math.abs(saldo))}</span>
            </div>`;
          divCat.appendChild(row);
        });
      }
    }
    /* Gráfico */
    const cv2 = q('grafico-pizza2'), leg2 = q('grafico-legenda2'), vaz2 = q('grafico-vazio2');
    if (cv2 && leg2) {
      const ctx2 = cv2.getContext('2d');
      ctx2.clearRect(0,0,cv2.width,cv2.height); leg2.innerHTML='';
      // Remove listeners anteriores antes de re-renderizar
      if (cv2._hoverFn)   { cv2.removeEventListener('mousemove',  cv2._hoverFn);  cv2._hoverFn=null; }
      if (cv2._leaveFn)   { cv2.removeEventListener('mouseleave', cv2._leaveFn);  cv2._leaveFn=null; }
      if (cv2._touchFn)   { cv2.removeEventListener('touchstart', cv2._touchFn);  cv2._touchFn=null; }
      const desp = tx.filter(t=>t.tipo==='despesa');
      if (!desp.length) { if(vaz2) vaz2.style.display='block'; cv2.style.display='none'; }
      else {
        if(vaz2) vaz2.style.display='none'; cv2.style.display='block';
        const map={};
        desp.forEach(t=>{ map[t.categoria]=(map[t.categoria]||0)+t.valor; });
        const total=Object.values(map).reduce((a,b)=>a+b,0);
        const cxP=cv2.width/2,cyP=cv2.height/2,r=Math.min(cxP,cyP)-10,ri=r*.55;
        const cs=getComputedStyle(document.documentElement);
        const clrHole=cs.getPropertyValue('--surface-raised').trim()||'#131622';
        const clrText=cs.getPropertyValue('--text-primary').trim()||'#f0f2ff';
        const clrDanger=cs.getPropertyValue('--color-danger').trim()||'#FF5C7A';

        const slices=[]; let ang=-Math.PI/2;
        Object.entries(map).sort((a,b)=>b[1]-a[1]).forEach(([cat,val],i)=>{
          const fatia=(val/total)*2*Math.PI,cor=CORES_REL[i%CORES_REL.length];
          const sa=ang, ea=ang+fatia;
          ctx2.beginPath();ctx2.moveTo(cxP,cyP);ctx2.arc(cxP,cyP,r,sa,ea);ctx2.closePath();
          ctx2.fillStyle=cor;ctx2.fill();
          ctx2.beginPath();ctx2.arc(cxP,cyP,ri,0,2*Math.PI);ctx2.fillStyle=clrHole;ctx2.fill();
          ang=ea;
          const _cm4=catMapUI(); const c=_cm4[cat]||_cm4.outros||{emoji:'📦',nome:cat},pct=((val/total)*100).toFixed(1);
          slices.push({sa,ea,val,cor,emoji:c.emoji,nome:c.nome,pct});
          const li=document.createElement('div');li.className='legenda-item';
          li.innerHTML=`<span class="legenda-cor" style="background:${cor}"></span><span>${c.emoji} ${c.nome} (${pct}%)</span>`;
          leg2.appendChild(li);
        });

        function drawCenterDefault() {
          ctx2.beginPath();ctx2.arc(cxP,cyP,ri-1,0,2*Math.PI);ctx2.fillStyle=clrHole;ctx2.fill();
          ctx2.textAlign='center';ctx2.textBaseline='middle';
          ctx2.font=`700 13px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrText;
          ctx2.fillText('Despesas',cxP,cyP-9);
          ctx2.font=`600 13px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrDanger;
          ctx2.fillText(moeda(total),cxP,cyP+10);
        }

        function drawCenterSlice(s) {
          ctx2.beginPath();ctx2.arc(cxP,cyP,ri-1,0,2*Math.PI);ctx2.fillStyle=clrHole;ctx2.fill();
          ctx2.textAlign='center';ctx2.textBaseline='middle';
          const label=(s.nome.length>11?s.nome.slice(0,11)+'…':s.nome);
          ctx2.font=`500 11px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrText;
          ctx2.globalAlpha=.85;ctx2.fillText(s.emoji+' '+label,cxP,cyP-17);
          ctx2.font=`700 12px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=s.cor;
          ctx2.globalAlpha=1;ctx2.fillText(moeda(s.val),cxP,cyP-1);
          ctx2.font=`500 11px 'Plus Jakarta Sans',sans-serif`;ctx2.fillStyle=clrText;
          ctx2.globalAlpha=.55;ctx2.fillText(s.pct+'%',cxP,cyP+14);
          ctx2.globalAlpha=1;
        }

        function hitTest(px,py) {
          const dx=px-cxP,dy=py-cyP,dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<ri||dist>r) return null;
          let a=Math.atan2(dy,dx); if(a<-Math.PI/2) a+=2*Math.PI;
          return slices.find(s=>a>=s.sa&&a<s.ea)||slices[slices.length-1]||null;
        }

        function canvasPos(e) {
          const rect=cv2.getBoundingClientRect();
          return [(e.clientX-rect.left)*cv2.width/rect.width,(e.clientY-rect.top)*cv2.height/rect.height];
        }

        drawCenterDefault();

        cv2._hoverFn = e => { const [px,py]=canvasPos(e),s=hitTest(px,py); cv2.style.cursor=s?'pointer':'default'; s?drawCenterSlice(s):drawCenterDefault(); };
        cv2._leaveFn = () => { cv2.style.cursor='default'; drawCenterDefault(); };
        cv2._touchFn = e => { e.preventDefault(); const t=e.touches[0]; const [px,py]=canvasPos(t); const s=hitTest(px,py); if(s) drawCenterSlice(s); };
        cv2.addEventListener('mousemove',  cv2._hoverFn);
        cv2.addEventListener('mouseleave', cv2._leaveFn);
        cv2.addEventListener('touchstart', cv2._touchFn, {passive:false});
      }
    }
    /* Stats */
    const sd = q('rel-stats');
    if (sd) {
      const rec = tx.filter(t=>t.tipo==='receita').reduce((a,t)=>a+t.valor,0);
      const des = tx.filter(t=>t.tipo==='despesa').reduce((a,t)=>a+t.valor,0);
      const sal = rec-des;
      const mR  = tx.filter(t=>t.tipo==='receita').sort((a,b)=>b.valor-a.valor)[0];
      const mD  = tx.filter(t=>t.tipo==='despesa').sort((a,b)=>b.valor-a.valor)[0];
      const eco = rec>0?((sal/rec)*100).toFixed(1):'0';
      sd.innerHTML=`
        <div class="stat-item"><span class="stat-label">Total de registros</span><span class="stat-valor">${tx.length}</span></div>
        <div class="stat-item"><span class="stat-label">Maior receita</span><span class="stat-valor valor-receita">${mR?moeda(mR.valor):'—'}</span>${mR?`<span class="stat-desc">${esc(mR.descricao)}</span>`:''}</div>
        <div class="stat-item"><span class="stat-label">Maior despesa</span><span class="stat-valor valor-despesa">${mD?moeda(mD.valor):'—'}</span>${mD?`<span class="stat-desc">${esc(mD.descricao)}</span>`:''}</div>
        <div class="stat-item"><span class="stat-label">Taxa de economia</span><span class="stat-valor ${sal>=0?'valor-receita':'valor-despesa'}">${eco}%</span></div>
        <div class="stat-item"><span class="stat-label">Saldo total</span><span class="stat-valor ${sal>=0?'valor-receita':'valor-despesa'}">${moeda(sal)}</span></div>`;
    }
  }

  /* ══════════════════════════════════════════
     CONFIGURAÇÕES
  ══════════════════════════════════════════ */
  q('btn-exportar')?.addEventListener('click', () => {
    let categorias = [];
    try { categorias = JSON.parse(localStorage.getItem('carteira_categorias') || '[]'); } catch {}
    const payload = {
      versao: '1.0',
      exportadoEm: new Date().toISOString(),
      transacoes: getTransacoes(),
      assinaturas: getAssinaturas(),
      rendas: getRendas(),
      categorias,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `money360_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    mostrarToast('✅ Dados exportados!');
  });

  q('btn-importar')?.addEventListener('change', e => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        // Novo formato: { transacoes: [], assinaturas: [], ... }
        if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.transacoes)) {
          localStorage.setItem('carteira_transacoes', JSON.stringify(d.transacoes));
          if (Array.isArray(d.assinaturas)) {
            localStorage.setItem('carteira_assinaturas', JSON.stringify(d.assinaturas));
          }
          if (Array.isArray(d.rendas)) {
            localStorage.setItem('carteira_rendas', JSON.stringify(d.rendas));
          }
          if (Array.isArray(d.categorias) && d.categorias.length) {
            localStorage.setItem('carteira_categorias', JSON.stringify(d.categorias));
          }
          const nAss = (d.assinaturas||[]).length;
          mostrarToast(`✅ ${d.transacoes.length} transações e ${nAss} assinatura(s) importadas! Recarregando…`);
        }
        // Formato antigo: array de transações
        else if (Array.isArray(d)) {
          localStorage.setItem('carteira_transacoes', JSON.stringify(d));
          mostrarToast(`✅ ${d.length} transações importadas! Recarregando…`);
        } else {
          throw new Error('formato inválido');
        }
        setTimeout(() => location.reload(), 1200);
      } catch { mostrarToast('❌ Arquivo inválido.'); }
    };
    r.readAsText(f); e.target.value='';
  });

  q('btn-limpar-tudo-config')?.addEventListener('click', () => window._confirmarApagarTudo?.());

  /* ══════════════════════════════════════════
     AUTO-SYNC: atualiza views abertas
  ══════════════════════════════════════════ */
  let _lastLen = -1;
  setInterval(() => {
    const d = getTransacoes();
    if (d.length !== _lastLen) {
      _lastLen = d.length;
      if (q('view-transacoes')?.classList.contains('view--active'))  renderTabelaTransacoes();
      if (q('view-relatorios')?.classList.contains('view--active'))  renderRelatorios();
      if (q('view-assinaturas')?.classList.contains('view--active')) renderAssinaturas();
      if (q('view-renda')?.classList.contains('view--active'))       renderRenda();
    }
  }, 600);

  /* ── Renderiza badges ao carregar ── */
  renderAssinaturas();
  renderRenda();
  verificarCobrancasAutomaticas();
  verificarRecebimentosAutomaticos();

});
