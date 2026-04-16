/* ─── FOODBOT APP.JS ───────────────────────────────────────── */

// ─── STATE ────────────────────────────────────────────────────
let estado = {
  usuario: null,
  carrito: [],
  restauranteActual: null,
  pedidoActual: null,
  chatContexto: {}
};

// ─── VIEWS ────────────────────────────────────────────────────
function showView(id) {
  document.querySelectorAll('.fb-view').forEach(v => v.classList.remove('active'));
  const view = document.getElementById(id);
  if (view) view.classList.add('active');
  window.scrollTo(0, 0);

  if (id === 'restaurantesView') loadRestaurantes();
  if (id === 'historialView') loadHistorial();
  if (id === 'adminView') loadAdmin();
}

// ─── MODALS ───────────────────────────────────────────────────
function showModal(id) {
  const el = document.getElementById(id);
  if (el) new bootstrap.Modal(el).show();
}

function hideModal(id) {
  const m = bootstrap.Modal.getInstance(document.getElementById(id));
  if (m) m.hide();
}

function swapModal(hideId, showId) {
  hideModal(hideId);
  setTimeout(() => showModal(showId), 300);
}

// ─── TOAST ────────────────────────────────────────────────────
function toast(msg, type = 'success') {
  const el = document.getElementById('liveToast');
  const body = document.getElementById('toastMsg');
  el.className = `toast fb-toast align-items-center border-0 text-bg-${type === 'error' ? 'danger' : 'success'}`;
  body.innerHTML = msg;
  new bootstrap.Toast(el, { delay: 3000 }).show();
}

// ─── AUTH ─────────────────────────────────────────────────────
async function checkAuth() {
  try {
    const r = await fetch('/api/me');
    const d = await r.json();
    if (d.autenticado) {
      estado.usuario = d;
      updateNavbar(d);
      if (d.rol === 'admin') document.getElementById('adminMenuItem').classList.remove('d-none');
      loadCarritoFromStorage();
    }
  } catch (e) {}
}

function updateNavbar(user) {
  document.getElementById('navGuest').classList.add('d-none');
  document.getElementById('navUser').classList.remove('d-none');
  document.getElementById('navUserName').textContent = user.nombre.split(' ')[0];
}

async function doLogin() {
  clearError('loginError');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showError('loginError', 'Completa todos los campos');

  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const d = await r.json();
    if (!r.ok) return showError('loginError', d.error);
    estado.usuario = d;
    updateNavbar(d);
    if (d.rol === 'admin') document.getElementById('adminMenuItem').classList.remove('d-none');
    hideModal('loginModal');
    toast(`¡Bienvenido, ${d.nombre.split(' ')[0]}! 👋`);
    syncCarritoWithUser();
  } catch (e) { showError('loginError', 'Error de conexión'); }
}

async function doRegister() {
  clearError('registerError');
  const nombre = document.getElementById('regNombre').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const telefono = document.getElementById('regTelefono').value.trim();
  const direccion = document.getElementById('regDireccion').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!nombre || !email || !telefono || !direccion || !password)
    return showError('registerError', 'Todos los campos son obligatorios');

  try {
    const r = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, telefono, direccion, password })
    });
    const d = await r.json();
    if (!r.ok) return showError('registerError', d.error);
    estado.usuario = d;
    updateNavbar(d);
    hideModal('registerModal');
    toast(`¡Cuenta creada! Bienvenido, ${d.nombre.split(' ')[0]} 🎉`);
  } catch (e) { showError('registerError', 'Error de conexión'); }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  estado.usuario = null;
  estado.carrito = [];
  localStorage.removeItem('foodbot_carrito');
  document.getElementById('navGuest').classList.remove('d-none');
  document.getElementById('navUser').classList.add('d-none');
  document.getElementById('adminMenuItem').classList.add('d-none');
  document.getElementById('cartCount').textContent = '0';
  showView('homeView');
  toast('Sesión cerrada');
}

async function guardarPerfil() {
  const nombre = document.getElementById('perfilNombre').value.trim();
  const telefono = document.getElementById('perfilTelefono').value.trim();
  const direccion = document.getElementById('perfilDireccion').value.trim();
  const r = await fetch('/api/perfil', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, telefono, direccion })
  });
  if (r.ok) {
    hideModal('perfilModal');
    toast('Perfil actualizado ✅');
    estado.usuario.nombre = nombre;
    document.getElementById('navUserName').textContent = nombre.split(' ')[0];
  }
}

function openPerfilModal() {
  if (!estado.usuario) return;
  fetch('/api/me').then(r => r.json()).then(d => {
    document.getElementById('perfilNombre').value = d.nombre || '';
    document.getElementById('perfilTelefono').value = d.telefono || '';
    document.getElementById('perfilDireccion').value = d.direccion || '';
  });
  showModal('perfilModal');
}

// ─── RESTAURANTES ─────────────────────────────────────────────
async function loadRestaurantes() {
  const container = document.getElementById('restaurantesList');
  container.innerHTML = '<div class="col-12 text-center py-5"><div class="fb-spinner"></div></div>';
  try {
    const r = await fetch('/api/restaurantes');
    const rests = await r.json();
    if (!rests.length) {
      container.innerHTML = '<div class="col-12 text-center py-5"><div class="text-muted">No hay restaurantes disponibles</div></div>';
      return;
    }
    container.innerHTML = rests.map(rest => `
      <div class="col-sm-6 col-lg-4">
        <div class="fb-restaurant-card" onclick="abrirRestaurante(${rest.id}, '${escHtml(rest.nombre)}', '${escHtml(rest.categoria)}', '${escHtml(rest.horario)}')">
          <div class="rc-icon">${getRestIcon(rest.categoria)}</div>
          <div class="rc-cat">${rest.categoria}</div>
          <div class="rc-name">${rest.nombre}</div>
          <div class="rc-info">
            <i class="bi bi-clock me-1"></i>${rest.horario}<br>
            <i class="bi bi-geo-alt me-1"></i>${rest.direccion}
          </div>
          <div class="mt-3 d-flex gap-2">
            <span class="badge" style="background:rgba(50,205,50,.15);color:#32CD32;font-size:.7rem">● Abierto</span>
            <span class="badge" style="background:rgba(255,183,3,.15);color:var(--fb-accent);font-size:.7rem">🚚 ~35 min</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) { container.innerHTML = '<div class="col-12 text-center text-danger">Error al cargar restaurantes</div>'; }
}

function getRestIcon(cat) {
  const icons = { 'Hamburguesas': '🍔', 'Pizzas': '🍕', 'Sushi': '🍣', 'Tacos': '🌮', 'Ensaladas': '🥗', 'Pastas': '🍝', 'Pollos': '🍗' };
  return icons[cat] || '🍽️';
}

async function abrirRestaurante(id, nombre, cat, horario) {
  estado.restauranteActual = { id, nombre, cat };
  estado.chatContexto.restaurante_id = id;
  document.getElementById('menuRestNombre').textContent = nombre;
  document.getElementById('menuRestInfo').textContent = `${cat} · ${horario}`;
  showView('menuView');
  loadMenu(id);
}

async function loadMenu(restId) {
  const container = document.getElementById('productosList');
  const catContainer = document.getElementById('categoryFilters');
  container.innerHTML = '<div class="col-12 text-center py-5"><div class="fb-spinner"></div></div>';
  catContainer.innerHTML = '';

  try {
    const r = await fetch(`/api/restaurantes/${restId}/productos`);
    const prods = await r.json();
    if (!prods.length) { container.innerHTML = '<div class="col-12 text-center text-muted py-5">No hay productos disponibles</div>'; return; }

    const cats = [...new Set(prods.map(p => p.categoria))];
    catContainer.innerHTML = `
      <button class="cat-btn active" onclick="filterCat(this, 'all', ${restId})">Todos</button>
      ${cats.map(c => `<button class="cat-btn" onclick="filterCat(this, '${escHtml(c)}', ${restId})">${c}</button>`).join('')}
    `;

    renderProductos(prods);
  } catch (e) { container.innerHTML = '<div class="col-12 text-danger text-center py-5">Error al cargar menú</div>'; }
}

function renderProductos(prods) {
  const container = document.getElementById('productosList');
  container.innerHTML = prods.map(p => `
    <div class="col-sm-6 col-lg-4">
      <div class="fb-product-card">
        <div class="pc-emoji">${getProductEmoji(p.nombre)}</div>
        <div class="pc-name">${p.nombre}</div>
        <div class="pc-desc">${p.descripcion || ''}</div>
        <div class="pc-footer">
          <span class="pc-price">${formatPrice(p.precio)}</span>
          <button class="btn-add" onclick="agregarAlCarrito(${p.id}, '${escHtml(p.nombre)}', ${p.precio}, ${estado.restauranteActual?.id || 0})">
            <i class="bi bi-plus-lg me-1"></i>Agregar
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window._todosProds = [];
async function filterCat(btn, cat, restId) {
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const r = await fetch(`/api/restaurantes/${restId}/productos`);
  const prods = await r.json();
  const filtrados = cat === 'all' ? prods : prods.filter(p => p.categoria === cat);
  renderProductos(filtrados);
}

function getProductEmoji(nombre) {
  const lower = nombre.toLowerCase();
  if (lower.includes('burger') || lower.includes('hambur')) return '🍔';
  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('papa') || lower.includes('frita')) return '🍟';
  if (lower.includes('malteada')) return '🥤';
  if (lower.includes('gaseosa') || lower.includes('bebida')) return '🥤';
  if (lower.includes('limonada')) return '🧃';
  if (lower.includes('pasta') || lower.includes('spaguetti')) return '🍝';
  if (lower.includes('ensalada')) return '🥗';
  if (lower.includes('margarita') || lower.includes('hawaiana') || lower.includes('pepperoni')) return '🍕';
  if (lower.includes('pollo')) return '🍗';
  return '🍽️';
}

// ─── CARRITO ──────────────────────────────────────────────────
function agregarAlCarrito(productoId, nombre, precio, restauranteId) {
  // Validar mismo restaurante
  if (estado.carrito.length > 0 && estado.carrito[0].restaurante_id !== restauranteId) {
    if (!confirm('Tu carrito tiene productos de otro restaurante. ¿Deseas vaciarlo y agregar este producto?')) return;
    estado.carrito = [];
  }

  const idx = estado.carrito.findIndex(i => i.producto_id === productoId);
  if (idx >= 0) {
    estado.carrito[idx].cantidad++;
  } else {
    estado.carrito.push({ producto_id: productoId, nombre, precio, cantidad: 1, restaurante_id: restauranteId });
  }
  saveCarrito();
  updateCartCount();
  toast(`✅ ${nombre} agregado al carrito`);
  animateCartBtn();
}

function animateCartBtn() {
  const btn = document.querySelector('.fb-cart-btn');
  btn.style.transform = 'scale(1.2)';
  setTimeout(() => btn.style.transform = '', 200);
}

function updateCartCount() {
  const total = estado.carrito.reduce((s, i) => s + i.cantidad, 0);
  document.getElementById('cartCount').textContent = total;
}

function saveCarrito() {
  localStorage.setItem('foodbot_carrito', JSON.stringify(estado.carrito));
}

function loadCarritoFromStorage() {
  const stored = localStorage.getItem('foodbot_carrito');
  if (stored) {
    try { estado.carrito = JSON.parse(stored); updateCartCount(); } catch (e) {}
  }
}

function syncCarritoWithUser() { updateCartCount(); }

function renderCarrito() {
  const container = document.getElementById('carritoItems');
  const summary = document.getElementById('orderSummary');

  if (!estado.carrito.length) {
    container.innerHTML = `
      <div class="fb-empty-cart text-center py-5">
        <div class="empty-icon">🛒</div>
        <h5 class="mt-3">Tu carrito está vacío</h5>
        <p class="text-muted">Agrega productos desde el menú de un restaurante</p>
        <button class="btn fb-btn-primary mt-2" onclick="showView('restaurantesView')">Ver Restaurantes</button>
      </div>`;
    summary.style.display = 'none';
    return;
  }

  container.innerHTML = estado.carrito.map((item, idx) => `
    <div class="fb-cart-item">
      <div class="ci-emoji">${getProductEmoji(item.nombre)}</div>
      <div class="flex-grow-1">
        <div class="ci-name">${item.nombre}</div>
        <div class="ci-price">${formatPrice(item.precio)} c/u</div>
      </div>
      <div class="ci-controls">
        <button class="qty-btn" onclick="cambiarCantidad(${idx}, -1)">−</button>
        <span class="qty-num">${item.cantidad}</span>
        <button class="qty-btn" onclick="cambiarCantidad(${idx}, 1)">+</button>
      </div>
      <div class="ci-total">${formatPrice(item.precio * item.cantidad)}</div>
      <button class="btn-remove" onclick="quitarItem(${idx})"><i class="bi bi-trash3"></i></button>
    </div>
  `).join('');

  const subtotal = estado.carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const domicilio = 3900;
  const total = subtotal + domicilio;
  document.getElementById('summSubtotal').textContent = formatPrice(subtotal);
  document.getElementById('summDomicilio').textContent = formatPrice(domicilio);
  document.getElementById('summTotal').textContent = formatPrice(total);
  summary.style.display = 'block';

  // Pre-fill address
  if (estado.usuario) {
    const dir = document.getElementById('cartDireccion');
    if (!dir.value) {
      fetch('/api/me').then(r => r.json()).then(d => { if (d.direccion) dir.value = d.direccion; });
    }
  }
}

function cambiarCantidad(idx, delta) {
  estado.carrito[idx].cantidad += delta;
  if (estado.carrito[idx].cantidad <= 0) estado.carrito.splice(idx, 1);
  saveCarrito();
  updateCartCount();
  renderCarrito();
}

function quitarItem(idx) {
  estado.carrito.splice(idx, 1);
  saveCarrito();
  updateCartCount();
  renderCarrito();
}

function selectPago(metodo) {
  document.querySelectorAll('.payment-option input').forEach(r => r.checked = r.value === metodo);
}

async function confirmarPedido() {
  if (!estado.usuario) { showModal('loginModal'); return; }
  if (!estado.carrito.length) { toast('Tu carrito está vacío', 'error'); return; }

  const direccion = document.getElementById('cartDireccion').value.trim();
  if (!direccion) { toast('Ingresa una dirección de entrega', 'error'); return; }

  const metodoPago = document.querySelector('.payment-option input:checked')?.value || 'efectivo';
  const restaurante_id = estado.carrito[0].restaurante_id;

  try {
    const r = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: estado.carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio: i.precio })),
        restaurante_id,
        direccion,
        metodo_pago: metodoPago
      })
    });
    const d = await r.json();
    if (!r.ok) { toast(d.error, 'error'); return; }

    estado.pedidoActual = d.pedido_id;
    estado.carrito = [];
    saveCarrito();
    updateCartCount();

    document.getElementById('confirmedPedidoId').textContent = `#${d.pedido_id}`;
    showModal('pedidoOkModal');
  } catch (e) { toast('Error al confirmar pedido', 'error'); }
}

// ─── HISTORIAL ────────────────────────────────────────────────
async function loadHistorial() {
  const container = document.getElementById('historialList');
  container.innerHTML = '<div class="col-12 text-center py-5"><div class="fb-spinner"></div></div>';

  if (!estado.usuario) {
    container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Debes iniciar sesión para ver tus pedidos</p><button class="btn fb-btn-primary" onclick="showModal(\'loginModal\')">Iniciar Sesión</button></div>';
    return;
  }
  try {
    const r = await fetch('/api/mis-pedidos');
    const pedidos = await r.json();
    if (!pedidos.length) {
      container.innerHTML = '<div class="col-12 text-center py-5"><div class="empty-icon" style="font-size:3rem">📦</div><h6 class="mt-3 text-muted">Aún no tienes pedidos</h6><button class="btn fb-btn-primary mt-2" onclick="showView(\'restaurantesView\')">Hacer mi primer pedido</button></div>';
      return;
    }
    container.innerHTML = pedidos.map(p => `
      <div class="col-12">
        <div class="fb-pedido-card" onclick="verSeguimientoPedido(${p.id})">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="pedido-id mb-1">#${p.id}</div>
              <div class="pedido-rest">${p.restaurante}</div>
              <div class="pedido-fecha mt-1"><i class="bi bi-calendar3 me-1"></i>${p.fecha} · ${p.metodo_pago}</div>
            </div>
            <div class="text-end">
              <div class="pedido-total mb-2">${formatPrice(p.total)}</div>
              <span class="estado-badge estado-${p.estado.replace(' ', '-')}">${estadoLabel(p.estado)}</span>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) { container.innerHTML = '<div class="col-12 text-danger text-center py-5">Error al cargar pedidos</div>'; }
}

function estadoLabel(estado) {
  const labels = { 'recibido': '📥 Recibido', 'preparando': '👨‍🍳 Preparando', 'camino': '🚚 En camino', 'entregado': '✅ Entregado' };
  return labels[estado] || estado;
}

// ─── SEGUIMIENTO ──────────────────────────────────────────────
function verSeguimiento() {
  hideModal('pedidoOkModal');
  if (estado.pedidoActual) verSeguimientoPedido(estado.pedidoActual);
}

async function verSeguimientoPedido(pedidoId) {
  showView('seguimientoView');
  const container = document.getElementById('trackingContent');
  container.innerHTML = '<div class="text-center py-5"><div class="fb-spinner"></div></div>';

  try {
    const r = await fetch(`/api/pedidos/${pedidoId}`);
    const p = await r.json();

    const steps = [
      { key: 'recibido', label: 'Pedido Recibido', desc: 'El restaurante recibió tu pedido', icon: '📥' },
      { key: 'preparando', label: 'En Preparación', desc: 'Están preparando tu comida', icon: '👨‍🍳' },
      { key: 'camino', label: 'En Camino', desc: 'Tu domiciliario está en camino', icon: '🚚' },
      { key: 'entregado', label: 'Entregado', desc: '¡Tu pedido ha llegado!', icon: '✅' }
    ];

    const stateOrder = ['recibido', 'preparando', 'camino', 'entregado'];
    const currentIdx = stateOrder.indexOf(p.estado);
    const progressPct = ((currentIdx + 1) / stateOrder.length) * 100;

    container.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 class="fw-bold mb-1">Pedido #${p.id}</h5>
          <span class="text-muted small">${p.restaurante} · ${p.fecha}</span>
        </div>
        <span class="estado-badge estado-${p.estado}">${estadoLabel(p.estado)}</span>
      </div>
      <div class="progress-bar-fb">
        <div class="progress-fill" style="width:${progressPct}%"></div>
      </div>
      <div class="tracking-steps mb-4">
        ${steps.map((s, i) => {
          const isDone = i < currentIdx;
          const isActive = i === currentIdx;
          return `
            <div class="tracking-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
              <div class="ts-icon">${s.icon}</div>
              <div class="ts-info">
                <div class="ts-title">${s.label}</div>
                <div class="ts-desc">${s.desc}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="d-flex align-items-center gap-3 p-3 rounded-3" style="background:rgba(255,183,3,.08);border:1px solid rgba(255,183,3,.2)">
        <span style="font-size:1.5rem">⏱️</span>
        <div>
          <div class="fw-semibold">Tiempo estimado</div>
          <div class="text-muted small">${p.estado === 'entregado' ? '¡Pedido entregado!' : `~${p.tiempo_estimado} minutos`}</div>
        </div>
      </div>
      <div class="mt-4">
        <h6 class="fw-bold mb-3">Detalle del pedido</h6>
        ${p.items.map(item => `
          <div class="d-flex justify-content-between py-2" style="border-bottom:1px solid var(--fb-border)">
            <span>${item.cantidad}x ${item.nombre}</span>
            <span style="color:var(--fb-accent)">${formatPrice(item.precio * item.cantidad)}</span>
          </div>
        `).join('')}
        <div class="d-flex justify-content-between pt-3 fw-bold">
          <span>Total</span>
          <span style="color:var(--fb-accent);font-size:1.1rem">${formatPrice(p.total)}</span>
        </div>
      </div>
      ${p.estado !== 'entregado' ? `
        <div class="mt-4 d-flex gap-2">
          <button class="btn btn-outline-secondary btn-sm" onclick="simularEstado(${p.id}, '${nextEstado(p.estado)}')">
            Simular: Siguiente estado →
          </button>
        </div>
      ` : ''}
    `;
  } catch (e) { container.innerHTML = '<div class="text-danger text-center py-5">Error al cargar seguimiento</div>'; }
}

function nextEstado(actual) {
  const orden = ['recibido', 'preparando', 'camino', 'entregado'];
  const idx = orden.indexOf(actual);
  return idx < orden.length - 1 ? orden[idx + 1] : actual;
}

async function simularEstado(pedidoId, nuevoEstado) {
  await fetch(`/api/pedidos/${pedidoId}/estado`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: nuevoEstado })
  });
  toast(`Estado actualizado: ${estadoLabel(nuevoEstado)}`);
  verSeguimientoPedido(pedidoId);
}

// ─── ADMIN ────────────────────────────────────────────────────
async function loadAdmin() {
  try {
    const [ru, rp] = await Promise.all([fetch('/api/admin/usuarios'), fetch('/api/admin/pedidos')]);
    const usuarios = await ru.json();
    const pedidos = await rp.json();
    document.getElementById('adminStatUsers').textContent = usuarios.length || 0;
    document.getElementById('adminStatPedidos').textContent = pedidos.length || 0;
    renderAdminTabla('usuarios', usuarios);
  } catch (e) {}
}

function adminTab(tab) {
  document.querySelectorAll('#adminTabs .nav-link').forEach(l => l.classList.remove('active'));
  event.target.classList.add('active');
  if (tab === 'usuarios') {
    fetch('/api/admin/usuarios').then(r => r.json()).then(d => renderAdminTabla('usuarios', d));
  } else {
    fetch('/api/admin/pedidos').then(r => r.json()).then(d => renderAdminTabla('pedidos', d));
  }
}

function renderAdminTabla(tipo, data) {
  const container = document.getElementById('adminTabContent');
  if (tipo === 'usuarios') {
    container.innerHTML = `
      <div class="table-responsive">
        <table class="fb-table">
          <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Rol</th></tr></thead>
          <tbody>
            ${data.map(u => `<tr><td>#${u.id}</td><td>${u.nombre}</td><td>${u.email}</td><td>${u.telefono}</td><td><span class="estado-badge estado-${u.rol === 'admin' ? 'entregado' : 'recibido'}">${u.rol}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="table-responsive">
        <table class="fb-table">
          <thead><tr><th>ID</th><th>Usuario</th><th>Restaurante</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${data.map(p => `<tr><td>#${p.id}</td><td>${p.usuario}</td><td>${p.restaurante}</td><td>${formatPrice(p.total)}</td><td><span class="estado-badge estado-${p.estado}">${estadoLabel(p.estado)}</span></td><td>${p.fecha}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }
}

// ─── CHATBOT ──────────────────────────────────────────────────
function openChatbot() {
  const widget = document.getElementById('chatbotWidget');
  widget.classList.add('open');
  document.getElementById('chatToggle').style.display = 'none';
  const msgs = document.getElementById('chatMessages');
  if (!msgs.children.length) {
    addBotMessage({ texto: '👋 ¡Hola! Soy **FoodBot**, tu asistente de comida. ¿Qué se te antoja hoy?', tipo: 'bienvenida', acciones: ['Ver restaurantes', 'Mis pedidos', 'Ayuda'] });
  }
}

function closeChatbot() {
  document.getElementById('chatbotWidget').classList.remove('open');
  document.getElementById('chatToggle').style.display = 'flex';
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  addUserMessage(text);
  showTyping();

  try {
    const r = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: text, contexto: estado.chatContexto })
    });
    const d = await r.json();
    removeTyping();
    addBotMessage(d);
  } catch (e) {
    removeTyping();
    addBotMessage({ texto: '😔 Hubo un error. Intenta de nuevo.', tipo: 'error' });
  }
}

function sendQuickAction(text) {
  document.getElementById('chatInput').value = text;
  sendMessage();
}

function addUserMessage(text) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `<div class="msg-bubble">${escHtml(text)}</div>`;
  msgs.appendChild(div);
  scrollChat();
}

function addBotMessage(data) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';

  let html = `<div class="msg-bubble">${formatChatText(data.texto)}`;

  if (data.tipo === 'restaurantes' && data.datos) {
    html += `<div class="chat-restaurants mt-2">
      ${data.datos.map(r => `
        <button class="chat-rest-btn" onclick="chatSelectRest(${r.id}, '${escHtml(r.nombre)}', '${escHtml(r.categoria)}')">
          ${getRestIcon(r.categoria)} ${r.nombre} <small style="color:var(--fb-muted);margin-left:auto">${r.categoria}</small>
        </button>
      `).join('')}
    </div>`;
  }

  if (data.tipo === 'menu' && data.datos) {
    const cats = [...new Set(data.datos.map(p => p.categoria))];
    html += `<div class="chat-menu-items mt-2">`;
    cats.forEach(cat => {
      html += `<div class="fw-bold small mb-1 mt-2" style="color:var(--fb-accent)">${cat}</div>`;
      data.datos.filter(p => p.categoria === cat).forEach(p => {
        html += `<button class="chat-product-btn" onclick="chatAgregarProducto(${p.id}, '${escHtml(p.nombre)}', ${p.precio})">
          <span class="cpb-name">${getProductEmoji(p.nombre)} ${p.nombre}</span>
          <span class="cpb-price">${formatPrice(p.precio)}</span>
        </button>`;
      });
    });
    html += `</div>`;
  }

  html += `</div>`;
  div.innerHTML = html;
  msgs.appendChild(div);

  // Quick actions
  const qa = document.getElementById('quickActions');
  qa.innerHTML = '';
  if (data.acciones?.length) {
    data.acciones.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.textContent = a;
      btn.onclick = () => sendQuickAction(a);
      qa.appendChild(btn);
    });
  }

  scrollChat();
}

function chatSelectRest(id, nombre, cat) {
  estado.chatContexto.restaurante_id = id;
  estado.restauranteActual = { id, nombre, cat };
  addBotMessage({ texto: `✅ Seleccionaste **${nombre}**. ¿Quieres ver el menú?`, tipo: 'info', acciones: ['Ver menú', 'Abrir restaurante'] });
}

function chatAgregarProducto(id, nombre, precio) {
  if (!estado.restauranteActual) return;
  agregarAlCarrito(id, nombre, precio, estado.restauranteActual.id);
  addBotMessage({ texto: `🛒 **${nombre}** agregado al carrito.\n\n¿Quieres pedir algo más o confirmar tu pedido?`, tipo: 'info', acciones: ['Ver más productos', 'Ver carrito', 'Confirmar pedido'] });
}

function showTyping() {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.id = 'typingIndicator';
  div.innerHTML = '<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
  msgs.appendChild(div);
  scrollChat();
}

function removeTyping() {
  const t = document.getElementById('typingIndicator');
  if (t) t.remove();
}

function scrollChat() {
  const msgs = document.getElementById('chatMessages');
  msgs.scrollTop = msgs.scrollHeight;
}

function formatChatText(text) {
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

// ─── UTILS ────────────────────────────────────────────────────
function formatPrice(n) {
  return '$' + Number(n).toLocaleString('es-CO');
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.classList.remove('d-none');
  el.innerHTML = `<i class="bi bi-exclamation-circle me-2"></i>${msg}`;
}

function clearError(id) {
  const el = document.getElementById(id);
  el.classList.add('d-none');
  el.innerHTML = '';
}

// ─── INIT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  showView('homeView');
  loadCarritoFromStorage();

  // Hook carrito view render
  const carritoViewOrig = document.getElementById('carritoView');
  new MutationObserver(() => {
    if (carritoViewOrig.classList.contains('active')) renderCarrito();
  }).observe(carritoViewOrig, { attributes: true, attributeFilter: ['class'] });

  // Fix perfil modal open
  document.getElementById('perfilModal').addEventListener('show.bs.modal', openPerfilModal);

  // Quick action: map common phrases to actions
  const quickActionMap = {
    'ver restaurantes': () => showView('restaurantesView'),
    'ver mis pedidos': () => showView('historialView'),
    'mis pedidos': () => showView('historialView'),
    'ver carrito': () => showView('carritoView'),
    'confirmar pedido': () => showView('carritoView'),
    'abrir restaurante': () => { if(estado.restauranteActual) abrirRestaurante(estado.restauranteActual.id, estado.restauranteActual.nombre, estado.restauranteActual.cat, ''); },
    'ver menú': () => { if(estado.restauranteActual) abrirRestaurante(estado.restauranteActual.id, estado.restauranteActual.nombre, estado.restauranteActual.cat, ''); },
    'ver menu': () => { if(estado.restauranteActual) abrirRestaurante(estado.restauranteActual.id, estado.restauranteActual.nombre, estado.restauranteActual.cat, ''); },
  };

  // Override sendQuickAction for navigation shortcuts
  const origSend = sendQuickAction;
  window.sendQuickAction = (text) => {
    const action = quickActionMap[text.toLowerCase()];
    if (action) { action(); addUserMessage(text); } else origSend(text);
  };
});
