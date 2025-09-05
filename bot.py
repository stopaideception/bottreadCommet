from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore

# Настройка Firebase
cred = credentials.Certificate("/home/VitualNebosinev/mysite/stop-neurodeception-firebase-adminsdk-fbsvc-8a0186e354.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

print("🔥 Flask-приложение загружено!")

app = Flask(__name__)
CORS(app, origins=["https://stop-neurodeception.web.app"], supports_credentials=True)

# Хелпер: получить язык из запроса (по умолчанию 'default')
def get_lang():
    return request.args.get('lang', 'default')

# ➕ Добавление темы
@app.route('/add-thread', methods=['POST', 'OPTIONS'])
def add_thread():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        lang = get_lang()
        data = request.get_json()
        title = data.get('title')
        message = data.get('message')
        author = data.get('author')

        doc_ref = db.collection(f'threads-{lang}').add({
            'title': title,
            'message': message,
            'author': author,
            'createdAt': firestore.SERVER_TIMESTAMP
        })

        return jsonify({"id": doc_ref[1].id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📥 Получение списка тем
@app.route('/get-threads', methods=['GET'])
def get_threads():
    try:
        lang = get_lang()
        threads_ref = db.collection(f'threads-{lang}').order_by('createdAt', direction=firestore.Query.DESCENDING)
        docs = threads_ref.stream()

        threads = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            # Конвертируем createdAt в ISO-строку (если есть)
            if 'createdAt' in data and data['createdAt']:
                data['createdAt'] = data['createdAt'].isoformat()
            threads.append(data)

        return jsonify(threads), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ➕ Добавление комментария к теме
@app.route('/add-comment/<thread_id>', methods=['POST', 'OPTIONS'])
def add_comment(thread_id):
    if request.method == 'OPTIONS':
        return '', 204
    try:
        lang = get_lang()
        data = request.get_json()
        text = data.get('text')
        author = data.get('author')

        doc_ref = db.collection(f'threads-{lang}').document(thread_id).collection('comments').add({
            'text': text,
            'author': author,
            'createdAt': firestore.SERVER_TIMESTAMP
        })

        return jsonify({"message": "Комментарий добавлен", "id": doc_ref[1].id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📥 Получение комментариев темы
@app.route('/get-comments/<thread_id>', methods=['GET'])
def get_comments(thread_id):
    try:
        lang = get_lang()
        comments_ref = db.collection(f'threads-{lang}').document(thread_id).collection('comments').order_by('createdAt', direction=firestore.Query.ASCENDING)
        docs = comments_ref.stream()

        comments = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            if 'createdAt' in data and data['createdAt']:
                data['createdAt'] = data['createdAt'].isoformat()
            comments.append(data)

        return jsonify(comments), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500





