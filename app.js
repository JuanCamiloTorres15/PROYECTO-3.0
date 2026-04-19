// Scroll suave
function scrollToSection(id){
  document.getElementById(id).scrollIntoView({behavior:"smooth"});
}

// Animación scroll
const reveals = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  let h = window.innerHeight;
  reveals.forEach(el=>{
    if(el.getBoundingClientRect().top < h-100){
      el.classList.add("active");
    }
  });
});

// CHATBOT
function sendMessage(){
  const input = document.getElementById("chat-input");
  const box = document.getElementById("chat-box");

  const msg = input.value.trim();
  if(!msg) return;

  box.innerHTML += `<div class="user"><b>Tú:</b> ${msg}</div>`;

  input.value = "";

  // typing
  const typing = document.createElement("div");
  typing.className="bot";
  typing.innerHTML="Bot está escribiendo...";
  box.appendChild(typing);

  setTimeout(()=>{
    typing.remove();

    let res = "No entendí tu pedido.";

    if(msg.includes("pizza")) res="Pizza 🍕 desde $20.000";
    else if(msg.includes("hamburguesa")) res="Hamburguesa 🍔 desde $12.000";
    else if(msg.includes("menu")) res="Menú: pizza, hamburguesa, perro caliente";
    else if(msg.includes("hola")) res="Hola 👋 ¿Qué deseas ordenar?";

    box.innerHTML += `<div class="bot"><b>Bot:</b> ${res}</div>`;
    box.scrollTop = box.scrollHeight;

  },1000);
}
