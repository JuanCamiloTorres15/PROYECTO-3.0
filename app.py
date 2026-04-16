from flask import Flask, render_template, request, jsonify, session
import sqlite3, hashlib, re, os
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'foodbot-secret-key-2024'
DB = os.path.join(os.path.dirname(__file__), 'foodbot.db')

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def query(sql, params=(), one=False):
    conn = get_db()
    try:
        cur = conn.execute(sql, params)
        rows = cur.fetchall()
        conn.close()
        return (dict(rows[0]) if rows else None) if one else [dict(r) for r in rows]
    except Exception as e:
        conn.close()
        raise e

def execute(sql, params=()):
    conn = get_db()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        last_id = cur.lastrowid
        conn.close()
        return last_id
    except Exception as e:
        conn.close()
        raise e

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()
def check_pw(pw, h): return hash_pw(pw) == h

def init_db():
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS usuario (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            telefono TEXT NOT NULL,
            direccion TEXT NOT NULL,
            password TEXT NOT NULL,
            rol TEXT DEFAULT 'cliente',
            fecha_registro TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS restaurante (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            nit TEXT UNIQUE NOT NULL,
            direccion TEXT NOT NULL,
            telefono TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            categoria TEXT NOT NULL,
            horario TEXT DEFAULT '8:00 AM - 10:00 PM',
            estado TEXT DEFAULT 'activo',
            usuario_id INTEGER
        );
        CREATE TABLE IF NOT EXISTS producto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            precio REAL NOT NULL,
            categoria TEXT NOT NULL,
            restaurante_id INTEGER NOT NULL,
            disponible INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id INTEGER NOT NULL,
            restaurante_id INTEGER NOT NULL,
            total REAL NOT NULL,
            estado TEXT DEFAULT 'recibido',
            direccion TEXT NOT NULL,
            metodo_pago TEXT NOT NULL,
            fecha TEXT DEFAULT (datetime('now')),
            tiempo_estimado INTEGER DEFAULT 35
        );
        CREATE TABLE IF NOT EXISTS detalle_pedido (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pedido_id INTEGER NOT NULL,
            producto_id INTEGER NOT NULL,
            cantidad INTEGER NOT NULL,
            precio REAL NOT NULL
        );
    ''')
    conn.commit()
    conn.close()

def seed_data():
    if query('SELECT id FROM usuario LIMIT 1', one=True):
        return
    admin_id = execute("INSERT INTO usuario (nombre,email,telefono,direccion,password,rol) VALUES (?,?,?,?,?,?)",
                       ('Admin FoodBot','admin@foodbot.com','3001234567','Calle Principal 1',hash_pw('admin123'),'admin'))
    ru1 = execute("INSERT INTO usuario (nombre,email,telefono,direccion,password,rol) VALUES (?,?,?,?,?,?)",
                  ('Burger House','burger@foodbot.com','3009876543','Av. Hamburguesas 42',hash_pw('burger123'),'restaurante'))
    r1 = execute("INSERT INTO restaurante (nombre,nit,direccion,telefono,email,categoria,horario,estado,usuario_id) VALUES (?,?,?,?,?,?,?,?,?)",
                 ('Burger House','900123456','Av. Hamburguesas 42','3009876543','burger@foodbot.com','Hamburguesas','10:00 AM - 11:00 PM','activo',ru1))
    ru2 = execute("INSERT INTO usuario (nombre,email,telefono,direccion,password,rol) VALUES (?,?,?,?,?,?)",
                  ('Pizza Roma','pizza@foodbot.com','3111234567','Carrera 15 #23',hash_pw('pizza123'),'restaurante'))
    r2 = execute("INSERT INTO restaurante (nombre,nit,direccion,telefono,email,categoria,horario,estado,usuario_id) VALUES (?,?,?,?,?,?,?,?,?)",
                 ('Pizza Roma','900654321','Carrera 15 #23','3111234567','pizza@foodbot.com','Pizzas','11:00 AM - 12:00 AM','activo',ru2))
    for p in [
        ('Classic Burger','Hamburguesa clasica con queso cheddar, lechuga y tomate',18900,'Hamburguesas',r1),
        ('Doble Smash','Doble carne aplanada, queso americano y salsa especial',25900,'Hamburguesas',r1),
        ('Spicy Crispy','Pollo crujiente picante con jalapenos y mayo sriracha',22900,'Hamburguesas',r1),
        ('Papas Medianas','Papas fritas doradas con sal de mar',8900,'Acompañamientos',r1),
        ('Papas Grandes','Porcion grande de papas fritas crujientes',11900,'Acompañamientos',r1),
        ('Malteada Vainilla','Malteada cremosa de vainilla 500ml',12900,'Bebidas',r1),
        ('Gaseosa','Gaseosa 400ml a eleccion',5900,'Bebidas',r1),
        ('Pizza Margarita','Salsa de tomate, mozzarella y albahaca fresca',28900,'Pizzas',r2),
        ('Pizza Pepperoni','Doble pepperoni y queso mozzarella extra',35900,'Pizzas',r2),
        ('Pizza Hawaiana','Jamon, pina y queso mozzarella',33900,'Pizzas',r2),
        ('Pasta Carbonara','Pasta con crema, tocineta y queso parmesano',24900,'Pastas',r2),
        ('Pasta Bolognesa','Pasta con salsa de carne y tomates',22900,'Pastas',r2),
        ('Ensalada Cesar','Lechuga romana, crutones, parmesano y aderezo Cesar',16900,'Ensaladas',r2),
        ('Limonada de Coco','Limonada natural con leche de coco 400ml',9900,'Bebidas',r2),
    ]:
        execute("INSERT INTO producto (nombre,descripcion,precio,categoria,restaurante_id) VALUES (?,?,?,?,?)", p)
    print("Datos de prueba creados")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/me')
def me():
    uid = session.get('usuario_id')
    if not uid:
        return jsonify({'autenticado': False})
    u = query('SELECT * FROM usuario WHERE id=?', (uid,), one=True)
    if not u:
        return jsonify({'autenticado': False})
    return jsonify({'autenticado': True, 'nombre': u['nombre'], 'rol': u['rol'],
                    'email': u['email'], 'telefono': u['telefono'], 'direccion': u['direccion'], 'id': u['id']})

@app.route('/api/registro', methods=['POST'])
def registro():
    d = request.get_json()
    nombre = d.get('nombre','').strip()
    email = d.get('email','').strip().lower()
    telefono = d.get('telefono','').strip()
    direccion = d.get('direccion','').strip()
    password = d.get('password','')
    if not all([nombre, email, telefono, direccion, password]):
        return jsonify({'error': 'Todos los campos son obligatorios'}), 400
    if not re.match(r'^[^@]+@[^@]+\.[^@]+$', email):
        return jsonify({'error': 'Formato de email invalido'}), 400
    if not re.match(r'^\d{7,15}$', telefono):
        return jsonify({'error': 'Telefono debe tener entre 7 y 15 digitos'}), 400
    if len(password) < 6:
        return jsonify({'error': 'La contrasena debe tener al menos 6 caracteres'}), 400
    if query('SELECT id FROM usuario WHERE email=?', (email,), one=True):
        return jsonify({'error': 'Este email ya esta registrado'}), 400
    uid = execute('INSERT INTO usuario (nombre,email,telefono,direccion,password) VALUES (?,?,?,?,?)',
                  (nombre, email, telefono, direccion, hash_pw(password)))
    session['usuario_id'] = uid
    return jsonify({'ok': True, 'nombre': nombre, 'rol': 'cliente'})

@app.route('/api/login', methods=['POST'])
def login():
    d = request.get_json()
    email = d.get('email','').strip().lower()
    password = d.get('password','')
    u = query('SELECT * FROM usuario WHERE email=?', (email,), one=True)
    if not u or not check_pw(password, u['password']):
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    session['usuario_id'] = u['id']
    return jsonify({'ok': True, 'nombre': u['nombre'], 'rol': u['rol'], 'id': u['id']})

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'ok': True})

@app.route('/api/perfil', methods=['PUT'])
def actualizar_perfil():
    uid = session.get('usuario_id')
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    d = request.get_json()
    execute('UPDATE usuario SET nombre=?,telefono=?,direccion=? WHERE id=?',
            (d.get('nombre',''), d.get('telefono',''), d.get('direccion',''), uid))
    return jsonify({'ok': True})

@app.route('/api/restaurantes')
def get_restaurantes():
    return jsonify(query("SELECT * FROM restaurante WHERE estado='activo'"))

@app.route('/api/restaurantes/<int:rid>/productos')
def get_productos_restaurante(rid):
    return jsonify(query("SELECT * FROM producto WHERE restaurante_id=? AND disponible=1", (rid,)))

@app.route('/api/restaurantes/<int:rid>/categorias')
def get_categorias_restaurante(rid):
    rows = query("SELECT DISTINCT categoria FROM producto WHERE restaurante_id=? AND disponible=1", (rid,))
    return jsonify([r['categoria'] for r in rows])

@app.route('/api/pedidos', methods=['POST'])
def crear_pedido():
    uid = session.get('usuario_id')
    if not uid:
        return jsonify({'error': 'Debes iniciar sesion'}), 401
    d = request.get_json()
    items = d.get('items', [])
    if not items:
        return jsonify({'error': 'El carrito esta vacio'}), 400
    total = sum(i['precio'] * i['cantidad'] for i in items)
    pid = execute('INSERT INTO pedido (usuario_id,restaurante_id,total,direccion,metodo_pago) VALUES (?,?,?,?,?)',
                  (uid, d.get('restaurante_id'), total, d.get('direccion',''), d.get('metodo_pago','efectivo')))
    for item in items:
        execute('INSERT INTO detalle_pedido (pedido_id,producto_id,cantidad,precio) VALUES (?,?,?,?)',
                (pid, item['producto_id'], item['cantidad'], item['precio']))
    return jsonify({'ok': True, 'pedido_id': pid})

@app.route('/api/pedidos/<int:pid>')
def get_pedido(pid):
    p = query('SELECT * FROM pedido WHERE id=?', (pid,), one=True)
    if not p:
        return jsonify({'error': 'No encontrado'}), 404
    detalles = query('SELECT d.*,pr.nombre as prod_nombre FROM detalle_pedido d JOIN producto pr ON d.producto_id=pr.id WHERE d.pedido_id=?', (pid,))
    r = query('SELECT nombre FROM restaurante WHERE id=?', (p['restaurante_id'],), one=True)
    return jsonify({'id': p['id'], 'estado': p['estado'], 'total': p['total'],
                    'fecha': p['fecha'][:16], 'tiempo_estimado': p['tiempo_estimado'],
                    'restaurante': r['nombre'] if r else '?', 'metodo_pago': p['metodo_pago'],
                    'items': [{'nombre': d['prod_nombre'], 'cantidad': d['cantidad'], 'precio': d['precio']} for d in detalles]})

@app.route('/api/pedidos/<int:pid>/estado', methods=['PUT'])
def actualizar_estado(pid):
    d = request.get_json()
    execute('UPDATE pedido SET estado=? WHERE id=?', (d.get('estado'), pid))
    return jsonify({'ok': True})

@app.route('/api/mis-pedidos')
def mis_pedidos():
    uid = session.get('usuario_id')
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    rows = query('SELECT p.*,r.nombre as rest_nombre FROM pedido p JOIN restaurante r ON p.restaurante_id=r.id WHERE p.usuario_id=? ORDER BY p.fecha DESC', (uid,))
    return jsonify([{'id': p['id'], 'estado': p['estado'], 'total': p['total'],
                     'fecha': p['fecha'][:16], 'restaurante': p['rest_nombre'], 'metodo_pago': p['metodo_pago']} for p in rows])

@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    d = request.get_json()
    msg = d.get('mensaje','').lower().strip()
    ctx = d.get('contexto',{})
    rid = ctx.get('restaurante_id')
    return jsonify(procesar_chatbot(msg, rid))

def procesar_chatbot(msg, rid):
    if any(s in msg for s in ['hola','buenas','buenos','hey','hi','ola']):
        return {'texto':'Hola! Soy **FoodBot**, tu asistente de comida.\nQue se te antoja hoy?','tipo':'bienvenida','acciones':['Ver restaurantes','Mis pedidos','Ayuda']}
    if any(w in msg for w in ['restaurante','donde','comer','lugar','ver restaurantes']):
        rests = query("SELECT id,nombre,categoria FROM restaurante WHERE estado='activo'")
        return {'texto':f'Tenemos **{len(rests)} restaurantes** disponibles:','tipo':'restaurantes','datos':rests}
    if any(w in msg for w in ['menu','carta','productos','que tienen','ver menu','ver men']):
        if rid:
            prods = query('SELECT id,nombre,precio,descripcion,categoria FROM producto WHERE restaurante_id=? AND disponible=1',(rid,))
            return {'texto':f'Aqui esta el menu — **{len(prods)} productos** disponibles:','tipo':'menu','datos':prods}
        return {'texto':'Primero selecciona un restaurante para ver su menu.','tipo':'info','acciones':['Ver restaurantes']}
    if any(w in msg for w in ['pedido','historial','mis pedidos']):
        return {'texto':'Puedo mostrarte tus pedidos anteriores. Quieres verlos?','tipo':'historial','acciones':['Ver mis pedidos','Hacer nuevo pedido']}
    if any(w in msg for w in ['carrito','agregar','quiero','pedir','ordenar']):
        if rid:
            return {'texto':'Haz clic en **"+ Agregar"** junto al producto que deseas.','tipo':'info','acciones':['Ver menu']}
        return {'texto':'Para pedir, primero elige un restaurante.','tipo':'info','acciones':['Ver restaurantes']}
    if any(w in msg for w in ['pago','pagar','efectivo','tarjeta','nequi','daviplata']):
        return {'texto':'Metodos de pago disponibles:\n\n**Efectivo** — Al recibir\n**Tarjeta** — Credito o debito\n**Nequi**\n**Daviplata**','tipo':'pagos','acciones':['Efectivo','Tarjeta','Nequi','Daviplata']}
    if any(w in msg for w in ['seguimiento','estado pedido','donde esta']):
        return {'texto':'Para ver el estado de tu pedido, ve a **"Mis pedidos"** y haz clic en el pedido.','tipo':'seguimiento','acciones':['Ver mis pedidos']}
    if any(w in msg for w in ['ayuda','help','opciones','que puedes']):
        return {'texto':'**FoodBot** puede ayudarte con:\n\nVer restaurantes\nExplorar menus\nHacer pedidos\nMetodos de pago\nHistorial de pedidos\nSeguimiento en tiempo real','tipo':'ayuda','acciones':['Ver restaurantes','Mis pedidos','Metodos de pago']}
    if any(w in msg for w in ['gracias','ok','bien','perfecto','listo']):
        return {'texto':'Con mucho gusto! En que mas puedo ayudarte?','tipo':'info','acciones':['Ver restaurantes','Mis pedidos']}
    return {'texto':'No entendi bien. Escribe **"ayuda"** para ver lo que puedo hacer.','tipo':'error','acciones':['Ver restaurantes','Ayuda','Mis pedidos']}

@app.route('/api/admin/usuarios')
def admin_usuarios():
    uid = session.get('usuario_id')
    u = query('SELECT rol FROM usuario WHERE id=?',(uid,),one=True) if uid else None
    if not u or u['rol'] != 'admin':
        return jsonify({'error': 'Sin acceso'}), 403
    return jsonify(query('SELECT id,nombre,email,rol,telefono FROM usuario'))

@app.route('/api/admin/pedidos')
def admin_pedidos():
    uid = session.get('usuario_id')
    u = query('SELECT rol FROM usuario WHERE id=?',(uid,),one=True) if uid else None
    if not u or u['rol'] != 'admin':
        return jsonify({'error': 'Sin acceso'}), 403
    rows = query('SELECT p.*,u.nombre as uname,r.nombre as rname FROM pedido p JOIN usuario u ON p.usuario_id=u.id JOIN restaurante r ON p.restaurante_id=r.id ORDER BY p.fecha DESC LIMIT 50')
    return jsonify([{'id':p['id'],'usuario':p['uname'],'restaurante':p['rname'],'total':p['total'],'estado':p['estado'],'fecha':p['fecha'][:16]} for p in rows])

@app.route('/api/productos', methods=['POST'])
def crear_producto():
    uid = session.get('usuario_id')
    if not uid:
        return jsonify({'error': 'No autenticado'}), 401
    rest = query('SELECT id FROM restaurante WHERE usuario_id=?',(uid,),one=True)
    if not rest:
        return jsonify({'error': 'No tienes restaurante registrado'}), 400
    d = request.get_json()
    pid = execute('INSERT INTO producto (nombre,descripcion,precio,categoria,restaurante_id) VALUES (?,?,?,?,?)',
                  (d['nombre'], d.get('descripcion',''), float(d['precio']), d['categoria'], rest['id']))
    return jsonify({'ok': True, 'id': pid})

@app.route('/api/productos/<int:pid>', methods=['PUT'])
def editar_producto(pid):
    d = request.get_json()
    fields, vals = [], []
    for k in ['nombre','descripcion','categoria']:
        if k in d: fields.append(f'{k}=?'); vals.append(d[k])
    if 'precio' in d: fields.append('precio=?'); vals.append(float(d['precio']))
    if 'disponible' in d: fields.append('disponible=?'); vals.append(1 if d['disponible'] else 0)
    if fields:
        vals.append(pid)
        execute(f'UPDATE producto SET {",".join(fields)} WHERE id=?', vals)
    return jsonify({'ok': True})

@app.route('/api/productos/<int:pid>', methods=['DELETE'])
def eliminar_producto(pid):
    execute('UPDATE producto SET disponible=0 WHERE id=?', (pid,))
    return jsonify({'ok': True})

if __name__ == '__main__':
    init_db()
    seed_data()
    app.run(debug=True, port=5000)
