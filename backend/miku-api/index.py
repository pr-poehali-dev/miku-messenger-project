import json
import os
import base64
import uuid
import secrets
import psycopg2
import boto3

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_by_token(conn, token: str):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.background_url, u.background_color, u.bio
        FROM miku_sessions s JOIN miku_users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {'id': row[0], 'username': row[1], 'display_name': row[2], 'avatar_url': row[3],
            'is_verified': row[4], 'background_url': row[5], 'background_color': row[6], 'bio': row[7]}

GIFTS_DATA = [
    {'id': 1, 'name': 'Мику — Классика', 'description': 'Классическая Мику Хацунэ', 'character_name': 'Hatsune Miku', 'price_rub': 99, 'rarity': 'common', 'emoji': '🎀'},
    {'id': 2, 'name': 'Мику — Концерт', 'description': 'Мику в концертном наряде', 'character_name': 'Hatsune Miku', 'price_rub': 299, 'rarity': 'rare', 'emoji': '🎵'},
    {'id': 3, 'name': 'Мику — Легенда', 'description': 'Легендарная Мику из Project Sekai', 'character_name': 'Hatsune Miku', 'price_rub': 799, 'rarity': 'legendary', 'emoji': '👑'},
    {'id': 4, 'name': 'Кохане Адзусава', 'description': 'Из Vivid BAD SQUAD', 'character_name': 'Kohane Azusawa', 'price_rub': 149, 'rarity': 'common', 'emoji': '🌸'},
    {'id': 5, 'name': 'Ичика Хошино', 'description': 'Участница Leo/need', 'character_name': 'Ichika Hoshino', 'price_rub': 149, 'rarity': 'common', 'emoji': '🎸'},
    {'id': 6, 'name': 'Саки Тенма', 'description': 'MORE MORE JUMP!', 'character_name': 'Saki Tenma', 'price_rub': 149, 'rarity': 'common', 'emoji': '🌟'},
    {'id': 7, 'name': 'Нене Ёдзора', 'description': 'Wonderlands×Showtime', 'character_name': 'Nene Yozora', 'price_rub': 199, 'rarity': 'rare', 'emoji': '🎭'},
    {'id': 8, 'name': 'Эму Отори', 'description': 'WxS персонаж', 'character_name': 'Emu Otori', 'price_rub': 199, 'rarity': 'rare', 'emoji': '🎪'},
    {'id': 9, 'name': 'Мику — Новый год', 'description': 'Мику в кимоно', 'character_name': 'Hatsune Miku', 'price_rub': 499, 'rarity': 'epic', 'emoji': '🎍'},
    {'id': 10, 'name': 'Мику — День рождения 39', 'description': 'Специальный на 39-й день', 'character_name': 'Hatsune Miku', 'price_rub': 699, 'rarity': 'legendary', 'emoji': '🎂'},
]

def handler(event: dict, context) -> dict:
    """Основной API Miku: сообщения, группы, каналы, DM, подарки, загрузка файлов, реакции"""
    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
    }
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    token = (event.get('headers') or {}).get('X-Auth-Token') or (event.get('headers') or {}).get('x-auth-token')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    user = get_user_by_token(conn, token)

    def ok(data): return {'statusCode': 200, 'headers': cors, 'body': json.dumps(data, default=str)}
    def err(msg, code=400): return {'statusCode': code, 'headers': cors, 'body': json.dumps({'error': msg})}
    def need_auth(): return err('Не авторизован', 401)

    body = {}
    if method in ('POST', 'PUT'):
        try:
            body = json.loads(event.get('body') or '{}')
        except:
            body = {}

    # ===== MESSAGES =====
    if '/messages' in path and '/react' not in path and '/remove' not in path:
        if method == 'GET':
            group_id = params.get('group_id')
            channel_id = params.get('channel_id')
            dm_id = params.get('dm_id')
            before_id = params.get('before_id')
            limit = min(int(params.get('limit', 50)), 100)
            cur = conn.cursor()
            where = []
            vals = []
            if group_id:
                where.append("m.group_id = %s"); vals.append(int(group_id))
            elif channel_id:
                where.append("m.channel_id = %s"); vals.append(int(channel_id))
            elif dm_id:
                where.append("m.dm_conversation_id = %s"); vals.append(int(dm_id))
            else:
                conn.close(); return err('Нужен group_id, channel_id или dm_id')
            where.append("m.is_removed = FALSE")
            if before_id:
                where.append("m.id < %s"); vals.append(int(before_id))
            vals.append(limit)
            cur.execute(f"""
                SELECT m.id, m.sender_id, m.content, m.media_url, m.media_type, m.created_at,
                       u.username, u.display_name, u.avatar_url, u.is_verified
                FROM miku_messages m LEFT JOIN miku_users u ON u.id = m.sender_id
                WHERE {' AND '.join(where)} ORDER BY m.created_at DESC LIMIT %s
            """, vals)
            rows = cur.fetchall()
            msg_ids = [r[0] for r in rows]
            reactions = {}
            if msg_ids:
                ph = ','.join(['%s'] * len(msg_ids))
                uid = user['id'] if user else 0
                cur.execute(f"""
                    SELECT r.message_id, r.emoji, COUNT(*) as cnt,
                           bool_or(r.user_id = {uid}) as reacted
                    FROM miku_reactions r WHERE r.message_id IN ({ph})
                    GROUP BY r.message_id, r.emoji
                """, msg_ids)
                for rr in cur.fetchall():
                    reactions.setdefault(rr[0], []).append({'emoji': rr[1], 'count': rr[2], 'reacted': rr[3]})
            cur.close(); conn.close()
            msgs = [{'id': r[0], 'sender_id': r[1], 'content': r[2], 'media_url': r[3], 'media_type': r[4],
                     'created_at': r[5].isoformat() if r[5] else None,
                     'sender': {'username': r[6], 'display_name': r[7], 'avatar_url': r[8], 'is_verified': r[9]},
                     'reactions': reactions.get(r[0], [])} for r in reversed(rows)]
            return ok({'messages': msgs})

        if method == 'POST':
            if not user: conn.close(); return need_auth()
            content = body.get('content', '').strip()
            media_url = body.get('media_url')
            media_type = body.get('media_type')
            if not content and not media_url: conn.close(); return err('Пустое сообщение')
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO miku_messages (sender_id, group_id, channel_id, dm_conversation_id, content, media_url, media_type)
                VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at
            """, (user['id'], body.get('group_id'), body.get('channel_id'), body.get('dm_conversation_id'), content, media_url, media_type))
            row = cur.fetchone()
            conn.commit(); cur.close(); conn.close()
            return ok({'message': {'id': row[0], 'sender_id': user['id'], 'content': content,
                                   'media_url': media_url, 'media_type': media_type,
                                   'created_at': row[1].isoformat(),
                                   'sender': {'username': user['username'], 'display_name': user['display_name'],
                                              'avatar_url': user['avatar_url'], 'is_verified': user['is_verified']},
                                   'reactions': []}})

    # ===== REACT =====
    if '/react' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        cur = conn.cursor()
        cur.execute("SELECT id FROM miku_reactions WHERE message_id = %s AND user_id = %s AND emoji = %s",
                    (body.get('message_id'), user['id'], body.get('emoji', '❤️')))
        if cur.fetchone():
            cur.execute("UPDATE miku_reactions SET created_at = NOW() WHERE message_id = %s AND user_id = %s AND emoji = %s",
                        (body.get('message_id'), user['id'], body.get('emoji', '❤️')))
        else:
            cur.execute("INSERT INTO miku_reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)",
                        (body.get('message_id'), user['id'], body.get('emoji', '❤️')))
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # ===== REMOVE MESSAGE =====
    if '/remove-message' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        cur = conn.cursor()
        cur.execute("UPDATE miku_messages SET is_removed = TRUE WHERE id = %s AND sender_id = %s",
                    (body.get('message_id'), user['id']))
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # ===== GROUPS =====
    if '/groups' in path and '/members' not in path and '/join' not in path and '/public' not in path:
        if method == 'GET':
            if not user: conn.close(); return need_auth()
            cur = conn.cursor()
            cur.execute("""
                SELECT g.id, g.name, g.description, g.avatar_url, g.owner_id, g.invite_code,
                       COUNT(gm2.user_id) as mc
                FROM miku_groups g
                JOIN miku_group_members gm ON gm.group_id = g.id AND gm.user_id = %s
                LEFT JOIN miku_group_members gm2 ON gm2.group_id = g.id
                GROUP BY g.id ORDER BY g.created_at DESC
            """, (user['id'],))
            rows = cur.fetchall(); cur.close(); conn.close()
            return ok({'groups': [{'id': r[0], 'name': r[1], 'description': r[2], 'avatar_url': r[3],
                                   'owner_id': r[4], 'invite_code': r[5], 'member_count': r[6]} for r in rows]})
        if method == 'POST':
            if not user: conn.close(); return need_auth()
            name = body.get('name', '').strip()
            if not name: conn.close(); return err('Нужно название')
            invite = secrets.token_urlsafe(8)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO miku_groups (name, description, avatar_url, owner_id, invite_code, is_public)
                VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
            """, (name, body.get('description'), body.get('avatar_url'), user['id'], invite, body.get('is_public', True)))
            gid = cur.fetchone()[0]
            cur.execute("INSERT INTO miku_group_members (group_id, user_id, role) VALUES (%s, %s, 'owner')", (gid, user['id']))
            conn.commit(); cur.close(); conn.close()
            return ok({'group': {'id': gid, 'name': name, 'invite_code': invite, 'owner_id': user['id'], 'member_count': 1}})

    if '/groups/join' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        invite = body.get('invite_code', '').strip()
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM miku_groups WHERE invite_code = %s", (invite,))
        grp = cur.fetchone()
        if not grp: cur.close(); conn.close(); return err('Группа не найдена', 404)
        cur.execute("SELECT id FROM miku_group_members WHERE group_id = %s AND user_id = %s", (grp[0], user['id']))
        if not cur.fetchone():
            cur.execute("INSERT INTO miku_group_members (group_id, user_id) VALUES (%s, %s)", (grp[0], user['id']))
            conn.commit()
        cur.close(); conn.close()
        return ok({'group': {'id': grp[0], 'name': grp[1]}})

    if '/members' in path and method == 'GET':
        parts = path.split('/')
        gid = None
        for i, p in enumerate(parts):
            if p == 'groups' and i + 1 < len(parts):
                try: gid = int(parts[i + 1])
                except: pass
        if not gid: conn.close(); return err('Нужен ID группы')
        cur = conn.cursor()
        cur.execute("""
            SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified, u.is_online, gm.role
            FROM miku_group_members gm JOIN miku_users u ON u.id = gm.user_id
            WHERE gm.group_id = %s ORDER BY gm.joined_at
        """, (gid,))
        rows = cur.fetchall(); cur.close(); conn.close()
        return ok({'members': [{'id': r[0], 'username': r[1], 'display_name': r[2], 'avatar_url': r[3],
                                'is_verified': r[4], 'is_online': r[5], 'role': r[6]} for r in rows]})

    if '/public-groups' in path and method == 'GET':
        q = params.get('q', '')
        cur = conn.cursor()
        cur.execute("""
            SELECT g.id, g.name, g.description, g.avatar_url, COUNT(gm.user_id) as mc
            FROM miku_groups g LEFT JOIN miku_group_members gm ON gm.group_id = g.id
            WHERE g.is_public = TRUE AND (%s = '' OR g.name ILIKE %s)
            GROUP BY g.id ORDER BY mc DESC LIMIT 20
        """, (q, f'%{q}%'))
        rows = cur.fetchall(); cur.close(); conn.close()
        return ok({'groups': [{'id': r[0], 'name': r[1], 'description': r[2], 'avatar_url': r[3], 'member_count': r[4]} for r in rows]})

    # ===== CHANNELS =====
    if '/channels' in path and '/subscribe' not in path and '/explore' not in path:
        if method == 'GET':
            if not user: conn.close(); return need_auth()
            cur = conn.cursor()
            cur.execute("""
                SELECT c.id, c.name, c.description, c.avatar_url, c.owner_id, c.subscribers_count, c.invite_code
                FROM miku_channels c
                JOIN miku_channel_subscribers cs ON cs.channel_id = c.id AND cs.user_id = %s
                ORDER BY c.created_at DESC
            """, (user['id'],))
            rows = cur.fetchall(); cur.close(); conn.close()
            return ok({'channels': [{'id': r[0], 'name': r[1], 'description': r[2], 'avatar_url': r[3],
                                     'owner_id': r[4], 'subscribers_count': r[5], 'invite_code': r[6]} for r in rows]})
        if method == 'POST':
            if not user: conn.close(); return need_auth()
            name = body.get('name', '').strip()
            if not name: conn.close(); return err('Нужно название')
            invite = secrets.token_urlsafe(8)
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO miku_channels (name, description, owner_id, invite_code, is_public)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (name, body.get('description'), user['id'], invite, body.get('is_public', True)))
            cid = cur.fetchone()[0]
            cur.execute("INSERT INTO miku_channel_subscribers (channel_id, user_id) VALUES (%s, %s)", (cid, user['id']))
            cur.execute("UPDATE miku_channels SET subscribers_count = 1 WHERE id = %s", (cid,))
            conn.commit(); cur.close(); conn.close()
            return ok({'channel': {'id': cid, 'name': name, 'invite_code': invite, 'owner_id': user['id']}})

    if '/subscribe' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        cid = body.get('channel_id')
        action = body.get('action', 'subscribe')
        cur = conn.cursor()
        if action == 'subscribe':
            cur.execute("SELECT id FROM miku_channel_subscribers WHERE channel_id = %s AND user_id = %s", (cid, user['id']))
            if not cur.fetchone():
                cur.execute("INSERT INTO miku_channel_subscribers (channel_id, user_id) VALUES (%s, %s)", (cid, user['id']))
                cur.execute("UPDATE miku_channels SET subscribers_count = subscribers_count + 1 WHERE id = %s", (cid,))
        else:
            cur.execute("SELECT id FROM miku_channel_subscribers WHERE channel_id = %s AND user_id = %s", (cid, user['id']))
            if cur.fetchone():
                cur.execute("UPDATE miku_channel_subscribers SET joined_at = NOW() WHERE channel_id = %s AND user_id = %s", (cid, user['id']))
                cur.execute("UPDATE miku_channels SET subscribers_count = GREATEST(0, subscribers_count - 1) WHERE id = %s", (cid,))
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    if '/explore-channels' in path and method == 'GET':
        q = params.get('q', '')
        cur = conn.cursor()
        cur.execute("""
            SELECT id, name, description, avatar_url, subscribers_count
            FROM miku_channels WHERE is_public = TRUE AND (%s = '' OR name ILIKE %s)
            ORDER BY subscribers_count DESC LIMIT 20
        """, (q, f'%{q}%'))
        rows = cur.fetchall(); cur.close(); conn.close()
        return ok({'channels': [{'id': r[0], 'name': r[1], 'description': r[2], 'avatar_url': r[3], 'subscribers_count': r[4]} for r in rows]})

    # ===== DM =====
    if '/conversations' in path and method == 'GET':
        if not user: conn.close(); return need_auth()
        cur = conn.cursor()
        cur.execute("""
            SELECT dc.id,
                   CASE WHEN dc.user1_id = %s THEN u2.id ELSE u1.id END,
                   CASE WHEN dc.user1_id = %s THEN u2.username ELSE u1.username END,
                   CASE WHEN dc.user1_id = %s THEN u2.display_name ELSE u1.display_name END,
                   CASE WHEN dc.user1_id = %s THEN u2.avatar_url ELSE u1.avatar_url END,
                   CASE WHEN dc.user1_id = %s THEN u2.is_verified ELSE u1.is_verified END,
                   CASE WHEN dc.user1_id = %s THEN u2.is_online ELSE u1.is_online END,
                   dc.user1_blocked, dc.user2_blocked
            FROM miku_dm_conversations dc
            JOIN miku_users u1 ON u1.id = dc.user1_id
            JOIN miku_users u2 ON u2.id = dc.user2_id
            WHERE dc.user1_id = %s OR dc.user2_id = %s
            ORDER BY dc.created_at DESC
        """, (user['id'],) * 8)
        rows = cur.fetchall(); cur.close(); conn.close()
        return ok({'conversations': [{'id': r[0],
                                      'other_user': {'id': r[1], 'username': r[2], 'display_name': r[3],
                                                     'avatar_url': r[4], 'is_verified': r[5], 'is_online': r[6]},
                                      'is_blocked': r[7] or r[8]} for r in rows]})

    if '/open-dm' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        other_id = body.get('user_id')
        if not other_id or other_id == user['id']: conn.close(); return err('Неверный пользователь')
        u1, u2 = min(user['id'], other_id), max(user['id'], other_id)
        cur = conn.cursor()
        cur.execute("SELECT id FROM miku_dm_conversations WHERE user1_id = %s AND user2_id = %s", (u1, u2))
        ex = cur.fetchone()
        if ex:
            cid = ex[0]
        else:
            cur.execute("INSERT INTO miku_dm_conversations (user1_id, user2_id) VALUES (%s, %s) RETURNING id", (u1, u2))
            cid = cur.fetchone()[0]
            conn.commit()
        cur.close(); conn.close()
        return ok({'conversation_id': cid})

    if '/block-dm' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        cid = body.get('conversation_id')
        cur = conn.cursor()
        cur.execute("SELECT user1_id FROM miku_dm_conversations WHERE id = %s", (cid,))
        row = cur.fetchone()
        if row:
            if row[0] == user['id']:
                cur.execute("UPDATE miku_dm_conversations SET user1_blocked = TRUE WHERE id = %s", (cid,))
            else:
                cur.execute("UPDATE miku_dm_conversations SET user2_blocked = TRUE WHERE id = %s", (cid,))
            conn.commit()
        cur.close(); conn.close()
        return ok({'ok': True})

    if '/clear-dm' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        cid = body.get('conversation_id')
        cur = conn.cursor()
        cur.execute("UPDATE miku_messages SET is_removed = TRUE WHERE dm_conversation_id = %s AND sender_id = %s", (cid, user['id']))
        conn.commit(); cur.close(); conn.close()
        return ok({'ok': True})

    # ===== GIFTS =====
    if '/gifts' in path:
        if '/list' in path:
            conn.close(); return ok({'gifts': GIFTS_DATA})
        if '/received' in path and method == 'GET':
            uid = params.get('user_id') or (user['id'] if user else None)
            if not uid: conn.close(); return err('Нужен user_id')
            cur = conn.cursor()
            cur.execute("""
                SELECT sg.id, sg.gift_id, sg.message, sg.created_at, u.username, u.display_name, u.avatar_url
                FROM miku_sent_gifts sg LEFT JOIN miku_users u ON u.id = sg.sender_id
                WHERE sg.recipient_id = %s ORDER BY sg.created_at DESC LIMIT 50
            """, (int(uid),))
            rows = cur.fetchall(); cur.close(); conn.close()
            return ok({'received': [{'id': r[0], 'gift': next((g for g in GIFTS_DATA if g['id'] == r[1]), None),
                                     'message': r[2], 'created_at': r[3].isoformat() if r[3] else None,
                                     'sender': {'username': r[4], 'display_name': r[5], 'avatar_url': r[6]}} for r in rows]})
        if '/send' in path and method == 'POST':
            if not user: conn.close(); return need_auth()
            gift = next((g for g in GIFTS_DATA if g['id'] == body.get('gift_id')), None)
            if not gift: conn.close(); return err('Подарок не найден', 404)
            cur = conn.cursor()
            cur.execute("INSERT INTO miku_sent_gifts (gift_id, sender_id, recipient_id, message) VALUES (%s, %s, %s, %s) RETURNING id",
                        (gift['id'], user['id'], body.get('recipient_id'), body.get('message', '')))
            sid = cur.fetchone()[0]
            conn.commit(); cur.close(); conn.close()
            return ok({'ok': True, 'sent_id': sid, 'gift': gift})

    # ===== UPLOAD =====
    if '/upload' in path and method == 'POST':
        if not user: conn.close(); return need_auth()
        data_b64 = body.get('data', '')
        file_type = body.get('type', 'image/jpeg')
        category = body.get('category', 'media')
        if not data_b64: conn.close(); return err('Нет данных')
        if ',' in data_b64:
            data_b64 = data_b64.split(',')[1]
        file_data = base64.b64decode(data_b64)
        ext_map = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
                   'image/webp': 'webp', 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3'}
        ext = ext_map.get(file_type, 'bin')
        filename = f"miku/{category}/{user['id']}/{uuid.uuid4().hex}.{ext}"
        s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev',
                          aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                          aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
        s3.put_object(Bucket='files', Key=filename, Body=file_data, ContentType=file_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{filename}"
        conn.close()
        return ok({'url': cdn_url})

    # ===== SETTINGS =====
    if '/settings' in path:
        if method == 'GET':
            if not user: conn.close(); return need_auth()
            cur = conn.cursor()
            cur.execute("SELECT settings_json FROM miku_user_settings WHERE user_id = %s", (user['id'],))
            row = cur.fetchone(); cur.close(); conn.close()
            return ok({'settings': row[0] if row else {}})
        if method == 'POST':
            if not user: conn.close(); return need_auth()
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO miku_user_settings (user_id, settings_json) VALUES (%s, %s)
                ON CONFLICT (user_id) DO UPDATE SET settings_json = %s, updated_at = NOW()
            """, (user['id'], json.dumps(body), json.dumps(body)))
            conn.commit(); cur.close(); conn.close()
            return ok({'ok': True})

    conn.close()
    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
