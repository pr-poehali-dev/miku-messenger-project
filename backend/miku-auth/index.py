import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
import psycopg2

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(password: str) -> str:
    salt = "miku_secret_salt_2024"
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

def create_token() -> str:
    return secrets.token_hex(32)

def get_user_by_token(conn, token: str):
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id, u.email, u.username, u.display_name, u.avatar_url,
               u.background_url, u.background_color, u.bio, u.is_verified, u.is_online
        FROM miku_sessions s
        JOIN miku_users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {
        'id': row[0], 'email': row[1], 'username': row[2],
        'display_name': row[3], 'avatar_url': row[4],
        'background_url': row[5], 'background_color': row[6],
        'bio': row[7], 'is_verified': row[8], 'is_online': row[9]
    }

def handler(event: dict, context) -> dict:
    """Аутентификация пользователей Miku: регистрация, вход, выход, профиль"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
    }

    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    token = event.get('headers', {}).get('X-Auth-Token') or event.get('headers', {}).get('x-auth-token')

    conn = get_conn()

    # POST /register
    if method == 'POST' and '/register' in path:
        body = json.loads(event.get('body') or '{}')
        email = body.get('email', '').strip().lower()
        username = body.get('username', '').strip()
        password = body.get('password', '')

        if not email or not username or not password:
            conn.close()
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Заполните все поля'})}

        if len(username) < 3:
            conn.close()
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Юзернейм минимум 3 символа'})}

        if len(password) < 6:
            conn.close()
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}

        cur = conn.cursor()
        cur.execute("SELECT id FROM miku_users WHERE email = %s OR username = %s", (email, username))
        if cur.fetchone():
            cur.close()
            conn.close()
            return {'statusCode': 409, 'headers': cors, 'body': json.dumps({'error': 'Email или юзернейм уже занят'})}

        pw_hash = hash_password(password)
        cur.execute("""
            INSERT INTO miku_users (email, username, password_hash, display_name)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (email, username, pw_hash, username))
        user_id = cur.fetchone()[0]

        cur.execute("""
            INSERT INTO miku_user_settings (user_id) VALUES (%s)
        """, (user_id,))

        tok = create_token()
        expires = datetime.now() + timedelta(days=30)
        cur.execute("""
            INSERT INTO miku_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)
        """, (user_id, tok, expires))
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200, 'headers': cors,
            'body': json.dumps({'token': tok, 'user': {'id': user_id, 'email': email, 'username': username, 'display_name': username, 'is_verified': False}})
        }

    # POST /login
    if method == 'POST' and '/login' in path:
        body = json.loads(event.get('body') or '{}')
        login = body.get('email', '').strip().lower()
        password = body.get('password', '')
        pw_hash = hash_password(password)

        cur = conn.cursor()
        cur.execute("""
            SELECT id, email, username, display_name, avatar_url, background_url, background_color, bio, is_verified
            FROM miku_users WHERE (email = %s OR username = %s) AND password_hash = %s
        """, (login, login, pw_hash))
        row = cur.fetchone()

        if not row:
            cur.close()
            conn.close()
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Неверный логин или пароль'})}

        tok = create_token()
        expires = datetime.now() + timedelta(days=30)
        cur.execute("INSERT INTO miku_sessions (user_id, token, expires_at) VALUES (%s, %s, %s)", (row[0], tok, expires))
        cur.execute("UPDATE miku_users SET is_online = TRUE, last_seen = NOW() WHERE id = %s", (row[0],))
        conn.commit()
        cur.close()
        conn.close()

        return {
            'statusCode': 200, 'headers': cors,
            'body': json.dumps({'token': tok, 'user': {
                'id': row[0], 'email': row[1], 'username': row[2],
                'display_name': row[3], 'avatar_url': row[4],
                'background_url': row[5], 'background_color': row[6],
                'bio': row[7], 'is_verified': row[8]
            }})
        }

    # POST /logout
    if method == 'POST' and '/logout' in path:
        if token:
            cur = conn.cursor()
            cur.execute("UPDATE miku_sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
            cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    # GET /me
    if method == 'GET' and '/me' in path:
        user = get_user_by_token(conn, token)
        conn.close()
        if not user:
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'user': user})}

    # PUT /profile
    if method == 'PUT' and '/profile' in path:
        user = get_user_by_token(conn, token)
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body') or '{}')
        cur = conn.cursor()
        cur.execute("""
            UPDATE miku_users SET display_name = %s, bio = %s, avatar_url = %s,
            background_url = %s, background_color = %s, updated_at = NOW()
            WHERE id = %s
        """, (
            body.get('display_name', user['display_name']),
            body.get('bio', user['bio']),
            body.get('avatar_url', user['avatar_url']),
            body.get('background_url', user['background_url']),
            body.get('background_color', user['background_color']),
            user['id']
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    # GET /user/:username
    if method == 'GET' and '/user/' in path:
        username = path.split('/user/')[-1].strip('/')
        cur = conn.cursor()
        cur.execute("""
            SELECT id, username, display_name, avatar_url, background_url, background_color, bio, is_verified, is_online
            FROM miku_users WHERE username = %s
        """, (username,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if not row:
            return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Пользователь не найден'})}
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'user': {
            'id': row[0], 'username': row[1], 'display_name': row[2],
            'avatar_url': row[3], 'background_url': row[4], 'background_color': row[5],
            'bio': row[6], 'is_verified': row[7], 'is_online': row[8]
        }})}

    # GET /search?q=...
    if method == 'GET' and '/search' in path:
        q = (event.get('queryStringParameters') or {}).get('q', '')
        if len(q) < 2:
            conn.close()
            return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'users': []})}
        cur = conn.cursor()
        cur.execute("""
            SELECT id, username, display_name, avatar_url, is_verified, is_online
            FROM miku_users WHERE username ILIKE %s OR display_name ILIKE %s LIMIT 20
        """, (f'%{q}%', f'%{q}%'))
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'users': [
            {'id': r[0], 'username': r[1], 'display_name': r[2], 'avatar_url': r[3], 'is_verified': r[4], 'is_online': r[5]}
            for r in rows
        ]})}

    conn.close()
    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
