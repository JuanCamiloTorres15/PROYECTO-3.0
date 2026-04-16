# 🍔 FoodBot — Asistente Virtual de Comida

Sistema completo de pedidos con chatbot inteligente.

## 🚀 Cómo ejecutar

### 1. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2. Ejecutar la aplicación
```bash
python app.py
```

### 3. Abrir en el navegador
```
http://localhost:5000
```

---

## 👤 Cuentas de prueba (creadas automáticamente)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@foodbot.com | admin123 |
| Restaurante 1 | burger@foodbot.com | burger123 |
| Restaurante 2 | pizza@foodbot.com | pizza123 |

---

## 🤖 Comandos del Chatbot

Escribe cualquiera de estas frases al FoodBot:
- **"hola"** → Bienvenida
- **"ver restaurantes"** → Lista de restaurantes
- **"menú"** → Ver productos del restaurante seleccionado
- **"métodos de pago"** → Opciones de pago
- **"mis pedidos"** → Historial de pedidos
- **"seguimiento"** → Estado del pedido
- **"ayuda"** → Lista de comandos

---

## 📁 Estructura del Proyecto

```
foodbot/
├── app.py                  # Backend Flask + API
├── requirements.txt
├── templates/
│   └── index.html          # SPA principal
└── static/
    ├── css/
    │   └── style.css       # Estilos personalizados
    └── js/
        └── app.js          # Lógica frontend
```

## 🗄️ Base de datos

SQLite automático en `foodbot.db` — se crea al iniciar.

**Tablas:**
- `usuario` — Clientes, restaurantes, admins
- `restaurante` — Datos del restaurante
- `producto` — Menú con categorías
- `pedido` — Órdenes realizadas
- `detalle_pedido` — Ítems por pedido

---

## 🎨 Tecnologías

| Capa | Tecnología |
|------|-----------|
| Backend | Python + Flask |
| Base de datos | SQLite + SQLAlchemy |
| Frontend | HTML5 + CSS3 + JavaScript |
| UI Framework | Bootstrap 5.3 |
| Íconos | Bootstrap Icons |
| Tipografía | Google Fonts (Syne + DM Sans) |
