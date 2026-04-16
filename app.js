// RESTAURANTES
const restaurantes = [
  { id: 1, nombre: "McDonald's", categoria: "Comida rápida" },
  { id: 2, nombre: "Pizza Hut", categoria: "Pizza" },
  { id: 3, nombre: "Subway", categoria: "Saludable" }
];

// PRODUCTOS
const productos = {
  1: [
    { nombre: "Hamburguesa", precio: 12000 },
    { nombre: "Papas", precio: 5000 }
  ],
  2: [
    { nombre: "Pizza", precio: 20000 }
  ],
  3: [
    { nombre: "Sandwich", precio: 10000 }
  ]
};

let carrito = [];

// MOSTRAR RESTAURANTES
function mostrarRestaurantes() {
  const cont = document.getElementById("restaurant-list");
  cont.innerHTML = "";

  restaurantes.forEach(r => {
    cont.innerHTML += `
      <div class="col-md-4">
        <div class="fb-restaurant-card" onclick="mostrarProductos(${r.id})">
          <div class="rc-name">${r.nombre}</div>
          <div class="rc-cat">${r.categoria}</div>
        </div>
      </div>
    `;
  });
}

// MOSTRAR PRODUCTOS
function mostrarProductos(id) {
  const cont = document.getElementById("product-list");
  cont.innerHTML = "";

  productos[id].forEach(p => {
    cont.innerHTML += `
      <div class="col-md-4">
        <div class="fb-product-card">
          <div class="pc-name">${p.nombre}</div>
          <div class="pc-price">$${p.precio}</div>
          <button class="btn-add" onclick="agregarCarrito('${p.nombre}', ${p.precio})">
            Agregar
          </button>
        </div>
      </div>
    `;
  });
}

// AGREGAR AL CARRITO
function agregarCarrito(nombre, precio) {
  carrito.push({ nombre, precio });
  renderCarrito();
}

// RENDER CARRITO
function renderCarrito() {
  const cont = document.getElementById("cart-items");
  const totalEl = document.getElementById("total");

  cont.innerHTML = "";
  let total = 0;

  carrito.forEach(p => {
    total += p.precio;
    cont.innerHTML += `
      <div class="fb-cart-item">
        ${p.nombre} - $${p.precio}
      </div>
    `;
  });

  totalEl.textContent = total;
  document.getElementById("cart-count").textContent = carrito.length;
}

// CHATBOT
function toggleChat() {
  document.getElementById("chatbot").classList.toggle("open");
}

function sendMessage() {
  const input = document.getElementById("chat-input");
  const msg = input.value;

  if (!msg) return;

  addMessage(msg, "user");

  setTimeout(() => {
    addMessage("Te recomiendo hamburguesas 🍔", "bot");
  }, 500);

  input.value = "";
}

function addMessage(text, type) {
  const cont = document.getElementById("chat-messages");

  cont.innerHTML += `
    <div class="chat-msg ${type}">
      <div class="msg-bubble">${text}</div>
    </div>
  `;

  cont.scrollTop = cont.scrollHeight;
}
