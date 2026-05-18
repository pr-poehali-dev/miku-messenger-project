import json
import os
import psycopg2

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_by_token(conn, token: str):
    if not token:
        return None
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id, u.username, u.display_name, u.avatar_url, u.is_verified
        FROM miku_sessions s JOIN miku_users u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()
    """, (token,))
    row = cur.fetchone()
    cur.close()
    if not row:
        return None
    return {'id': row[0], 'username': row[1], 'display_name': row[2], 'avatar_url': row[3], 'is_verified': row[4]}

def handler(event: dict, context) -> dict:
    """Сообщения Miku: отправка, получение, реакции, удаление для групп, каналов и DM"""
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
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    user = get_user_by_token(conn, token)

    # GET /messages?group_id=X или ?channel_id=X или ?dm_id=X
    if method == 'GET' and path.endswith('/messages') or path.endswith('/messages/'):
        group_id = params.get('group_id')
        channel_id = params.get('channel_id')
        dm_id = params.get('dm_id')
        before_id = params.get('before_id')
        limit = min(int(params.get('limit', 50)), 100)

        cur = conn.cursor()
        base_where = []
        vals = []

        if group_id:
            base_where.append("m.group_id = %s")
            vals.append(int(group_id))
        elif channel_id:
            base_where.append("m.channel_id = %s")
            vals.append(int(channel_id))
        elif dm_id:
            base_where.append("m.dm_conversation_id = %s")
            vals.append(int(dm_id))
        else:
            conn.close()
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Нужен group_id, channel_id или dm_id'})}

        base_where.append("m.is_removed = FALSE")
        if before_id:
            base_where.append("m.id < %s")
            vals.append(int(before_id))

        where_str = " AND ".join(base_where)
        vals.append(limit)

        cur.execute(f"""
            SELECT m.id, m.sender_id, m.content, m.media_url, m.media_type,
                   m.created_at, u.username, u.display_name, u.avatar_url, u.is_verified
            FROM miku_messages m
            LEFT JOIN miku_users u ON u.id = m.sender_id
            WHERE {where_str}
            ORDER BY m.created_at DESC LIMIT %s
        """, vals)
        rows = cur.fetchall()

        msg_ids = [r[0] for r in rows]
        reactions = {}
        if msg_ids:
            placeholders = ','.join(['%s'] * len(msg_ids))
            cur.execute(f"""
                SELECT r.message_id, r.emoji, COUNT(*) as cnt, 
                       CASE WHEN {user['id'] if user else 0} = ANY(ARRAY_AGG(r.user_id)) THEN TRUE ELSE FALSE END as reacted
                FROM miku_reactions r WHERE r.message_id IN ({placeholders})
                GROUP BY r.message_id, r.emoji
            """, msg_ids)
            for rrow in cur.fetchall():
                mid = rrow[0]
                if mid not in reactions:
                    reactions[mid] = []
                reactions[mid].append({'emoji': rrow[1], 'count': rrow[2], 'reacted': rrow[3]})

        cur.close()
        conn.close()

        messages = []
        for r in reversed(rows):
            messages.append({
                'id': r[0], 'sender_id': r[1], 'content': r[2],
                'media_url': r[3], 'media_type': r[4],
                'created_at': r[5].isoformat() if r[5] else None,
                'sender': {'username': r[6], 'display_name': r[7], 'avatar_url': r[8], 'is_verified': r[9]},
                'reactions': reactions.get(r[0], [])
            })

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'messages': messages})}

    # POST /messages — отправить сообщение
    if method == 'POST' and '/messages' in path:
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}

        body = json.loads(event.get('body') or '{}')
        content = body.get('content', '').strip()
        media_url = body.get('media_url')
        media_type = body.get('media_type')
        group_id = body.get('group_id')
        channel_id = body.get('channel_id')
        dm_id = body.get('dm_conversation_id')

        if not content and not media_url:
            conn.close()
            return {'statusCode': 400, 'headers': cors, 'body': json.dumps({'error': 'Пустое сообщение'})}

        cur = conn.cursor()
        cur.execute("""
            INSERT INTO miku_messages (sender_id, group_id, channel_id, dm_conversation_id, content, media_url, media_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id, created_at
        """, (user['id'], group_id, channel_id, dm_id, content, media_url, media_type))
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({
            'message': {
                'id': row[0], 'sender_id': user['id'], 'content': content,
                'media_url': media_url, 'media_type': media_type,
                'created_at': row[1].isoformat(),
                'sender': {'username': user['username'], 'display_name': user['display_name'], 'avatar_url': user['avatar_url'], 'is_verified': user['is_verified']},
                'reactions': []
            }
        })}

    # POST /react — поставить реакцию
    if method == 'POST' and '/react' in path:
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}

        body = json.loads(event.get('body') or '{}')
        message_id = body.get('message_id')
        emoji = body.get('emoji', '❤️')

        cur = conn.cursor()
        cur.execute("SELECT id FROM miku_reactions WHERE message_id = %s AND user_id = %s AND emoji = %s",
                    (message_id, user['id'], emoji))
        existing = cur.fetchone()

        if existing:
            cur.execute("UPDATE miku_reactions SET created_at = NOW() WHERE id = %s", (existing[0],))
        else:
            cur.execute("INSERT INTO miku_reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)",
                        (message_id, user['id'], emoji))

        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    # POST /remove-message — удалить сообщение (мягко)
    if method == 'POST' and '/remove-message' in path:
        if not user:
            conn.close()
            return {'statusCode': 401, 'headers': cors, 'body': json.dumps({'error': 'Не авторизован'})}
        body = json.loads(event.get('body') or '{}')
        msg_id = body.get('message_id')
        cur = conn.cursor()
        cur.execute("UPDATE miku_messages SET is_removed = TRUE WHERE id = %s AND sender_id = %s", (msg_id, user['id']))
        conn.commit()
        cur.close()
        conn.close()
        return {'statusCode': 200, 'headers': cors, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 404, 'headers': cors, 'body': json.dumps({'error': 'Not found'})}
