/**
 * OMNISCRIPTA — ATELIÊ EDITORIAL & MOTOR NARRATIVO
 * Persistência Híbrida: Supabase Cloud + LocalStorage Offline Cache + Fila de Sync
 * Módulos: Wiki de Personagens, Mesa de Ideias, Teia de Relações, Cronologia & Linha do Tempo, Ateliê de Escrita
 */

// ================= CHAVES SUPABASE =================
const SUPABASE_URL = "https://fthrbybewktrcliyuvue.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qA7nioFg7qmmy_jCsG4XeA_SuLDaNLr";

const STORAGE_KEY = 'omniscripta_journal_core_db';
const ACTIVE_KEY = 'omniscripta_journal_core_active_id';
const THEME_KEY = 'omniscripta_journal_theme';
const MEDIA_BUCKET = 'omniscripta-media';

let supabaseClient = null;
if (window.supabase && SUPABASE_URL.startsWith('https://')) {
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Supabase não inicializado:", e);
  }
}

let currentUser = null;
let currentAuthMode = 'login';

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(savedTheme);
}

function toggleAppTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    if (theme === 'dark') {
      btn.innerHTML = `<span class="theme-icon">☀️</span> <span class="theme-label">Pergaminho</span>`;
    } else {
      btn.innerHTML = `<span class="theme-icon">🌙</span> <span class="theme-label">Dark Academia</span>`;
    }
  }
}

const INITIAL_EMPTY_NOVEL = {
  id: "novel_" + Date.now(),
  name: "Minha Obra",
  genre: "",
  logline: "",
  boards: [
    {
      id: "board_default",
      name: "Mesa Principal de Ideias",
      desc: "Mesa visual para post-its, pistas e moodboard",
      items: [],
      connections: [],
      drawings: []
    }
  ],
  activeBoardId: "board_default",
  characters: [],
  relationships: [],
  chapters: [],
  timelineEvents: []
};

const CHAPTER_STATUSES = [
  { value: 'ideia',      label: '💡 Ideia' },
  { value: 'rascunho',   label: '✏️ Rascunho' },
  { value: 'escrevendo', label: '📝 Escrevendo' },
  { value: 'revisao',    label: '🔍 Em Revisão' },
  { value: 'finalizado', label: '✅ Finalizado' }
];

const TIMELINE_EVENT_TYPES = [
  { value: 'presente',  label: '⏳ Presente da Narrativa', icon: '⏳' },
  { value: 'flashback', label: '🕯️ Flashback / Memória',   icon: '🕯️' },
  { value: 'historia',  label: '📜 História Antiga / Lore', icon: '📜' },
  { value: 'revelacao', label: '🔍 Revelação / Segredo',    icon: '🔍' },
  { value: 'virada',    label: '⚡ Ponto de Virada',        icon: '⚡' }
];

const CHAR_SCHEMA = [
  {
    section: 'GERAL',
    fields: [
      ['funcao', 'Função'],
      ['apelido', 'Apelido'],
      ['nacionalidade', 'Nacionalidade'],
      ['genero', 'Gênero'],
      ['idade', 'Idade'],
      ['data_nascimento', 'Data de Nascimento'],
      ['local_nascimento', 'Local de Nascimento'],
      ['cidade_natal', 'Cidade Natal'],
      ['mora_atualmente', 'Onde Mora Atualmente'],
      ['casa_descricao', 'Descrição e Decoração da Casa'],
      ['bairro', 'Bairro'],
      ['ocupacao', 'Ocupação'],
      ['satisfacao_trabalho', 'Satisfação com o Trabalho'],
      ['financas', 'Finanças'],
      ['renda', 'Renda'],
      ['habilidades', 'Habilidades'],
      ['sexualidade', 'Sexualidade'],
      ['habitos_pessoais', 'Hábitos Pessoais'],
      ['hobbies', 'Hobbies/Passatempos'],
      ['carro', 'Carro'],
      ['esporte_favorito', 'Esporte Favorito'],
      ['comida_favorita', 'Comida Favorita'],
      ['musica_favorita', 'Música Favorita'],
      ['filmes_favoritos', 'Filmes Favoritos'],
      ['feriados_favoritos', 'Feriados Favoritos'],
      ['ditado_favorito', 'Ditado Favorito']
    ]
  },
  {
    section: 'FÍSICO',
    fields: [
      ['altura', 'Altura'],
      ['peso', 'Peso'],
      ['descricao_corpo', 'Descrição do Corpo'],
      ['cabelo', 'Cabelo'],
      ['etnia', 'Etnia'],
      ['especie', 'Espécie'],
      ['cheiro', 'Cheiro'],
      ['tom_pele', 'Tom de Pele'],
      ['descricao_rosto', 'Descrição do Rosto'],
      ['olhos', 'Olhos'],
      ['marcas_distintas', 'Marcas Que o Distinguem'],
      ['estilo_vestimenta', 'Estilo de Vestimenta'],
      ['acessorios', 'Acessórios'],
      ['postura_fisica', 'Postura Física'],
      ['padrao_fala', 'Padrão de Fala'],
      ['gestos', 'Gestos'],
      ['deficiencias', 'Deficiências'],
      ['estilo', 'Estilo'],
      ['falhas', 'Falhas'],
      ['qualidades', 'Qualidades']
    ]
  },
  {
    section: 'MENTAL',
    fields: [
      ['educacao', 'Educação'],
      ['inteligencia', 'Inteligência'],
      ['graduacao_escolar', 'Graduação Escolar'],
      ['atitude_escola', 'Atitude em Relação à Escola'],
      ['doenca_mental', 'Doença Mental'],
      ['experiencias_aprendizagem', 'Experiências de Aprendizagem'],
      ['tracos_positivos', 'Traços Positivos de Personalidade'],
      ['tracos_negativos', 'Traços Negativos de Personalidade'],
      ['maus_habitos', 'Mau-Hábitos'],
      ['filosofia_vida', 'Filosofia de Vida'],
      ['atitude_politica', 'Atitude Política'],
      ['metas_curto_prazo', 'Metas de Curto Prazo'],
      ['metas_longo_prazo', 'Metas de Longo Prazo'],
      ['maior_sonho', 'Maior Sonho'],
      ['sonho_secreto', 'Sonho Secreto'],
      ['consideracao_outros', 'Consideração Pelos Outros'],
      ['percepcao_si_mesmo', 'Percepção Sobre Si Mesmo'],
      ['senso_humor', 'Senso de Humor'],
      ['temperamento', 'Temperamento'],
      ['emocao_logica', 'Emoção ou Lógica'],
      ['lider_seguidor', 'Líder ou Seguidor'],
      ['dificuldades', 'Dificuldades']
    ]
  },
  {
    section: 'EMOCIONAL',
    fields: [
      ['forca', 'Força'],
      ['fraqueza', 'Fraqueza'],
      ['introvertido_extrovertido', 'Introvertido ou Extrovertido'],
      ['raiva', 'Raiva'],
      ['tristeza', 'Tristeza'],
      ['otimismo', 'Otimismo'],
      ['conflito', 'Conflito'],
      ['mudanca', 'Mudança'],
      ['derrota', 'Derrota'],
      ['objetivo_vida', 'Objetivo de Vida'],
      ['mudanca_vida', 'Mudança de Vida'],
      ['motivacao', 'Motivação'],
      ['medos', 'Medos'],
      ['felicidade', 'Felicidade'],
      ['opinioes', 'Opiniões'],
      ['generoso', 'Generoso'],
      ['romantico', 'Romântico'],
      ['sensivel', 'Sensível'],
      ['aventureiro', 'Aventureiro'],
      ['politico_rude', 'Político ou Rude'],
      ['mau_humor', 'Mau-Humor'],
      ['conspiracao', 'Conspiração']
    ]
  },
  {
    section: 'ESPIRITUAL',
    fields: [
      ['crenca', 'Crença'],
      ['religiao', 'Religião'],
      ['espiritualidade', 'Espiritualidade']
    ]
  },
  {
    section: 'RELACIONAMENTOS',
    fields: [
      ['estado_civil', 'Estado Civil'],
      ['relacionamento_anterior', 'Relacionamento Anterior'],
      ['familia_atual', 'Família Atual'],
      ['historico_familiar', 'Histórico Familiar'],
      ['animais_estimacao', 'Animais de Estimação'],
      ['amigos', 'Amigos'],
      ['colegas', 'Colegas'],
      ['conhecidos', 'Conhecidos'],
      ['outras_relacoes', 'Outras Relações Próximas'],
      ['pessoas_influentes', 'Pessoas Influentes'],
      ['inimigos', 'Inimigos'],
      ['com_mulheres', 'Com Mulheres'],
      ['com_homens', 'Com Homens'],
      ['com_outros_personagens', 'Com outros Personagens']
    ]
  }
];

function getF(c, key) {
  return (c && c.f && c.f[key]) ? String(c.f[key]) : '';
}

let appData = {
  activeProjectId: null,
  projects: []
};

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) appData.projects = JSON.parse(stored);
} catch (e) {
  appData.projects = [];
}

if (!appData.projects || appData.projects.length === 0) {
  appData.projects = [INITIAL_EMPTY_NOVEL];
  appData.activeProjectId = INITIAL_EMPTY_NOVEL.id;
} else {
  const savedActive = localStorage.getItem(ACTIVE_KEY);
  if (savedActive && appData.projects.some(p => p.id === savedActive)) {
    appData.activeProjectId = savedActive;
  } else {
    appData.activeProjectId = appData.projects[0].id;
  }
}

function normalizeProjectsData(projectsList) {
  projectsList.forEach(p => {
    if (!p.boards || p.boards.length === 0) {
      p.boards = [{
        id: "board_default",
        name: "Mesa Principal de Ideias",
        desc: "Mesa de referências",
        items: [],
        connections: [],
        drawings: []
      }];
      p.activeBoardId = "board_default";
    }
    if (!p.chapters) p.chapters = [];
    p.chapters.forEach(ch => {
      if (typeof ch.content !== 'string') ch.content = '';
      if (!ch.wordCount && ch.content) ch.wordCount = countWords(ch.content);
    });
    if (!p.timelineEvents) p.timelineEvents = [];
    p.timelineEvents.forEach(ev => {
      if (!Array.isArray(ev.characterIds)) ev.characterIds = [];
      if (ev.sortOrder === undefined) ev.sortOrder = 0;
    });
    (p.characters || []).forEach(c => {
      if (!c.f) c.f = {};
      if (typeof c.description !== 'string') c.description = '';
    });
  });
}
normalizeProjectsData(appData.projects);

let currentCategoryFilter = 'all';
let selectedRelationshipId = null;
let timelineViewMode = 'track';

let boardZoom = 1;
let boardPan = { x: 0, y: 0 };
let isBoardPanning = false;
let startBoardPan = { x: 0, y: 0 };

let isDrawingMode = false;
let isEraserMode = false;
let isDrawing = false;
let isErasing = false;
let currentDrawingPath = null;
let currentPenColor = "#c49a6c";
let currentPenWidth = 4;

let draggedBoardItem = null;
let boardItemOffset = { x: 0, y: 0 };

let activeTouches = new Map();
let initialPinchDistance = null;
let initialPinchZoom = 1;

let draggedWebNode = null;
let webOffset = { x: 0, y: 0 };
let isConnectingWire = false;
let wireSourceChar = null;
let hoveredTargetCharId = null;

let draggedChapterId = null;
let activeWritingChapterId = null;

function getCurrentProject() {
  let proj = appData.projects.find(p => p.id === appData.activeProjectId);
  if (!proj) {
    proj = appData.projects[0];
    appData.activeProjectId = proj.id;
  }
  return proj;
}

function getCurrentBoard() {
  const proj = getCurrentProject();
  let board = proj.boards.find(b => b.id === proj.activeBoardId);
  if (!board) {
    board = proj.boards[0];
    proj.activeBoardId = board.id;
  }
  return board;
}

function countWords(str) {
  if (!str) return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

let syncDebounceTimer = null;

async function syncStorage() {
  updateCounts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appData.projects));
  localStorage.setItem(ACTIVE_KEY, appData.activeProjectId);

  if (!navigator.onLine) {
    setSyncStatus('offline');
    return;
  }

  if (supabaseClient && currentUser) {
    setSyncStatus('syncing');
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(async () => {
      try {
        const proj = getCurrentProject();
        const { error } = await supabaseClient
          .from('projects')
          .upsert({
            id: String(proj.id),
            user_id: currentUser.id,
            name: proj.name,
            genre: proj.genre || '',
            logline: proj.logline || '',
            project_data: proj,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });

        if (error) throw error;
        setSyncStatus('cloud');
      } catch (err) {
        console.error("Falha ao sincronizar com nuvem:", err);
        setSyncStatus('local');
      }
    }, 500);
  } else {
    setSyncStatus('local');
  }
}

function setSyncStatus(status) {
  const badge = document.getElementById('cloud-sync-status');
  if (!badge) return;
  badge.className = 'sync-badge';
  if (status === 'cloud') {
    badge.classList.add('sync-cloud');
    badge.textContent = '☁️ Nuvem Sincronizada';
  } else if (status === 'syncing') {
    badge.classList.add('sync-syncing');
    badge.textContent = '⏳ Gravando...';
  } else if (status === 'offline') {
    badge.classList.add('sync-offline');
    badge.textContent = '⚡ Offline (Cache Local)';
  } else {
    badge.classList.add('sync-local');
    badge.textContent = '📁 Modo Offline / Local';
  }
}

window.addEventListener('online', () => {
  setSyncStatus('syncing');
  syncStorage();
});

window.addEventListener('offline', () => {
  setSyncStatus('offline');
});

async function loadUserProjectsFromCloud() {
  if (!supabaseClient || !currentUser) return;
  setSyncStatus('syncing');

  try {
    const { data, error } = await supabaseClient
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      appData.projects = data.map(row => ({
        ...row.project_data,
        id: String(row.id)
      }));
      normalizeProjectsData(appData.projects);
      appData.activeProjectId = appData.projects[0].id;
    } else {
      await syncStorage();
    }
    setSyncStatus('cloud');
  } catch (err) {
    console.error("Erro ao carregar dados da nuvem:", err);
    setSyncStatus('local');
  }

  renderProjectSelector();
  refreshAllViews();
}

async function uploadMediaFileToCloud(file, statusElementId) {
  const statusEl = statusElementId ? document.getElementById(statusElementId) : null;
  
  if (!supabaseClient || !currentUser) {
    if (statusEl) statusEl.textContent = "Aviso: Sem login ativo. Imagem salva localmente.";
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  if (statusEl) statusEl.textContent = "⏳ Enviando imagem para a nuvem...";

  try {
    const fileExt = file.name.split('.').pop();
    const cleanFileName = `${currentUser.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabaseClient.storage
      .from(MEDIA_BUCKET)
      .upload(cleanFileName, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabaseClient.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(cleanFileName);

    if (statusEl) statusEl.textContent = "✅ Imagem salva na nuvem!";
    return publicData.publicUrl;
  } catch (err) {
    console.error("Erro no upload da imagem:", err);
    if (statusEl) statusEl.textContent = "❌ Falha no upload para nuvem. Usando local.";
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }
}

function updateAuthUI() {
  const loggedOutBox = document.getElementById('auth-logged-out');
  const loggedInBox = document.getElementById('auth-logged-in');
  const emailDisplay = document.getElementById('user-email-display');

  if (currentUser) {
    loggedOutBox.style.display = 'none';
    loggedInBox.style.display = 'flex';
    emailDisplay.textContent = currentUser.email;
    setSyncStatus('cloud');
  } else {
    loggedOutBox.style.display = 'block';
    loggedInBox.style.display = 'none';
    setSyncStatus('local');
  }
}

function openAuthModal(mode = 'login') {
  setAuthMode(mode);
  document.getElementById('auth-message').style.display = 'none';
  document.getElementById('form-auth').reset();
  document.getElementById('modal-auth').classList.add('open');
}

function setAuthMode(mode) {
  currentAuthMode = mode;
  const isLogin = mode === 'login';
  document.getElementById('auth-tab-login').classList.toggle('active', isLogin);
  document.getElementById('auth-tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('modal-auth-title').textContent = isLogin ? "Acessar Conta Omniscripta" : "Criar Nova Conta";
  document.getElementById('auth-submit-btn').textContent = isLogin ? "Entrar no Caderno" : "Cadastrar e Sincronizar";
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const msgBox = document.getElementById('auth-message');
  const submitBtn = document.getElementById('auth-submit-btn');

  if (!supabaseClient) {
    msgBox.className = 'auth-message error';
    msgBox.textContent = "Supabase não configurado corretamente.";
    msgBox.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Processando...";
  msgBox.style.display = 'none';

  try {
    if (currentAuthMode === 'login') {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      currentUser = data.user;
      closeModal('modal-auth');
      updateAuthUI();
      await loadUserProjectsFromCloud();
    } else {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        currentUser = data.user;
        closeModal('modal-auth');
        updateAuthUI();
        await loadUserProjectsFromCloud();
      } else {
        msgBox.className = 'auth-message success';
        msgBox.textContent = "Conta criada com sucesso! Verifique seu e-mail para confirmar.";
        msgBox.style.display = 'block';
      }
    }
  } catch (err) {
    msgBox.className = 'auth-message error';
    msgBox.textContent = err.message || "Erro na autenticação.";
    msgBox.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = currentAuthMode === 'login' ? "Entrar no Caderno" : "Cadastrar e Sincronizar";
  }
}

async function logoutUser() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI();
  location.reload();
}

if (supabaseClient) {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    currentUser = session ? session.user : null;
    updateAuthUI();
    if (currentUser && event === 'SIGNED_IN') {
      await loadUserProjectsFromCloud();
    }
  });
}

function updateCounts() {
  const proj = getCurrentProject();
  const board = getCurrentBoard();
  document.getElementById('count-char').textContent = proj.characters.length;
  document.getElementById('count-board').textContent = board.items.length;
  document.getElementById('count-web').textContent = proj.relationships.length;
  document.getElementById('count-timeline').textContent = (proj.timelineEvents || []).length;
  document.getElementById('count-chapters').textContent = proj.chapters.length;
  document.getElementById('project-logline').textContent = proj.logline ? `"${proj.logline}"` : "Nenhuma sinopse ou premissa definida.";
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');

  if (tabId === 'tab-web') renderWeb();
  if (tabId === 'tab-board') renderBoard();
  if (tabId === 'tab-timeline') renderTimeline();
  if (tabId === 'tab-chapters') renderChapters();
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('open');
}

function renderProjectSelector() {
  const select = document.getElementById('project-select');
  select.innerHTML = appData.projects.map(p => `
    <option value="${p.id}" ${p.id === appData.activeProjectId ? 'selected' : ''}>
      ${p.name} ${p.genre ? `[${p.genre}]` : ''}
    </option>
  `).join('');
}

function switchProject(projectId) {
  appData.activeProjectId = projectId;
  currentCategoryFilter = 'all';
  selectedRelationshipId = null;
  resetBoardZoom();
  syncStorage();
  renderProjectSelector();
  refreshAllViews();
}

function openNewProjectModal() {
  document.getElementById('modal-project-title').textContent = "Criar Nova Obra";
  document.getElementById('project-id').value = "";
  document.getElementById('form-project').reset();
  document.getElementById('modal-project').classList.add('open');
}

function openEditProjectModal() {
  const proj = getCurrentProject();
  document.getElementById('modal-project-title').textContent = "Configurações da Obra";
  document.getElementById('project-id').value = proj.id;
  document.getElementById('proj-name').value = proj.name;
  document.getElementById('proj-genre').value = proj.genre || "";
  document.getElementById('proj-logline').value = proj.logline || "";
  document.getElementById('modal-project').classList.add('open');
}

function saveProject(e) {
  e.preventDefault();
  const id = document.getElementById('project-id').value;
  const name = document.getElementById('proj-name').value;
  const genre = document.getElementById('proj-genre').value;
  const logline = document.getElementById('proj-logline').value;

  if (id) {
    const idx = appData.projects.findIndex(p => p.id === id);
    appData.projects[idx].name = name;
    appData.projects[idx].genre = genre;
    appData.projects[idx].logline = logline;
  } else {
    const newProj = {
      id: "novel_" + Date.now(),
      name,
      genre,
      logline,
      boards: [
        {
          id: "board_" + Date.now(),
          name: "Mesa Principal de Ideias",
          desc: "Mesa de criação",
          items: [],
          connections: [],
          drawings: []
        }
      ],
      activeBoardId: "",
      characters: [],
      relationships: [],
      chapters: [],
      timelineEvents: []
    };
    newProj.activeBoardId = newProj.boards[0].id;
    appData.projects.push(newProj);
    appData.activeProjectId = newProj.id;
  }

  syncStorage();
  renderProjectSelector();
  refreshAllViews();
  closeModal('modal-project');
}

async function deleteCurrentProject() {
  if (appData.projects.length <= 1) {
    alert("Você deve manter ao menos uma obra ativa.");
    return;
  }
  const proj = getCurrentProject();
  if (confirm(`Deseja realmente apagar a obra "${proj.name}"? Todos os manuscritos e pranchetas serão excluídos.`)) {
    const deletedId = proj.id;
    appData.projects = appData.projects.filter(p => p.id !== deletedId);
    appData.activeProjectId = appData.projects[0].id;

    if (supabaseClient && currentUser) {
      await supabaseClient.from('projects').delete().eq('id', deletedId);
    }

    syncStorage();
    renderProjectSelector();
    refreshAllViews();
  }
}

const CARD_ACCENT_PALETTE = ['#d4af37', '#c88344', '#536b78', '#a63d40', '#4f8a65', '#8a6d9e'];
function getCategoryAccent(category) {
  if (!category) return 'var(--border-subtle)';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CARD_ACCENT_PALETTE[Math.abs(hash) % CARD_ACCENT_PALETTE.length];
}

function openQuickReference() {
  const proj = getCurrentProject();
  const list = document.getElementById('quickref-list');
  const sorted = [...proj.characters].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  if (sorted.length === 0) {
    list.innerHTML = `<div class="empty-state">Nenhum personagem cadastrado ainda nesta obra.</div>`;
  } else {
    list.innerHTML = sorted.map(c => {
      const summary = (c.description || '').trim();
      const apelido = getF(c, 'apelido');
      const funcao = getF(c, 'funcao');
      const ocupacao = getF(c, 'ocupacao');
      return `
        <div class="quickref-row">
          <div>
            <div class="quickref-name">${c.name}</div>
            ${apelido ? `<div class="quickref-alias">"${apelido}"</div>` : ''}
          </div>
          <div>
            <div class="quickref-role">${funcao || '—'}</div>
            ${ocupacao ? `<div class="quickref-category">${ocupacao}</div>` : ''}
          </div>
          <div class="quickref-summary-col">${summary ? summary.substring(0, 160) + (summary.length > 160 ? '…' : '') : '<em>Sem resumo cadastrado.</em>'}</div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('modal-quickref').classList.add('open');
}

// ================= 1. WIKI DE PERSONAGENS =================
function renderCharacters() {
  const proj = getCurrentProject();
  const query = document.getElementById('search-char').value.toLowerCase();
  const grid = document.getElementById('grid-characters');
  const filterContainer = document.getElementById('faction-filters');

  const categories = Array.from(new Set(proj.characters.map(c => getF(c, 'funcao')).filter(Boolean)));
  filterContainer.innerHTML = categories.length ? `
    <button class="filter-btn ${currentCategoryFilter === 'all' ? 'active' : ''}" onclick="setCharFilter('all', this)">Todos</button>
    ${categories.map(cat => `
      <button class="filter-btn ${currentCategoryFilter === cat ? 'active' : ''}" onclick="setCharFilter('${cat}', this)">${cat}</button>
    `).join('')}
  ` : '';

  const filtered = proj.characters.filter(c => {
    const funcao = getF(c, 'funcao');
    const apelido = getF(c, 'apelido');
    const ocupacao = getF(c, 'ocupacao');
    let matchText = (c.name && c.name.toLowerCase().includes(query)) ||
                      (apelido && apelido.toLowerCase().includes(query)) ||
                      (funcao && funcao.toLowerCase().includes(query)) ||
                      (ocupacao && ocupacao.toLowerCase().includes(query)) ||
                      (c.description && c.description.toLowerCase().includes(query));
    if (!matchText && query && c.f) {
      matchText = Object.values(c.f).some(v => v && String(v).toLowerCase().includes(query));
    }
    const matchCategory = currentCategoryFilter === 'all' || funcao === currentCategoryFilter;
    return matchText && matchCategory;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        Nenhum artigo de personagem criado ainda.<br>Clique em <strong>+ Criar Ficha de Personagem</strong> para começar sua enciclopédia.
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(c => {
    const avatarHTML = c.photo 
      ? `<img src="${c.photo}" class="card-avatar" alt="${c.name}">`
      : `<div class="card-avatar-empty">${c.name ? c.name.charAt(0).toUpperCase() : '?'}</div>`;
    const funcao = getF(c, 'funcao');
    const apelido = getF(c, 'apelido');
    const ocupacao = getF(c, 'ocupacao');
    const summary = (c.description || '').trim();

    return `
      <div class="card" style="--card-accent: ${getCategoryAccent(funcao)};">
        <div>
          <div class="card-top">
            <span>${apelido || 'FICHA DRAMÁTICA'}</span>
            <span>${funcao || 'GERAL'}</span>
          </div>
          <div class="card-person-box">
            ${avatarHTML}
            <div class="card-info">
              <div class="card-title">${c.name}</div>
              <div class="card-role">${ocupacao || ''}</div>
            </div>
          </div>
          <div class="card-vestige">"${(summary || 'Sem resumo cadastrado.').substring(0, 100)}..."</div>
        </div>
        <div class="card-actions">
          <button class="btn btn-primary" onclick="openViewCharacter(${c.id})">Abrir Arquivo ↗</button>
          <div style="display:flex; gap:4px;">
            <button class="btn" onclick="openCharacterModal(${c.id})">Editar</button>
            <button class="btn btn-danger" onclick="deleteCharacter(${c.id})">✕</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setCharFilter(category, btn) {
  currentCategoryFilter = category;
  renderCharacters();
}

async function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('char-img-preview');
  const url = await uploadMediaFileToCloud(file, 'char-img-upload-status');
  document.getElementById('char-image-data').value = url;
  preview.src = url;
  preview.style.display = 'block';
}

function handleImageUrlInput(e) {
  const url = e.target.value;
  document.getElementById('char-image-data').value = url;
  const preview = document.getElementById('char-img-preview');
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

let charFormBuilt = false;
function buildCharacterFormFields() {
  const container = document.getElementById('char-dynamic-fields');
  if (!container || charFormBuilt) return;

  container.innerHTML = CHAR_SCHEMA.map(section => `
    <div class="ficha-section-title">${section.section} <span class="ficha-section-hint">— todos os campos são opcionais</span></div>
    <div class="ficha-grid">
      ${section.fields.map(([key, label]) => `
        <div class="form-group ficha-field">
          <label>${label}</label>
          <textarea id="char-f-${key}" class="form-textarea form-textarea-compact" rows="2" placeholder="${label}..."></textarea>
        </div>
      `).join('')}
    </div>
  `).join('');

  charFormBuilt = true;
}

function openCharacterModal(id = null) {
  buildCharacterFormFields();
  const isEdit = id !== null;
  const proj = getCurrentProject();
  document.getElementById('modal-char-title').textContent = isEdit ? "Editar Ficha do Personagem" : "Nova Ficha de Personagem";
  document.getElementById('char-id').value = isEdit ? id : "";
  document.getElementById('char-img-upload-status').textContent = "";
  
  const preview = document.getElementById('char-img-preview');
  document.getElementById('char-img-file').value = "";
  document.getElementById('char-img-url').value = "";

  if (isEdit) {
    const c = proj.characters.find(item => item.id === id);
    document.getElementById('char-name').value = c.name || "";
    document.getElementById('char-description').value = c.description || "";
    document.getElementById('char-image-data').value = c.photo || "";

    CHAR_SCHEMA.forEach(section => {
      section.fields.forEach(([key]) => {
        const el = document.getElementById(`char-f-${key}`);
        if (el) el.value = getF(c, key);
      });
    });

    if (c.photo) {
      preview.src = c.photo;
      preview.style.display = 'block';
    } else {
      preview.style.display = 'none';
    }
  } else {
    document.getElementById('char-name').value = "";
    document.getElementById('char-description').value = "";
    document.getElementById('char-image-data').value = "";
    CHAR_SCHEMA.forEach(section => {
      section.fields.forEach(([key]) => {
        const el = document.getElementById(`char-f-${key}`);
        if (el) el.value = "";
      });
    });
    preview.style.display = 'none';
  }
  document.getElementById('modal-char').classList.add('open');
}

function saveCharacter(e) {
  e.preventDefault();
  const proj = getCurrentProject();
  const id = document.getElementById('char-id').value;

  const f = {};
  CHAR_SCHEMA.forEach(section => {
    section.fields.forEach(([key]) => {
      const el = document.getElementById(`char-f-${key}`);
      f[key] = el ? el.value : "";
    });
  });

  const charData = {
    name: document.getElementById('char-name').value,
    description: document.getElementById('char-description').value,
    photo: document.getElementById('char-image-data').value || "",
    f
  };

  if (id) {
    const index = proj.characters.findIndex(c => c.id === Number(id));
    proj.characters[index] = { ...proj.characters[index], ...charData };
  } else {
    const newChar = {
      id: Date.now(),
      ...charData,
      x: Math.floor(Math.random() * 400) + 150,
      y: Math.floor(Math.random() * 300) + 150
    };
    proj.characters.push(newChar);
  }

  syncStorage();
  renderCharacters();
  renderWeb();
  renderTimeline();
  closeModal('modal-char');
}

function deleteCharacter(id) {
  const proj = getCurrentProject();
  if (confirm("Deseja realmente remover este personagem do arquivo?")) {
    proj.characters = proj.characters.filter(c => c.id !== id);
    proj.relationships = proj.relationships.filter(r => r.sourceId !== id && r.targetId !== id);
    proj.boards.forEach(b => {
      (b.items || []).forEach(item => {
        if (item.characterId === id) item.characterId = null;
      });
    });
    if (proj.timelineEvents) {
      proj.timelineEvents.forEach(ev => {
        ev.characterIds = (ev.characterIds || []).filter(cid => cid !== id);
      });
    }
    syncStorage();
    renderCharacters();
    renderWeb();
    renderTimeline();
  }
}

function openViewCharacter(id) {
  const proj = getCurrentProject();
  const c = proj.characters.find(item => item.id === id);
  const container = document.getElementById('wiki-article-container');

  const relations = proj.relationships.filter(r => r.sourceId === id || r.targetId === id);
  const boardMentions = [];
  proj.boards.forEach(b => {
    (b.items || []).forEach(item => {
      if (item.characterId === id) boardMentions.push({ boardId: b.id, boardName: b.name, item });
    });
  });

  const timelineMentions = (proj.timelineEvents || []).filter(ev => (ev.characterIds || []).includes(id));

  const photoHTML = c.photo 
    ? `<img src="${c.photo}" class="wiki-infobox-photo" alt="${c.name}">`
    : `<div class="wiki-infobox-photo-empty">${c.name ? c.name.charAt(0).toUpperCase() : '?'}</div>`;

  const funcao = getF(c, 'funcao');
  const apelido = getF(c, 'apelido');
  const ocupacao = getF(c, 'ocupacao');

  const fichaSections = CHAR_SCHEMA.map(section => {
    const filled = section.fields.filter(([key]) => getF(c, key).trim() !== '');
    return { ...section, filled };
  }).filter(section => section.filled.length > 0);

  let secCounter = 0;
  const tocItems = [];
  const sectionsHTML = fichaSections.map(section => {
    secCounter++;
    const anchor = `wiki-sec-${section.section.toLowerCase().replace(/[^a-z]+/g, '-')}`;
    tocItems.push(`<li>${secCounter}. <a href="#${anchor}">${section.section}</a></li>`);
    return `
      <div class="wiki-section" id="${anchor}">
        <h2 class="wiki-section-h2">${secCounter}. ${section.section}</h2>
        <div class="wiki-fact-grid">
          ${section.filled.map(([key, label]) => `
            <div class="wiki-fact"><strong>${label}</strong><span>${getF(c, key).replace(/</g, '&lt;')}</span></div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');

  if (relations.length > 0) {
    secCounter++;
    tocItems.push(`<li>${secCounter}. <a href="#wiki-sec-relations">Relações & Dinâmicas</a></li>`);
  }
  if (timelineMentions.length > 0) {
    secCounter++;
    tocItems.push(`<li>${secCounter}. <a href="#wiki-sec-timeline">Trajetória Cronológica</a></li>`);
  }
  if (boardMentions.length > 0) {
    secCounter++;
    tocItems.push(`<li>${secCounter}. <a href="#wiki-sec-board">Mural & Pistas Relacionadas</a></li>`);
  }

  container.innerHTML = `
    <div class="wiki-article">
      <div class="wiki-header">
        <div class="wiki-subtitle">Ficha da Enciclopédia &bull; ${funcao || 'Geral'}</div>
        <h1>${c.name}</h1>
        ${apelido ? `<div style="font-family:var(--font-mono); font-size:0.85rem; color:var(--ink-muted); margin-top:2px;">Também conhecido(a) como: <em>${apelido}</em></div>` : ''}
      </div>

      <div class="wiki-body-grid">
        <div class="wiki-main-col">
          <div class="wiki-lead-section">
            ${c.description ? c.description.replace(/\n/g, '<br><br>') : `<strong>${c.name}</strong> ainda não possui descrição cadastrada.`}
          </div>

          ${tocItems.length ? `
            <div class="wiki-toc">
              <div class="wiki-toc-title">Sumário da Ficha</div>
              <ul>${tocItems.join('')}</ul>
            </div>
          ` : ''}

          ${sectionsHTML}

          ${relations.length > 0 ? `
            <div class="wiki-section" id="wiki-sec-relations">
              <h2 class="wiki-section-h2">Relações & Dinâmicas</h2>
              <div>
                ${relations.map(r => {
                  const isSource = r.sourceId === id;
                  const otherId = isSource ? r.targetId : r.sourceId;
                  const other = proj.characters.find(char => char.id === otherId);
                  return `
                    <div style="margin-bottom:12px; background:var(--bg-canvas); padding:14px; border:1px solid var(--border-subtle);">
                      <div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--accent-gold); text-transform:uppercase;">
                        ✦ ${other ? other.name : 'Outro'}: <em>${r.title}</em> ${r.direction === 'forward' ? '➔' : (r.direction === 'backward' ? '⬅' : '↔')}
                      </div>
                      <div style="font-size:0.92rem; color:var(--ink-secondary); margin-top:4px;">${r.prose}</div>
                      ${r.asymmetry ? `<div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--accent-red); margin-top:4px;">⚖️ Assimetria: ${r.asymmetry}</div>` : ''}
                      ${r.pact ? `<div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--accent-purple); margin-top:4px;">🔒 Pacto: ${r.pact}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${timelineMentions.length > 0 ? `
            <div class="wiki-section" id="wiki-sec-timeline">
              <h2 class="wiki-section-h2">Trajetória Cronológica</h2>
              <div>
                ${timelineMentions.map(ev => `
                  <div style="margin-bottom:10px; background:var(--bg-canvas); padding:12px; border:1px solid var(--border-subtle); border-left:3px solid ${ev.color || 'var(--accent-gold)'};">
                    <div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--accent-gold);">📅 ${ev.dateStr || 'Sem data'} &bull; <em>${ev.title}</em></div>
                    <div style="font-size:0.88rem; color:var(--ink-secondary); margin-top:3px;">${ev.summary || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${boardMentions.length > 0 ? `
            <div class="wiki-section" id="wiki-sec-board">
              <h2 class="wiki-section-h2">Mural & Pistas Relacionadas</h2>
              <div>
                ${boardMentions.map(m => {
                  const typeLabels = { note: '📝 Post-it', image: '🖼 Fotografia', clue: '📌 Pista' };
                  const preview = m.item.type === 'note' ? (m.item.text || '') : (m.item.type === 'clue' ? (m.item.desc || '') : (m.item.caption || ''));
                  return `
                    <div style="margin-bottom:12px; background:var(--bg-canvas); padding:14px; border:1px solid var(--border-subtle); display:flex; justify-content:space-between; align-items:center; gap:12px;">
                      <div>
                        <div style="font-family:var(--font-mono); font-size:0.72rem; color:var(--accent-gold); text-transform:uppercase;">${typeLabels[m.item.type] || 'Item'} &bull; ${m.boardName}</div>
                        <div style="font-size:0.98rem; color:var(--ink-main); font-weight:600; margin-top:2px;">${m.item.title}</div>
                        ${preview ? `<div style="font-size:0.88rem; color:var(--ink-secondary); margin-top:2px;">${preview.substring(0, 90)}${preview.length > 90 ? '...' : ''}</div>` : ''}
                      </div>
                      <button class="btn btn-secondary btn-sm" style="flex-shrink:0;" onclick="jumpToBoardItem('${m.boardId}', ${m.item.id})">Ver no Mural ↗</button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <aside class="wiki-infobox">
          <div class="wiki-infobox-header">${c.name}</div>
          ${photoHTML}
          
          <table class="wiki-infobox-table">
            ${apelido ? `<tr><td class="wiki-infobox-label">Apelido</td><td class="wiki-infobox-value">${apelido}</td></tr>` : ''}
            ${funcao ? `<tr><td class="wiki-infobox-label">Função</td><td class="wiki-infobox-value">${funcao}</td></tr>` : ''}
            ${ocupacao ? `<tr><td class="wiki-infobox-label">Ocupação</td><td class="wiki-infobox-value">${ocupacao}</td></tr>` : ''}
            ${getF(c, 'idade') ? `<tr><td class="wiki-infobox-label">Idade</td><td class="wiki-infobox-value">${getF(c, 'idade')}</td></tr>` : ''}
            ${getF(c, 'genero') ? `<tr><td class="wiki-infobox-label">Gênero</td><td class="wiki-infobox-value">${getF(c, 'genero')}</td></tr>` : ''}
            ${getF(c, 'nacionalidade') ? `<tr><td class="wiki-infobox-label">Nacionalidade</td><td class="wiki-infobox-value">${getF(c, 'nacionalidade')}</td></tr>` : ''}
            ${getF(c, 'estado_civil') ? `<tr><td class="wiki-infobox-label">Estado Civil</td><td class="wiki-infobox-value">${getF(c, 'estado_civil')}</td></tr>` : ''}
          </table>

          <div style="margin-top:8px; display:flex; justify-content:center;">
            <button class="btn btn-secondary" onclick="closeModal('modal-view-char'); openCharacterModal(${c.id})">✎ Editar Ficha</button>
          </div>
        </aside>
      </div>
    </div>
  `;

  document.getElementById('modal-view-char').classList.add('open');
}

// ================= 2. QUADRO DE IDEIAS =================
function renderBoardSelector() {
  const proj = getCurrentProject();
  const select = document.getElementById('board-select');
  select.innerHTML = proj.boards.map(b => `
    <option value="${b.id}" ${b.id === proj.activeBoardId ? 'selected' : ''}>
      ${b.name} (${b.items.length} itens)
    </option>
  `).join('');
  document.getElementById('current-board-title-display').textContent = getCurrentBoard().name.toUpperCase();
}

function switchBoard(boardId) {
  const proj = getCurrentProject();
  proj.activeBoardId = boardId;
  resetBoardZoom();
  syncStorage();
  renderBoardSelector();
  renderBoard();
}

function openNewBoardModal() {
  document.getElementById('modal-board-manage-title').textContent = "Nova Prancheta de Ideias";
  document.getElementById('manage-board-id').value = "";
  document.getElementById('form-board-manage').reset();
  document.getElementById('modal-board-manage').classList.add('open');
}

function openEditBoardModal() {
  const board = getCurrentBoard();
  document.getElementById('modal-board-manage-title').textContent = "Editar Prancheta Atual";
  document.getElementById('manage-board-id').value = board.id;
  document.getElementById('manage-board-name').value = board.name;
  document.getElementById('manage-board-desc').value = board.desc || "";
  document.getElementById('modal-board-manage').classList.add('open');
}

function saveBoardManage(e) {
  e.preventDefault();
  const proj = getCurrentProject();
  const id = document.getElementById('manage-board-id').value;
  const name = document.getElementById('manage-board-name').value;
  const desc = document.getElementById('manage-board-desc').value;

  if (id) {
    const idx = proj.boards.findIndex(b => b.id === id);
    proj.boards[idx].name = name;
    proj.boards[idx].desc = desc;
  } else {
    const newBoard = {
      id: "board_" + Date.now(),
      name,
      desc,
      items: [],
      connections: [],
      drawings: []
    };
    proj.boards.push(newBoard);
    proj.activeBoardId = newBoard.id;
  }

  syncStorage();
  renderBoardSelector();
  renderBoard();
  closeModal('modal-board-manage');
}

function updateBoardTransform() {
  const viewportSvg = document.getElementById('board-viewport-layer');
  const htmlLayer = document.getElementById('board-items-layer');
  
  if (viewportSvg) {
    viewportSvg.setAttribute('transform', `translate(${boardPan.x}, ${boardPan.y}) scale(${boardZoom})`);
  }
  if (htmlLayer) {
    htmlLayer.style.transform = `translate(${boardPan.x}px, ${boardPan.y}px) scale(${boardZoom})`;
  }
}

function zoomBoard(factor) {
  boardZoom = Math.max(0.35, Math.min(boardZoom * factor, 3.5));
  updateBoardTransform();
}

function resetBoardZoom() {
  boardZoom = 1;
  boardPan = { x: 0, y: 0 };
  updateBoardTransform();
}

function updatePenColor(color) {
  currentPenColor = color;
}

function updatePenWidth(width) {
  currentPenWidth = Number(width);
}

function toggleDrawingMode() {
  isDrawingMode = !isDrawingMode;
  if (isDrawingMode && isEraserMode) {
    isEraserMode = false;
    updateEraserButtonUI();
  }
  updateDrawingButtonUI();
}

function toggleEraserMode() {
  isEraserMode = !isEraserMode;
  if (isEraserMode && isDrawingMode) {
    isDrawingMode = false;
    updateDrawingButtonUI();
  }
  updateEraserButtonUI();
}

function updateDrawingButtonUI() {
  const btn = document.getElementById('btn-draw-mode');
  const container = document.getElementById('board-container');
  const status = document.getElementById('board-mode-status-text');

  if (isDrawingMode) {
    btn.textContent = "✏️ Caneta: ON";
    btn.classList.add('btn-primary');
    container.classList.remove('eraser-active');
    status.textContent = "Modo Caneta // Desenhe com toque ou cursor";
  } else {
    btn.textContent = "✏️ Caneta: OFF";
    btn.classList.remove('btn-primary');
    if (!isEraserMode) {
      status.textContent = "Arraste notas com o dedo/mouse // Pinça para Zoom";
    }
  }
}

function updateEraserButtonUI() {
  const btn = document.getElementById('btn-eraser-mode');
  const container = document.getElementById('board-container');
  const status = document.getElementById('board-mode-status-text');

  if (isEraserMode) {
    btn.textContent = "🧽 Borracha: ON";
    btn.classList.add('btn-danger');
    container.classList.add('eraser-active');
    status.textContent = "Modo Borracha // Toque sobre os traços para apagá-los";
  } else {
    btn.textContent = "🧽 Borracha: OFF";
    btn.classList.remove('btn-danger');
    container.classList.remove('eraser-active');
    if (!isDrawingMode) {
      status.textContent = "Arraste notas com o dedo/mouse // Pinça para Zoom";
    }
  }
}

function eraseDrawing(drawingId) {
  const board = getCurrentBoard();
  board.drawings = (board.drawings || []).filter(d => d.id !== drawingId);
  syncStorage();
  renderBoard();
}

function clearDrawings() {
  if (confirm("Deseja apagar todos os traços feitos à mão nesta prancheta?")) {
    const board = getCurrentBoard();
    board.drawings = [];
    syncStorage();
    renderBoard();
  }
}

function getOrganicRotation(id) {
  const pseudoSeed = (Number(id) || 1) % 7;
  const rotations = [-1.4, 0.8, -0.6, 1.2, -1.1, 0.9, -0.5];
  return rotations[pseudoSeed] || 0;
}

function renderBoard() {
  renderBoardSelector();
  const proj = getCurrentProject();
  const board = getCurrentBoard();
  const htmlLayer = document.getElementById('board-items-layer');
  const connGroup = document.getElementById('board-connections-group');
  const drawGroup = document.getElementById('board-drawings-group');

  htmlLayer.innerHTML = '';
  connGroup.innerHTML = '';
  drawGroup.innerHTML = '';

  (board.drawings || []).forEach(d => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d.d);
    path.setAttribute("class", "board-freehand-path");
    path.setAttribute("stroke", d.color || currentPenColor);
    path.setAttribute("stroke-width", d.width || "4");
    path.setAttribute("data-drawing-id", d.id);

    path.onpointerdown = (e) => {
      if (isEraserMode) {
        e.stopPropagation();
        eraseDrawing(d.id);
      }
    };

    path.onpointerenter = (e) => {
      if (isEraserMode && isErasing) {
        e.stopPropagation();
        eraseDrawing(d.id);
      }
    };

    drawGroup.appendChild(path);
  });

  (board.connections || []).forEach(conn => {
    const s = board.items.find(i => i.id === conn.sourceId);
    const t = board.items.find(i => i.id === conn.targetId);
    if (s && t) {
      const sx = s.x + 115;
      const sy = s.y + 60;
      const tx = t.x + 115;
      const ty = t.y + 60;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const dx = tx - sx;
      const dy = ty - sy;
      const cx1 = sx + dx * 0.5 - dy * 0.1;
      const cy1 = sy + dy * 0.5 + dx * 0.1;
      
      path.setAttribute("d", `M ${sx} ${sy} Q ${cx1} ${cy1} ${tx} ${ty}`);
      path.setAttribute("class", "board-string-line");
      path.setAttribute("stroke", conn.color || "#a63d40");
      path.setAttribute("data-conn-id", conn.id);
      
      path.onpointerdown = (e) => {
        e.stopPropagation();
        if (confirm("Deseja cortar este fio de ligação?")) {
          board.connections = board.connections.filter(c => c.id !== conn.id);
          syncStorage();
          renderBoard();
        }
      };

      connGroup.appendChild(path);
    }
  });

  board.items.forEach(item => {
    if (item.x === undefined) item.x = 200;
    if (item.y === undefined) item.y = 200;

    const linkedChar = item.characterId ? proj.characters.find(c => c.id === item.characterId) : null;
    const linkedCharBadge = linkedChar ? `<div class="item-char-badge">👤 ${linkedChar.name}</div>` : '';
    const rot = getOrganicRotation(item.id);

    const el = document.createElement('div');
    el.className = `board-card-item item-${item.type} ${item.type === 'note' ? 'note-' + (item.color || 'yellow') : ''}`;
    el.style.left = item.x + 'px';
    el.style.top = item.y + 'px';
    el.style.transform = `rotate(${rot}deg)`;
    el.setAttribute('data-id', item.id);

    let innerHTML = `<div class="washi-tape-strip"></div>`;
    innerHTML += `
      <div class="board-item-actions">
        <button class="board-mini-btn" onclick="openBoardItemModal('${item.type}', ${item.id})">✎</button>
        <button class="board-mini-btn" onclick="deleteBoardItem(${item.id})">✕</button>
      </div>
    `;
    innerHTML += linkedCharBadge;

    if (item.type === 'note') {
      innerHTML += `
        <div class="item-note-title">${item.title}</div>
        <div class="item-note-text">${(item.text || '').replace(/\n/g, '<br>')}</div>
      `;
    } else if (item.type === 'image') {
      innerHTML += `
        <img src="${item.photo}" class="item-image-img" alt="${item.title}">
        <div class="item-image-title">${item.title}</div>
        ${item.caption ? `<div class="item-image-caption">${item.caption}</div>` : ''}
      `;
    } else if (item.type === 'clue') {
      const badgeClass = 'badge-' + (item.clueType || 'fato');
      const badgeLabels = { fato: "FATO // PROVA", pista: "PISTA // SUSPEITA", duvida: "DÚVIDA", virada: "PLOT TWIST" };
      innerHTML += `
        <span class="item-clue-badge ${badgeClass}">${badgeLabels[item.clueType] || 'PISTA'}</span>
        ${item.tag ? `<span style="font-family:var(--font-mono); font-size:0.62rem; color:var(--accent-slate); margin-left:4px;">#${item.tag}</span>` : ''}
        <div class="item-clue-title">${item.title}</div>
        <div class="item-clue-desc">${(item.desc || '').replace(/\n/g, '<br>')}</div>
      `;
    }

    el.innerHTML = innerHTML;
    el.onpointerdown = (e) => startDragBoardItem(e, item);
    htmlLayer.appendChild(el);
  });

  updateBoardTransform();
  setupBoardPointerInteractions();
}

function startDragBoardItem(e, item) {
  if (isDrawingMode || isEraserMode) return;
  if (e.target.closest('.board-mini-btn')) return;
  e.stopPropagation();
  draggedBoardItem = item;

  boardItemOffset.x = (e.clientX / boardZoom) - (boardPan.x / boardZoom) - item.x;
  boardItemOffset.y = (e.clientY / boardZoom) - (boardPan.y / boardZoom) - item.y;
}

function setupBoardPointerInteractions() {
  const container = document.getElementById('board-container');

  container.onpointerdown = (e) => {
    activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activeTouches.size === 2) {
      const [t1, t2] = Array.from(activeTouches.values());
      initialPinchDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      initialPinchZoom = boardZoom;
      isBoardPanning = false;
      isDrawing = false;
      return;
    }

    if (e.target.closest('.board-card-item')) return;
    
    if (isDrawingMode) {
      isDrawing = true;
      const board = getCurrentBoard();
      const ptX = (e.clientX - container.getBoundingClientRect().left - boardPan.x) / boardZoom;
      const ptY = (e.clientY - container.getBoundingClientRect().top - boardPan.y) / boardZoom;
      
      currentDrawingPath = {
        id: Date.now(),
        color: currentPenColor,
        width: currentPenWidth,
        points: [{ x: ptX, y: ptY }],
        d: `M ${ptX} ${ptY}`
      };
      if (!board.drawings) board.drawings = [];
      board.drawings.push(currentDrawingPath);

    } else if (isEraserMode) {
      isErasing = true;
    } else {
      isBoardPanning = true;
      startBoardPan = { x: e.clientX - boardPan.x, y: e.clientY - boardPan.y };
    }
  };

  window.onpointermove = (e) => {
    if (activeTouches.has(e.pointerId)) {
      activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (activeTouches.size === 2 && initialPinchDistance) {
      const [t1, t2] = Array.from(activeTouches.values());
      const currentDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const ratio = currentDist / initialPinchDistance;
      boardZoom = Math.max(0.35, Math.min(initialPinchZoom * ratio, 3.5));
      updateBoardTransform();
      return;
    }

    if (draggedBoardItem) {
      draggedBoardItem.x = (e.clientX / boardZoom) - (boardPan.x / boardZoom) - boardItemOffset.x;
      draggedBoardItem.y = (e.clientY / boardZoom) - (boardPan.y / boardZoom) - boardItemOffset.y;

      const el = document.querySelector(`.board-card-item[data-id="${draggedBoardItem.id}"]`);
      if (el) {
        el.style.left = draggedBoardItem.x + 'px';
        el.style.top = draggedBoardItem.y + 'px';
      }

      const board = getCurrentBoard();
      (board.connections || []).forEach(conn => {
        if (conn.sourceId === draggedBoardItem.id || conn.targetId === draggedBoardItem.id) {
          const s = board.items.find(i => i.id === conn.sourceId);
          const t = board.items.find(i => i.id === conn.targetId);
          if (s && t) {
            const path = document.querySelector(`path[data-conn-id="${conn.id}"]`);
            if (path) {
              const sx = s.x + 115;
              const sy = s.y + 60;
              const tx = t.x + 115;
              const ty = t.y + 60;
              const dx = tx - sx;
              const dy = ty - sy;
              const cx1 = sx + dx * 0.5 - dy * 0.1;
              const cy1 = sy + dy * 0.5 + dx * 0.1;
              path.setAttribute("d", `M ${sx} ${sy} Q ${cx1} ${cy1} ${tx} ${ty}`);
            }
          }
        }
      });

    } else if (isDrawing && currentDrawingPath) {
      const ptX = (e.clientX - container.getBoundingClientRect().left - boardPan.x) / boardZoom;
      const ptY = (e.clientY - container.getBoundingClientRect().top - boardPan.y) / boardZoom;
      
      currentDrawingPath.points.push({ x: ptX, y: ptY });
      currentDrawingPath.d += ` L ${ptX} ${ptY}`;
      
      const drawGroup = document.getElementById('board-drawings-group');
      let livePath = document.getElementById(`draw-live-${currentDrawingPath.id}`);
      if (!livePath) {
        livePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        livePath.setAttribute("id", `draw-live-${currentDrawingPath.id}`);
        livePath.setAttribute("class", "board-freehand-path");
        livePath.setAttribute("stroke", currentDrawingPath.color || currentPenColor);
        livePath.setAttribute("stroke-width", currentDrawingPath.width || currentPenWidth);
        drawGroup.appendChild(livePath);
      }
      livePath.setAttribute("d", currentDrawingPath.d);

    } else if (isBoardPanning) {
      boardPan.x = e.clientX - startBoardPan.x;
      boardPan.y = e.clientY - startBoardPan.y;
      updateBoardTransform();
    }
  };

  const endPointerAction = (e) => {
    activeTouches.delete(e.pointerId);
    if (activeTouches.size < 2) {
      initialPinchDistance = null;
    }

    if (draggedBoardItem) {
      draggedBoardItem = null;
      syncStorage();
    }
    if (isDrawing) {
      isDrawing = false;
      currentDrawingPath = null;
      syncStorage();
      renderBoard();
    }
    isErasing = false;
    isBoardPanning = false;
  };

  window.onpointerup = endPointerAction;
  window.onpointercancel = endPointerAction;

  container.onwheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomBoard(zoomFactor);
  };
}

function jumpToBoardItem(boardId, itemId) {
  closeModal('modal-view-char');
  const proj = getCurrentProject();
  proj.activeBoardId = boardId;
  syncStorage();

  const tabBtn = document.querySelector('.nav-tab[onclick*="tab-board"]');
  switchTab('tab-board', tabBtn);

  const board = getCurrentBoard();
  const item = board.items.find(i => i.id === itemId);
  if (item) {
    const container = document.getElementById('board-container');
    const rect = container.getBoundingClientRect();
    boardZoom = 1;
    boardPan.x = (rect.width / 2) - item.x - 115;
    boardPan.y = (rect.height / 2) - item.y - 60;
    updateBoardTransform();

    setTimeout(() => {
      const el = document.querySelector(`.board-card-item[data-id="${itemId}"]`);
      if (el) {
        el.classList.add('flash-highlight');
        setTimeout(() => el.classList.remove('flash-highlight'), 1600);
      }
    }, 60);
  }
}

function openBoardItemModal(type, id = null) {
  const isEdit = id !== null;
  const proj = getCurrentProject();
  const board = getCurrentBoard();

  document.getElementById('board-item-id').value = isEdit ? id : "";
  document.getElementById('board-item-type').value = type;
  document.getElementById('board-img-upload-status').textContent = "";

  const charSelect = document.getElementById('board-item-char');
  charSelect.innerHTML = `<option value="">— Nenhum —</option>` +
    proj.characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  document.querySelectorAll('.item-type-fields').forEach(f => f.style.display = 'none');
  document.getElementById(`fields-${type}`).style.display = 'block';

  const preview = document.getElementById('board-img-preview');
  document.getElementById('board-img-file').value = "";
  document.getElementById('board-img-url').value = "";
  document.getElementById('board-item-image-data').value = "";
  preview.style.display = 'none';

  if (isEdit) {
    const item = board.items.find(i => i.id === id);
    document.getElementById('board-item-title').value = item.title;
    charSelect.value = item.characterId || "";

    if (type === 'note') {
      document.getElementById('board-item-color').value = item.color || "yellow";
      document.getElementById('board-item-text').value = item.text || "";
    } else if (type === 'image') {
      document.getElementById('board-item-caption').value = item.caption || "";
      document.getElementById('board-item-image-data').value = item.photo || "";
      if (item.photo) {
        preview.src = item.photo;
        preview.style.display = 'block';
      }
    } else if (type === 'clue') {
      document.getElementById('board-item-clue-type').value = item.clueType || "fato";
      document.getElementById('board-item-tag').value = item.tag || "";
      document.getElementById('board-item-clue-desc').value = item.desc || "";
    }
    document.getElementById('modal-board-item-title').textContent = "Editar Item da Mesa";
  } else {
    document.getElementById('form-board-item').reset();
    document.getElementById('modal-board-item-title').textContent = 
      type === 'note' ? "Nova Nota / Pergaminho" : (type === 'image' ? "Novo Registro Fotográfico" : "Nova Pista / Evidência");
  }

  document.getElementById('modal-board-item').classList.add('open');
}

async function handleBoardImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('board-img-preview');
  const url = await uploadMediaFileToCloud(file, 'board-img-upload-status');
  document.getElementById('board-item-image-data').value = url;
  preview.src = url;
  preview.style.display = 'block';
}

function handleBoardImgUrl(e) {
  const url = e.target.value;
  document.getElementById('board-item-image-data').value = url;
  const preview = document.getElementById('board-img-preview');
  if (url) {
    preview.src = url;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
}

function saveBoardItem(e) {
  e.preventDefault();
  const board = getCurrentBoard();
  const id = document.getElementById('board-item-id').value;
  const type = document.getElementById('board-item-type').value;

  let itemData = {
    type,
    title: document.getElementById('board-item-title').value,
    characterId: document.getElementById('board-item-char').value ? Number(document.getElementById('board-item-char').value) : null
  };

  if (type === 'note') {
    itemData.color = document.getElementById('board-item-color').value;
    itemData.text = document.getElementById('board-item-text').value;
  } else if (type === 'image') {
    itemData.caption = document.getElementById('board-item-caption').value;
    itemData.photo = document.getElementById('board-item-image-data').value || "";
  } else if (type === 'clue') {
    itemData.clueType = document.getElementById('board-item-clue-type').value;
    itemData.tag = document.getElementById('board-item-tag').value;
    itemData.desc = document.getElementById('board-item-clue-desc').value;
  }

  if (id) {
    const idx = board.items.findIndex(i => i.id === Number(id));
    board.items[idx] = { ...board.items[idx], ...itemData };
  } else {
    const newItem = {
      id: Date.now(),
      ...itemData,
      x: Math.floor(Math.random() * 300) + 150,
      y: Math.floor(Math.random() * 200) + 100
    };
    board.items.push(newItem);
  }

  syncStorage();
  renderBoard();
  closeModal('modal-board-item');
}

function deleteBoardItem(id) {
  const board = getCurrentBoard();
  if (confirm("Deseja remover este item da mesa?")) {
    board.items = board.items.filter(i => i.id !== id);
    board.connections = board.connections.filter(c => c.sourceId !== id && c.targetId !== id);
    syncStorage();
    renderBoard();
  }
}

function openBoardConnectionModal() {
  const board = getCurrentBoard();
  if (board.items.length < 2) {
    alert("Adicione ao menos 2 itens na mesa antes de passar um fio de ligação.");
    return;
  }

  const selectSource = document.getElementById('board-conn-source');
  const selectTarget = document.getElementById('board-conn-target');

  const optionsHTML = board.items.map(i => `<option value="${i.id}">[${i.type.toUpperCase()}] ${i.title}</option>`).join('');
  selectSource.innerHTML = optionsHTML;
  selectTarget.innerHTML = optionsHTML;
  selectTarget.selectedIndex = 1;

  document.getElementById('modal-board-conn').classList.add('open');
}

function saveBoardConnection(e) {
  e.preventDefault();
  const board = getCurrentBoard();
  const sourceId = Number(document.getElementById('board-conn-source').value);
  const targetId = Number(document.getElementById('board-conn-target').value);
  const color = document.getElementById('board-conn-color').value;
  const label = document.getElementById('board-conn-label').value;

  if (sourceId === targetId) {
    alert("Selecione dois itens diferentes para ligar com o fio.");
    return;
  }

  board.connections.push({
    id: Date.now(),
    sourceId,
    targetId,
    color,
    label
  });

  syncStorage();
  renderBoard();
  closeModal('modal-board-conn');
}

// ================= 3. TEIA DE RELAÇÕES INTUITIVA =================
function calculateBezierPath(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.5 - dy * 0.15;
  const cy1 = y1 + dy * 0.5 + dx * 0.15;
  return `M ${x1} ${y1} Q ${cx1} ${cy1} ${x2} ${y2}`;
}

function calculateBezierMidpoint(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx1 = x1 + dx * 0.5 - dy * 0.15;
  const cy1 = y1 + dy * 0.5 + dx * 0.15;

  const mx = 0.25 * x1 + 0.5 * cx1 + 0.25 * x2;
  const my = 0.25 * y1 + 0.5 * cy1 + 0.25 * y2;
  return { x: mx, y: my };
}

function autoLayoutWebPhysics() {
  const proj = getCurrentProject();
  const chars = proj.characters;
  if (chars.length < 2) return;

  const svg = document.getElementById('web-svg');
  const width = svg.clientWidth || 800;
  const height = svg.clientHeight || 550;
  const centerX = width / 2;
  const centerY = height / 2;

  const total = chars.length;
  const radius = Math.min(width, height) * 0.35;

  chars.forEach((c, idx) => {
    const angle = (idx / total) * 2 * Math.PI - (Math.PI / 2);
    c.x = Math.round(centerX + radius * Math.cos(angle));
    c.y = Math.round(centerY + radius * Math.sin(angle));
  });

  syncStorage();
  renderWeb();
}

function renderWeb() {
  const proj = getCurrentProject();
  const svgLinks = document.getElementById('svg-links');
  const svgLabels = document.getElementById('svg-link-labels');
  const svgNodes = document.getElementById('svg-nodes');
  const svgLiveWire = document.getElementById('svg-live-wire');
  const sidebar = document.getElementById('web-sidebar');

  svgLinks.innerHTML = '';
  svgLabels.innerHTML = '';
  svgNodes.innerHTML = '';
  svgLiveWire.innerHTML = '';

  proj.relationships.forEach(rel => {
    const source = proj.characters.find(c => c.id === rel.sourceId);
    const target = proj.characters.find(c => c.id === rel.targetId);
    if (source && target) {
      const lineColor = rel.color || "#d4af37";
      const isSelected = selectedRelationshipId === rel.id;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", calculateBezierPath(source.x, source.y, target.x, target.y));
      path.setAttribute("id", `rel-line-${rel.id}`);
      path.setAttribute("class", `link-line ${isSelected ? 'active' : ''}`);
      path.setAttribute("stroke", isSelected ? "#a63d40" : lineColor);
      
      if (rel.direction === 'forward' || rel.direction === 'backward') {
        path.setAttribute("marker-end", "url(#arrowhead)");
      }

      path.onclick = () => selectRelationship(rel.id);
      svgLinks.appendChild(path);

      const mid = calculateBezierMidpoint(source.x, source.y, target.x, target.y);
      const directionIcon = rel.direction === 'forward' ? '➔ ' : (rel.direction === 'backward' ? '⬅ ' : '');
      const labelText = directionIcon + (rel.title || "Vínculo");
      const badgeWidth = Math.max(70, labelText.length * 7.4 + 20);
      const badgeHeight = 24;

      const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.setAttribute("class", `web-label-group ${isSelected ? 'active' : ''}`);
      labelGroup.setAttribute("id", `rel-label-${rel.id}`);
      labelGroup.setAttribute("transform", `translate(${mid.x}, ${mid.y})`);
      labelGroup.onclick = () => selectRelationship(rel.id);

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("class", "web-label-bg");
      rect.setAttribute("x", -badgeWidth / 2);
      rect.setAttribute("y", -badgeHeight / 2);
      rect.setAttribute("width", badgeWidth);
      rect.setAttribute("height", badgeHeight);
      rect.setAttribute("stroke", lineColor);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("class", "web-label-text");
      text.textContent = labelText;

      labelGroup.appendChild(rect);
      labelGroup.appendChild(text);
      svgLabels.appendChild(labelGroup);
    }
  });

  proj.characters.forEach(c => {
    if (c.x === undefined) c.x = Math.floor(Math.random() * 400) + 150;
    if (c.y === undefined) c.y = Math.floor(Math.random() * 300) + 150;

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "web-node-group");
    group.setAttribute("transform", `translate(${c.x}, ${c.y})`);
    group.setAttribute("data-id", c.id);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "web-node-circle");
    circle.setAttribute("r", "25");
    group.appendChild(circle);

    let initialText = null;

    if (c.photo) {
      const clipId = `web-node-clip-${c.id}`;
      const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clipPath.setAttribute("id", clipId);
      const clipCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      clipCircle.setAttribute("r", "24");
      clipPath.appendChild(clipCircle);
      group.appendChild(clipPath);

      const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href", c.photo);
      image.setAttribute("href", c.photo);
      image.setAttribute("x", "-25");
      image.setAttribute("y", "-25");
      image.setAttribute("width", "50");
      image.setAttribute("height", "50");
      image.setAttribute("preserveAspectRatio", "xMidYMid slice");
      image.setAttribute("clip-path", `url(#${clipId})`);
      image.setAttribute("pointer-events", "none");
      group.appendChild(image);
    } else {
      initialText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      initialText.setAttribute("text-anchor", "middle");
      initialText.setAttribute("dominant-baseline", "central");
      initialText.setAttribute("fill", "var(--accent-gold)");
      initialText.setAttribute("font-family", "var(--font-title)");
      initialText.setAttribute("font-size", "16");
      initialText.setAttribute("font-weight", "700");
      initialText.setAttribute("pointer-events", "none");
      initialText.textContent = c.name ? c.name.charAt(0).toUpperCase() : '?';
    }

    const nameText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameText.setAttribute("class", "web-node-text");
    nameText.setAttribute("text-anchor", "middle");
    nameText.setAttribute("dy", "40");
    nameText.textContent = c.name;

    const roleText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    roleText.setAttribute("class", "web-node-role");
    roleText.setAttribute("text-anchor", "middle");
    roleText.setAttribute("dy", "51");
    roleText.textContent = getF(c, 'funcao') || '';

    const handleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    handleGroup.setAttribute("class", "web-handle-group");
    handleGroup.setAttribute("transform", "translate(21, -21)");

    const handleCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    handleCircle.setAttribute("class", "web-connect-handle");
    handleCircle.setAttribute("r", "8");

    const plusText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    plusText.setAttribute("class", "web-connect-plus");
    plusText.textContent = "+";

    handleGroup.appendChild(handleCircle);
    handleGroup.appendChild(plusText);

    if (initialText) group.appendChild(initialText);
    group.appendChild(nameText);
    group.appendChild(roleText);
    group.appendChild(handleGroup);

    group.onpointerdown = (e) => startDragWebNode(e, c);
    handleGroup.onpointerdown = (e) => startPullingWire(e, c);

    svgNodes.appendChild(group);
  });

  if (proj.relationships.length === 0) {
    sidebar.innerHTML = `
      <div class="empty-state">
        Nenhuma relação criada.<br>
        Clique no <strong>ponto (+)</strong> de um personagem e arraste até outro para conectar!
      </div>
    `;
  } else {
    sidebar.innerHTML = proj.relationships.map(rel => {
      const s = proj.characters.find(c => c.id === rel.sourceId);
      const t = proj.characters.find(c => c.id === rel.targetId);
      const isSelected = selectedRelationshipId === rel.id;
      const lineColor = rel.color || "#d4af37";
      const dirArrow = rel.direction === 'forward' ? '➔' : (rel.direction === 'backward' ? '⬅' : '↔');

      return `
        <div class="eco-card ${isSelected ? 'selected' : ''}" style="border-left: 3px solid ${lineColor};" onclick="selectRelationship(${rel.id})">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div class="eco-title" style="color: ${lineColor};">${rel.title}</div>
            <div style="display:flex; gap:4px;">
              <button class="btn" style="padding:2px 6px; font-size:0.65rem;" onclick="event.stopPropagation(); openRelationshipModal(${rel.id})">✎</button>
              <button class="btn btn-danger" style="padding:2px 6px; font-size:0.65rem;" onclick="event.stopPropagation(); deleteRelationship(${rel.id})">✕</button>
            </div>
          </div>
          <div class="eco-nodes">✦ ${s ? s.name : 'Desconhecido'} ${dirArrow} ${t ? t.name : 'Desconhecido'}</div>
          <div class="eco-prose">${rel.prose || 'Sem dinâmica descrita.'}</div>
          ${rel.asymmetry ? `<div class="eco-asymmetry">⚖️ ${rel.asymmetry}</div>` : ''}
          ${rel.pact ? `<div class="eco-pact">🔒 ${rel.pact}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  setupWebPointerInteractions();
}

function selectRelationship(id) {
  selectedRelationshipId = id;
  renderWeb();
}

function startDragWebNode(e, char) {
  if (e.target.closest('.web-handle-group')) return;
  e.stopPropagation();
  draggedWebNode = char;
  const svg = document.getElementById('web-svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());
  webOffset.x = cursorPt.x - char.x;
  webOffset.y = cursorPt.y - char.y;
}

function startPullingWire(e, char) {
  e.stopPropagation();
  isConnectingWire = true;
  wireSourceChar = char;
  hoveredTargetCharId = null;
}

function setupWebPointerInteractions() {
  const svg = document.getElementById('web-svg');

  svg.onpointermove = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());

    if (draggedWebNode) {
      draggedWebNode.x = Math.max(40, Math.min(cursorPt.x - webOffset.x, svg.clientWidth - 40));
      draggedWebNode.y = Math.max(40, Math.min(cursorPt.y - webOffset.y, svg.clientHeight - 40));

      const g = document.querySelector(`.web-node-group[data-id="${draggedWebNode.id}"]`);
      if (g) g.setAttribute("transform", `translate(${draggedWebNode.x}, ${draggedWebNode.y})`);

      const proj = getCurrentProject();
      proj.relationships.forEach(rel => {
        const s = proj.characters.find(c => c.id === rel.sourceId);
        const t = proj.characters.find(c => c.id === rel.targetId);
        const path = document.getElementById(`rel-line-${rel.id}`);
        const label = document.getElementById(`rel-label-${rel.id}`);

        if (s && t) {
          if (path) path.setAttribute("d", calculateBezierPath(s.x, s.y, t.x, t.y));
          if (label) {
            const mid = calculateBezierMidpoint(s.x, s.y, t.x, t.y);
            label.setAttribute("transform", `translate(${mid.x}, ${mid.y})`);
          }
        }
      });

    } else if (isConnectingWire && wireSourceChar) {
      const liveWireGroup = document.getElementById('svg-live-wire');
      const startX = wireSourceChar.x;
      const startY = wireSourceChar.y;
      const endX = cursorPt.x;
      const endY = cursorPt.y;

      const pathData = calculateBezierPath(startX, startY, endX, endY);

      let wirePath = document.getElementById('wire-live-temp');
      if (!wirePath) {
        wirePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        wirePath.setAttribute("id", "wire-live-temp");
        wirePath.setAttribute("class", "live-drag-wire");
        liveWireGroup.appendChild(wirePath);
      }
      wirePath.setAttribute("d", pathData);

      const proj = getCurrentProject();
      hoveredTargetCharId = null;

      proj.characters.forEach(c => {
        const dist = Math.hypot(c.x - endX, c.y - endY);
        const nodeEl = document.querySelector(`.web-node-group[data-id="${c.id}"]`);
        if (c.id !== wireSourceChar.id && dist < 35) {
          hoveredTargetCharId = c.id;
          if (nodeEl) nodeEl.classList.add('drop-target');
        } else {
          if (nodeEl) nodeEl.classList.remove('drop-target');
        }
      });
    }
  };

  const endWebPointer = () => {
    if (draggedWebNode) {
      draggedWebNode = null;
      syncStorage();
    }

    if (isConnectingWire) {
      const liveWireGroup = document.getElementById('svg-live-wire');
      liveWireGroup.innerHTML = '';

      document.querySelectorAll('.web-node-group').forEach(el => el.classList.remove('drop-target'));

      if (wireSourceChar && hoveredTargetCharId && wireSourceChar.id !== hoveredTargetCharId) {
        openRelationshipModal(null, wireSourceChar.id, hoveredTargetCharId);
      }

      isConnectingWire = false;
      wireSourceChar = null;
      hoveredTargetCharId = null;
    }
  };

  window.onpointerup = endWebPointer;
  window.onpointercancel = endWebPointer;
}

function openRelationshipModal(id = null, preSourceId = null, preTargetId = null) {
  const isEdit = id !== null;
  const proj = getCurrentProject();
  
  if (proj.characters.length < 2) {
    alert("Cadastre ao menos 2 personagens antes de criar uma relação.");
    return;
  }

  document.getElementById('modal-rel-title').textContent = isEdit ? "Editar Conexão" : "Nova Conexão";
  document.getElementById('rel-id').value = isEdit ? id : "";
  
  const selectSource = document.getElementById('rel-source');
  const selectTarget = document.getElementById('rel-target');
  
  selectSource.innerHTML = proj.characters.map(c => `<option value="${c.id}">${c.name} (${getF(c, 'funcao') || 'Geral'})</option>`).join('');
  selectTarget.innerHTML = proj.characters.map(c => `<option value="${c.id}">${c.name} (${getF(c, 'funcao') || 'Geral'})</option>`).join('');

  if (isEdit) {
    const rel = proj.relationships.find(r => r.id === id);
    selectSource.value = rel.sourceId;
    selectTarget.value = rel.targetId;
    document.getElementById('rel-title').value = rel.title || "";
    document.getElementById('rel-direction').value = rel.direction || "mutual";
    document.getElementById('rel-color').value = rel.color || "#d4af37";
    document.getElementById('rel-asymmetry').value = rel.asymmetry || "";
    document.getElementById('rel-prose').value = rel.prose || "";
    document.getElementById('rel-pact').value = rel.pact || "";
  } else {
    document.getElementById('form-rel').reset();
    selectSource.value = preSourceId || proj.characters[0].id;
    selectTarget.value = preTargetId || (proj.characters[1] ? proj.characters[1].id : proj.characters[0].id);
    document.getElementById('rel-direction').value = "mutual";
    document.getElementById('rel-color').value = "#d4af37";
  }
  document.getElementById('modal-rel').classList.add('open');
}

function saveRelationship(e) {
  e.preventDefault();
  const proj = getCurrentProject();
  const id = document.getElementById('rel-id').value;
  const sourceId = Number(document.getElementById('rel-source').value);
  const targetId = Number(document.getElementById('rel-target').value);

  if (sourceId === targetId) {
    alert("Selecione dois personagens distintos para criar uma conexão.");
    return;
  }

  const relData = {
    sourceId,
    targetId,
    title: document.getElementById('rel-title').value,
    direction: document.getElementById('rel-direction').value,
    color: document.getElementById('rel-color').value,
    asymmetry: document.getElementById('rel-asymmetry').value,
    prose: document.getElementById('rel-prose').value,
    pact: document.getElementById('rel-pact').value
  };

  if (id) {
    const index = proj.relationships.findIndex(r => r.id === Number(id));
    proj.relationships[index] = { ...proj.relationships[index], ...relData };
  } else {
    proj.relationships.push({ id: Date.now(), ...relData });
  }

  syncStorage();
  renderWeb();
  closeModal('modal-rel');
}

function deleteRelationship(id) {
  const proj = getCurrentProject();
  if (confirm("Deseja desfazer este vínculo?")) {
    proj.relationships = proj.relationships.filter(r => r.id !== id);
    syncStorage();
    renderWeb();
  }
}

// ================= 4. LINHA DO TEMPO & CRONOLOGIA INTERATIVA =================
function setTimelineViewMode(mode, btn) {
  timelineViewMode = mode;
  document.querySelectorAll('.timeline-view-modes button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTimeline();
}

function renderTimeline() {
  const proj = getCurrentProject();
  if (!proj.timelineEvents) proj.timelineEvents = [];

  const charFilterSelect = document.getElementById('timeline-filter-char');
  const selectedCharVal = charFilterSelect.value;
  charFilterSelect.innerHTML = `<option value="all">👤 Todo o Elenco</option>` +
    proj.characters.map(c => `<option value="${c.id}" ${String(c.id) === selectedCharVal ? 'selected' : ''}>${c.name}</option>`).join('');

  const query = (document.getElementById('search-timeline').value || '').toLowerCase();
  const filterChar = charFilterSelect.value;
  const filterType = document.getElementById('timeline-filter-type').value;

  const sorted = [...proj.timelineEvents].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));

  const filtered = sorted.filter(ev => {
    const matchText = (ev.title && ev.title.toLowerCase().includes(query)) ||
                      (ev.dateStr && ev.dateStr.toLowerCase().includes(query)) ||
                      (ev.era && ev.era.toLowerCase().includes(query)) ||
                      (ev.summary && ev.summary.toLowerCase().includes(query));
    const matchChar = filterChar === 'all' || (ev.characterIds || []).includes(Number(filterChar));
    const matchType = filterType === 'all' || ev.type === filterType;
    return matchText && matchChar && matchType;
  });

  const metaBar = document.getElementById('timeline-meta-bar');
  const totalEvents = proj.timelineEvents.length;
  const flashbacks = proj.timelineEvents.filter(e => e.type === 'flashback').length;
  const twists = proj.timelineEvents.filter(e => e.type === 'virada' || e.type === 'revelacao').length;

  metaBar.innerHTML = `
    <div><strong>${filtered.length}</strong> marcos exibidos (Total: ${totalEvents})</div>
    <div style="display:flex; gap:12px; font-family:var(--font-mono); font-size:0.72rem;">
      <span>🕯️ Flashbacks: <strong>${flashbacks}</strong></span>
      <span>⚡ Viradas/Segredos: <strong>${twists}</strong></span>
    </div>
  `;

  const rail = document.getElementById('timeline-track-rail');

  if (filtered.length === 0) {
    rail.innerHTML = `
      <div class="empty-state">
        Nenhum marco cronológico registrado ainda.<br>
        Clique em <strong>+ Novo Marco Cronológico</strong> para começar!
      </div>
    `;
    return;
  }

  if (timelineViewMode === 'track') {
    rail.innerHTML = `
      <div class="timeline-spine-line"></div>
      <div class="timeline-nodes-horizontal">
        ${filtered.map((ev) => {
          const typeObj = TIMELINE_EVENT_TYPES.find(t => t.value === ev.type) || TIMELINE_EVENT_TYPES[0];
          const linkedCh = proj.chapters.find(c => c.id === ev.chapterId);
          const chIdx = linkedCh ? proj.chapters.findIndex(c => c.id === ev.chapterId) + 1 : null;
          const charsPresent = (ev.characterIds || []).map(cid => proj.characters.find(c => c.id === cid)).filter(Boolean);

          return `
            <div class="timeline-node-item" onclick="openTimelineEventModal(${ev.id})">
              <div class="timeline-node-anchor">
                <div class="timeline-seal-disc" style="border-color:${ev.color || 'var(--accent-gold)'};">
                  ${typeObj.icon}
                </div>
                <div>
                  <div class="timeline-era-tag">${ev.era || 'Era / Período'}</div>
                  <div class="timeline-date-badge">${ev.dateStr || 'Data não definida'}</div>
                </div>
              </div>

              <div class="timeline-event-card" style="--card-accent:${ev.color || 'var(--accent-gold)'};">
                <div class="timeline-card-title">${ev.title}</div>

                <div class="timeline-contrast-row">
                  <div class="timeline-contrast-story">⏳ <strong>Tempo da História:</strong> ${ev.dateStr} (Ordem: ${ev.sortOrder})</div>
                  <div class="timeline-contrast-narrative">📖 <strong>Tempo da Narrativa:</strong> ${linkedCh ? `Capítulo ${chIdx}: ${linkedCh.title}` : 'Sem revelação direta'}</div>
                </div>

                ${ev.summary ? `<p class="timeline-card-summary">${ev.summary.replace(/\n/g, '<br>')}</p>` : ''}

                ${charsPresent.length > 0 ? `
                  <div class="timeline-chars-avatars">
                    ${charsPresent.map(c => `<span class="timeline-char-pill">👤 ${c.name}</span>`).join('')}
                  </div>
                ` : ''}

                <div class="timeline-card-actions">
                  <button class="btn btn-sm" onclick="event.stopPropagation(); openTimelineEventModal(${ev.id})">✎ Editar</button>
                  <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteTimelineEvent(${ev.id})">✕</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } else {
    rail.innerHTML = `
      <div class="timeline-vertical-list">
        ${filtered.map((ev) => {
          const typeObj = TIMELINE_EVENT_TYPES.find(t => t.value === ev.type) || TIMELINE_EVENT_TYPES[0];
          const linkedCh = proj.chapters.find(c => c.id === ev.chapterId);
          const chIdx = linkedCh ? proj.chapters.findIndex(c => c.id === ev.chapterId) + 1 : null;
          const charsPresent = (ev.characterIds || []).map(cid => proj.characters.find(c => c.id === cid)).filter(Boolean);

          return `
            <div class="timeline-vert-row" style="--card-accent:${ev.color || 'var(--accent-gold)'};">
              <div class="timeline-vert-date-col">
                <div style="font-size:1.15rem;">${typeObj.icon}</div>
                <div class="timeline-date-badge">${ev.dateStr || 'Sem data'}</div>
                <div class="timeline-era-tag">${ev.era || 'Geral'}</div>
                <div style="font-family:var(--font-mono); font-size:0.65rem; color:var(--ink-dim);">Ordem: #${ev.sortOrder}</div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <h3 class="timeline-card-title">${ev.title}</h3>
                  <div style="display:flex; gap:4px;">
                    <button class="btn btn-sm" onclick="openTimelineEventModal(${ev.id})">✎</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTimelineEvent(${ev.id})">✕</button>
                  </div>
                </div>

                <div class="timeline-contrast-row" style="margin: 8px 0;">
                  <div class="timeline-contrast-story">⏳ <strong>Tempo da História:</strong> ${ev.dateStr}</div>
                  <div class="timeline-contrast-narrative">📖 <strong>Tempo da Narrativa:</strong> ${linkedCh ? `Capítulo ${chIdx}: ${linkedCh.title}` : 'Sem revelação direta'}</div>
                </div>

                ${ev.summary ? `<p class="timeline-card-summary">${ev.summary.replace(/\n/g, '<br>')}</p>` : ''}

                ${charsPresent.length > 0 ? `
                  <div class="timeline-chars-avatars" style="margin-top:8px;">
                    ${charsPresent.map(c => `<span class="timeline-char-pill">👤 ${c.name}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

function openTimelineEventModal(id = null) {
  const isEdit = id !== null;
  const proj = getCurrentProject();
  if (!proj.timelineEvents) proj.timelineEvents = [];

  document.getElementById('modal-timeline-title').textContent = isEdit ? "Editar Marco Cronológico" : "Novo Marco Cronológico";
  document.getElementById('timeline-event-id').value = isEdit ? id : "";

  const chSelect = document.getElementById('timeline-chapter-select');
  chSelect.innerHTML = `<option value="">— Não associado a capítulo específico —</option>` +
    proj.chapters.map((c, i) => `<option value="${c.id}">Capítulo ${i + 1}: ${c.title}</option>`).join('');

  const charsBox = document.getElementById('timeline-chars-selector-box');
  let currentEvent = isEdit ? proj.timelineEvents.find(e => e.id === id) : null;
  const selectedCharIds = currentEvent ? (currentEvent.characterIds || []) : [];

  charsBox.innerHTML = proj.characters.length ? proj.characters.map(c => `
    <label class="timeline-check-label">
      <input type="checkbox" name="timeline-char-chk" value="${c.id}" ${selectedCharIds.includes(c.id) ? 'checked' : ''}>
      <span>👤 ${c.name}</span>
    </label>
  `).join('') : `<div style="font-family:var(--font-mono); font-size:0.75rem; color:var(--ink-muted);">Nenhum personagem cadastrado ainda.</div>`;

  if (isEdit && currentEvent) {
    document.getElementById('timeline-title-input').value = currentEvent.title || '';
    document.getElementById('timeline-date-display').value = currentEvent.dateStr || '';
    document.getElementById('timeline-sort-order').value = currentEvent.sortOrder !== undefined ? currentEvent.sortOrder : '';
    document.getElementById('timeline-era-input').value = currentEvent.era || '';
    document.getElementById('timeline-type-select').value = currentEvent.type || 'presente';
    document.getElementById('timeline-color-select').value = currentEvent.color || '#d4af37';
    document.getElementById('timeline-chapter-select').value = currentEvent.chapterId || '';
    document.getElementById('timeline-summary-input').value = currentEvent.summary || '';
  } else {
    document.getElementById('form-timeline-event').reset();
    document.getElementById('timeline-type-select').value = 'presente';
    document.getElementById('timeline-color-select').value = '#d4af37';
    const maxOrder = proj.timelineEvents.reduce((max, ev) => Math.max(max, Number(ev.sortOrder) || 0), 0);
    document.getElementById('timeline-sort-order').value = (maxOrder + 1).toFixed(1);
  }

  document.getElementById('modal-timeline-event').classList.add('open');
}

function saveTimelineEvent(e) {
  e.preventDefault();
  const proj = getCurrentProject();
  if (!proj.timelineEvents) proj.timelineEvents = [];

  const id = document.getElementById('timeline-event-id').value;
  const chVal = document.getElementById('timeline-chapter-select').value;

  const checkedChars = Array.from(document.querySelectorAll('input[name="timeline-char-chk"]:checked'))
    .map(chk => Number(chk.value));

  const eventData = {
    title: document.getElementById('timeline-title-input').value,
    dateStr: document.getElementById('timeline-date-display').value,
    sortOrder: Number(document.getElementById('timeline-sort-order').value) || 0,
    era: document.getElementById('timeline-era-input').value,
    type: document.getElementById('timeline-type-select').value,
    color: document.getElementById('timeline-color-select').value,
    chapterId: chVal ? Number(chVal) : null,
    characterIds: checkedChars,
    summary: document.getElementById('timeline-summary-input').value
  };

  if (id) {
    const idx = proj.timelineEvents.findIndex(ev => ev.id === Number(id));
    proj.timelineEvents[idx] = { ...proj.timelineEvents[idx], ...eventData };
  } else {
    proj.timelineEvents.push({ id: Date.now(), ...eventData });
  }

  syncStorage();
  renderTimeline();
  closeModal('modal-timeline-event');
}

function deleteTimelineEvent(id) {
  const proj = getCurrentProject();
  if (confirm("Deseja remover este marco da linha do tempo?")) {
    proj.timelineEvents = (proj.timelineEvents || []).filter(ev => ev.id !== id);
    syncStorage();
    renderTimeline();
  }
}

// ================= 5. CAPÍTULOS & ATELIÊ DE ESCRITA =================
function renderChapters() {
  const proj = getCurrentProject();
  const list = document.getElementById('chapters-list');
  const progressWrap = document.getElementById('chapters-progress-wrap');

  if (!proj.chapters || proj.chapters.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        Nenhum capítulo organizado ainda.<br>
        Clique em <strong>+ Novo Capítulo</strong> para começar!
      </div>`;
    progressWrap.innerHTML = '';
    return;
  }

  const total = proj.chapters.length;
  const doneCount = proj.chapters.filter(c => c.status === 'finalizado').length;
  const totalWords = proj.chapters.reduce((acc, c) => acc + (Number(c.wordCount) || 0), 0);
  const totalTarget = proj.chapters.reduce((acc, c) => acc + (Number(c.wordTarget) || 0), 0);
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  progressWrap.innerHTML = `
    <div class="chapters-progress-label">
      <span>${doneCount} de ${total} capítulos finalizados &bull; <strong>${totalWords.toLocaleString('pt-BR')}</strong> palavras no total ${totalTarget > 0 ? `(Meta: ${totalTarget.toLocaleString('pt-BR')})` : ''}</span>
      <span>${pct}%</span>
    </div>
    <div class="chapters-progress-bar">
      <div class="chapters-progress-fill" style="width:${pct}%"></div>
    </div>`;

  list.innerHTML = proj.chapters.map((ch, idx) => {
    const pov = proj.characters.find(c => c.id === ch.povCharacterId);
    const statusInfo = CHAPTER_STATUSES.find(s => s.value === ch.status) || CHAPTER_STATUSES[0];
    const wc = Number(ch.wordCount) || (ch.content ? countWords(ch.content) : 0);
    const wt = Number(ch.wordTarget) || 0;
    const wordProgressPct = wt > 0 ? Math.min(100, Math.round((wc / wt) * 100)) : null;

    return `
      <div class="chapter-card" draggable="true" data-id="${ch.id}"
           ondragstart="chapterDragStart(event, ${ch.id})"
           ondragover="chapterDragOver(event)"
           ondrop="chapterDrop(event, ${ch.id})"
           ondragend="chapterDragEnd(event)">
        <div class="chapter-drag-handle" title="Arraste para reordenar">⠿</div>
        <div class="chapter-index">${idx + 1}</div>
        <div class="chapter-body">
          <div class="chapter-top-row">
            <h3 class="chapter-title">${ch.title || 'Sem título'}</h3>
            <span class="chapter-status-badge status-${statusInfo.value}">${statusInfo.label}</span>
          </div>
          ${ch.summary ? `<p class="chapter-summary">${ch.summary}</p>` : ''}
          <div class="chapter-meta-row">
            ${pov ? `<span class="chapter-meta-tag">👤 POV: ${pov.name}</span>` : ''}
            ${wt > 0 ? `<span class="chapter-meta-tag">🖊 ${wc.toLocaleString('pt-BR')} / ${wt.toLocaleString('pt-BR')} palavras</span>` : (wc > 0 ? `<span class="chapter-meta-tag">🖊 ${wc.toLocaleString('pt-BR')} palavras</span>` : '')}
            ${ch.sceneKey ? `<span class="chapter-meta-tag" style="color:var(--accent-gold);">✦ ${ch.sceneKey}</span>` : ''}
            <button class="btn btn-primary btn-sm" style="margin-left:auto;" onclick="openWriterStudio(${ch.id})">✍️ Ateliê de Escrita</button>
          </div>
          ${wordProgressPct !== null ? `
            <div class="chapter-word-bar">
              <div class="chapter-word-fill" style="width:${wordProgressPct}%"></div>
            </div>` : ''}
        </div>
        <div class="chapter-actions">
          <button class="board-mini-btn" onclick="moveChapter(${ch.id}, -1)" title="Mover para cima">↑</button>
          <button class="board-mini-btn" onclick="moveChapter(${ch.id}, 1)" title="Mover para baixo">↓</button>
          <button class="board-mini-btn" onclick="openChapterModal(${ch.id})" title="Configurações">⚙️</button>
          <button class="board-mini-btn" onclick="deleteChapter(${ch.id})" title="Excluir">🗑</button>
        </div>
      </div>`;
  }).join('');
}

function openWriterStudio(chapterId) {
  const proj = getCurrentProject();
  const ch = proj.chapters.find(c => c.id === chapterId);
  if (!ch) return;

  activeWritingChapterId = chapterId;
  const idx = proj.chapters.findIndex(c => c.id === chapterId);

  document.getElementById('writer-chapter-index-display').textContent = `CAPÍTULO ${idx + 1}`;
  document.getElementById('writer-chapter-title-input').value = ch.title || '';
  document.getElementById('writer-textarea').value = ch.content || '';
  document.getElementById('writer-summary-input').value = ch.summary || '';
  document.getElementById('writer-scene-key-input').value = ch.sceneKey || '';
  document.getElementById('writer-word-target').value = ch.wordTarget || '';

  const povSelect = document.getElementById('writer-pov-select');
  povSelect.innerHTML = `<option value="">— Nenhum —</option>` +
    proj.characters.map(c => `<option value="${c.id}" ${c.id === ch.povCharacterId ? 'selected' : ''}>${c.name}</option>`).join('');

  const statusSelect = document.getElementById('writer-status-select');
  statusSelect.innerHTML = CHAPTER_STATUSES.map(s => `
    <option value="${s.value}" ${s.value === ch.status ? 'selected' : ''}>${s.label}</option>
  `).join('');

  const pillGrid = document.getElementById('writer-characters-quicklist');
  pillGrid.innerHTML = proj.characters.map(c => `
    <button type="button" class="writer-char-chip" onclick="insertCharacterInWriter('${c.name}')">+ ${c.name}</button>
  `).join('');

  updateWriterStats();
  document.getElementById('modal-chapter-writer').classList.add('open');
}

function handleWriterTextInput() {
  updateWriterStats();
  const proj = getCurrentProject();
  const ch = proj.chapters.find(c => c.id === activeWritingChapterId);
  if (ch) {
    ch.content = document.getElementById('writer-textarea').value;
    ch.wordCount = countWords(ch.content);
    syncStorage();
  }
}

function updateWriterStats() {
  const text = document.getElementById('writer-textarea').value;
  const words = countWords(text);
  const readingTime = Math.max(1, Math.round(words / 200));

  document.getElementById('writer-word-counter').textContent = `${words.toLocaleString('pt-BR')} palavras`;
  document.getElementById('writer-read-time').textContent = `~${readingTime} min de leitura`;
}

function onWriterMetaChange() {
  const proj = getCurrentProject();
  const ch = proj.chapters.find(c => c.id === activeWritingChapterId);
  if (!ch) return;

  ch.title = document.getElementById('writer-chapter-title-input').value;
  ch.summary = document.getElementById('writer-summary-input').value;
  ch.sceneKey = document.getElementById('writer-scene-key-input').value;
  ch.wordTarget = document.getElementById('writer-word-target').value;
  ch.status = document.getElementById('writer-status-select').value;
  const povVal = document.getElementById('writer-pov-select').value;
  ch.povCharacterId = povVal ? Number(povVal) : null;

  syncStorage();
}

function insertCharacterInWriter(name) {
  const textarea = document.getElementById('writer-textarea');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  textarea.value = text.substring(0, start) + name + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + name.length;
  handleWriterTextInput();
}

function toggleWriterDrawer() {
  const drawer = document.getElementById('writer-side-drawer');
  drawer.classList.toggle('closed');
}

function saveWriterContentAndClose() {
  const proj = getCurrentProject();
  const ch = proj.chapters.find(c => c.id === activeWritingChapterId);
  if (ch) {
    ch.content = document.getElementById('writer-textarea').value;
    ch.wordCount = countWords(ch.content);
    onWriterMetaChange();
  }
  closeModal('modal-chapter-writer');
  renderChapters();
  activeWritingChapterId = null;
}

function closeWriterModalDirect(e) {
  if (e.target.id === 'modal-chapter-writer') {
    saveWriterContentAndClose();
  }
}

function openChapterModal(id = null) {
  const isEdit = id !== null;
  const proj = getCurrentProject();

  document.getElementById('modal-chapter-title').textContent = isEdit ? "Configurações do Capítulo" : "Novo Capítulo";
  document.getElementById('chapter-id').value = isEdit ? id : "";

  const povSelect = document.getElementById('chapter-pov');
  povSelect.innerHTML = `<option value="">— Nenhum —</option>` +
    proj.characters.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  const statusSelect = document.getElementById('chapter-status');
  statusSelect.innerHTML = CHAPTER_STATUSES.map(s => `<option value="${s.value}">${s.label}</option>`).join('');

  if (isEdit) {
    const ch = proj.chapters.find(c => c.id === id);
    document.getElementById('chapter-title-input').value = ch.title || '';
    document.getElementById('chapter-status').value = ch.status || 'ideia';
    document.getElementById('chapter-summary').value = ch.summary || '';
    document.getElementById('chapter-scene-key').value = ch.sceneKey || '';
    document.getElementById('chapter-pov').value = ch.povCharacterId || '';
    document.getElementById('chapter-word-target').value = ch.wordTarget || '';
  } else {
    document.getElementById('form-chapter').reset();
    document.getElementById('chapter-status').value = 'ideia';
  }

  document.getElementById('modal-chapter').classList.add('open');
}

function saveChapter(e) {
  e.preventDefault();
  const proj = getCurrentProject();
  const id = document.getElementById('chapter-id').value;

  const povValue = document.getElementById('chapter-pov').value;
  const chData = {
    title: document.getElementById('chapter-title-input').value,
    status: document.getElementById('chapter-status').value,
    summary: document.getElementById('chapter-summary').value,
    sceneKey: document.getElementById('chapter-scene-key').value,
    povCharacterId: povValue ? Number(povValue) : null,
    wordTarget: document.getElementById('chapter-word-target').value || ''
  };

  if (id) {
    const index = proj.chapters.findIndex(c => c.id === Number(id));
    proj.chapters[index] = { ...proj.chapters[index], ...chData };
  } else {
    proj.chapters.push({ id: Date.now(), content: '', wordCount: 0, ...chData });
  }

  syncStorage();
  renderChapters();
  closeModal('modal-chapter');
}

function deleteChapter(id) {
  const proj = getCurrentProject();
  if (confirm("Deseja excluir este capítulo do manuscrito?")) {
    proj.chapters = proj.chapters.filter(c => c.id !== id);
    syncStorage();
    renderChapters();
  }
}

function moveChapter(id, direction) {
  const proj = getCurrentProject();
  const index = proj.chapters.findIndex(c => c.id === id);
  const newIndex = index + direction;
  if (index === -1 || newIndex < 0 || newIndex >= proj.chapters.length) return;

  const [item] = proj.chapters.splice(index, 1);
  proj.chapters.splice(newIndex, 0, item);

  syncStorage();
  renderChapters();
}

function chapterDragStart(e, id) {
  draggedChapterId = id;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function chapterDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function chapterDrop(e, targetId) {
  e.preventDefault();
  if (draggedChapterId === null || draggedChapterId === targetId) return;

  const proj = getCurrentProject();
  const fromIndex = proj.chapters.findIndex(c => c.id === draggedChapterId);
  const toIndex = proj.chapters.findIndex(c => c.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const [item] = proj.chapters.splice(fromIndex, 1);
  proj.chapters.splice(toIndex, 0, item);

  syncStorage();
  renderChapters();
}

function chapterDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedChapterId = null;
}

// ================= 6. EXPORTAÇÃO & IMPORTAÇÃO =================
function exportMarkdownDossier() {
  const proj = getCurrentProject();
  let md = `# ${proj.name.toUpperCase()}\n`;
  if (proj.genre) md += `**Gênero / Estilo:** ${proj.genre}\n\n`;
  if (proj.logline) md += `> "${proj.logline}"\n\n`;
  md += `---\n\n`;

  md += `## 1. WIKI DE PERSONAGENS\n\n`;
  if (proj.characters.length === 0) md += `*Nenhum artigo cadastrado.*\n\n`;
  proj.characters.forEach(c => {
    const apelido = getF(c, 'apelido');
    md += `### ${c.name} ${apelido ? `("${apelido}")` : ''}\n`;
    if (c.description) md += `\n${c.description}\n`;

    CHAR_SCHEMA.forEach(section => {
      const filled = section.fields.filter(([key]) => getF(c, key).trim() !== '');
      if (filled.length === 0) return;
      md += `\n**${section.section}**\n`;
      filled.forEach(([key, label]) => {
        md += `- **${label}:** ${getF(c, key).replace(/\n/g, ' ')}\n`;
      });
    });

    md += `\n---\n\n`;
  });

  md += `## 2. QUADROS DE IDEIAS & MOODBOARDS\n\n`;
  proj.boards.forEach(b => {
    md += `### PRANCHETA: ${b.name}\n`;
    if (b.desc) md += `*${b.desc}*\n\n`;
    if (b.items.length === 0) {
      md += `*Nenhum item nesta prancheta.*\n\n`;
    } else {
      b.items.forEach(item => {
        md += `#### [${item.type.toUpperCase()}] ${item.title}\n`;
        if (item.type === 'note') md += `${item.text || ''}\n\n`;
        if (item.type === 'image') md += `Legenda: ${item.caption || ''}\n\n`;
        if (item.type === 'clue') md += `Tipo: ${item.clueType || 'fato'} | Detalhes: ${item.desc || ''}\n\n`;
      });
    }
  });

  md += `---\n\n## 3. TEIA DE RELAÇÕES\n\n`;
  if (proj.relationships.length === 0) md += `*Nenhuma relação cadastrada.*\n\n`;
  proj.relationships.forEach(r => {
    const s = proj.characters.find(c => c.id === r.sourceId);
    const t = proj.characters.find(c => c.id === r.targetId);
    const dir = r.direction === 'forward' ? '➔' : (r.direction === 'backward' ? '⬅' : '↔');
    md += `### ${r.title} [${s ? s.name : '?'} ${dir} ${t ? t.name : '?'}]\n`;
    if (r.prose) md += `${r.prose}\n`;
    if (r.asymmetry) md += `*Assimetria: ${r.asymmetry}*\n`;
    if (r.pact) md += `*Pacto: ${r.pact}*\n`;
    md += `\n`;
  });

  md += `---\n\n## 4. CRONOLOGIA & LINHA DO TEMPO\n\n`;
  if (!proj.timelineEvents || proj.timelineEvents.length === 0) {
    md += `*Nenhum marco cronológico registrado.*\n\n`;
  } else {
    const sortedTimeline = [...proj.timelineEvents].sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
    sortedTimeline.forEach((ev) => {
      const typeObj = TIMELINE_EVENT_TYPES.find(t => t.value === ev.type) || TIMELINE_EVENT_TYPES[0];
      const linkedCh = proj.chapters.find(c => c.id === ev.chapterId);
      const charsPresent = (ev.characterIds || []).map(cid => proj.characters.find(c => c.id === cid)).filter(Boolean);

      md += `### [${typeObj.label}] ${ev.title}\n`;
      md += `- **Tempo da História:** ${ev.dateStr} (Ordem: ${ev.sortOrder})\n`;
      if (ev.era) md += `- **Era / Período:** ${ev.era}\n`;
      if (linkedCh) md += `- **Narrado no Capítulo:** ${linkedCh.title}\n`;
      if (charsPresent.length) md += `- **Personagens Envolvidos:** ${charsPresent.map(c => c.name).join(', ')}\n`;
      if (ev.summary) md += `\n${ev.summary}\n`;
      md += `\n---\n\n`;
    });
  }

  md += `## 5. MANUSCRITO & CAPÍTULOS\n\n`;
  if (!proj.chapters || proj.chapters.length === 0) {
    md += `*Nenhum capítulo organizado.*\n\n`;
  } else {
    proj.chapters.forEach((ch, idx) => {
      const pov = proj.characters.find(c => c.id === ch.povCharacterId);
      const statusInfo = CHAPTER_STATUSES.find(s => s.value === ch.status) || CHAPTER_STATUSES[0];
      md += `### Capítulo ${idx + 1}: ${ch.title || 'Sem título'}\n`;
      md += `**Status:** ${statusInfo.label} | **Palavras:** ${ch.wordCount || 0}\n`;
      if (pov) md += `**POV:** ${pov.name}\n`;
      if (ch.summary) md += `\n*Sinopse:* ${ch.summary}\n`;
      if (ch.sceneKey) md += `\n*Cena-chave:* ${ch.sceneKey}\n`;
      if (ch.content) {
        md += `\n#### Texto do Manuscrito:\n\n${ch.content}\n`;
      }
      md += `\n---\n\n`;
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `${proj.name.toLowerCase().replace(/\s+/g, '_')}_dossie_completo.md`);
  link.click();
}

function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `omniscripta_workspace_${new Date().toISOString().slice(0,10)}.json`);
  dlAnchor.click();
}

function exportCSV() {
  const proj = getCurrentProject();
  const escapeCSV = (str) => `"${(str || '').replace(/"/g, '""')}"`;
  
  const allFields = CHAR_SCHEMA.flatMap(section => section.fields);
  const headers = ["ID", "Nome", "Descrição", ...allFields.map(([, label]) => label)];
  const rows = proj.characters.map(c => [
    c.id,
    escapeCSV(c.name),
    escapeCSV(c.description),
    ...allFields.map(([key]) => escapeCSV(getF(c, key)))
  ].join(','));

  const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `elenco_journal_${proj.name.toLowerCase().replace(/\s+/g, '_')}.csv`);
  link.click();
}

function triggerImport() {
  document.getElementById('import-file').click();
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (imported.projects && Array.isArray(imported.projects)) {
        appData = imported;
        normalizeProjectsData(appData.projects);
        syncStorage();
        renderProjectSelector();
        refreshAllViews();
        alert("Caderno, cronologia e pranchetas carregados com sucesso!");
      } else {
        alert("Arquivo de backup incompatível.");
      }
    } catch (err) {
      alert("Erro ao ler o arquivo JSON.");
    }
  };
  reader.readAsText(file);
}

function refreshAllViews() {
  renderCharacters();
  renderBoard();
  renderWeb();
  renderTimeline();
  renderChapters();
  updateCounts();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (activeWritingChapterId) {
      saveWriterContentAndClose();
    } else {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
    }
  }
});

// ================= INICIALIZAÇÃO =================
initTheme();
renderProjectSelector();
refreshAllViews();
updateAuthUI();