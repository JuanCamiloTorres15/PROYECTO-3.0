function sendMessage() {
  const input = document.getElementById("chat-input");
  const box = document.getElementById("chat-box");

  const message = input.value.trim();
  if (message === "") return;

  // Mostrar mensaje usuario
  box.innerHTML += `<div class="user"><b>Tú:</b> ${message}</div>`;

  let response = "No entendí tu pedido.";

  // Respuestas básicas
  if (message.toLowerCase().includes("pizza")) {
    response = "Tenemos pizza 🍕 desde $20.000";
  } else if (message.toLowerCase().includes("hamburguesa")) {
    response = "Tenemos hamburguesas 🍔 desde $12.000";
  } else if (message.toLowerCase().includes("menu")) {
    response = "Menú: Pizza, Hamburguesa, Perro caliente 🌭";
  } else if (message.toLowerCase().includes("hola")) {
    response = "¡Hola! ¿Qué deseas pedir?";
  }

  // Simulación de respuesta
  setTimeout(() => {
    box.innerHTML += `<div class="bot"><b>Bot:</b> ${response}</div>`;
    box.scrollTop = box.scrollHeight;
  }, 600);

  input.value = "";
}
