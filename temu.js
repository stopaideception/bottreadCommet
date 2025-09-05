
const lang = 'ru'; // или 'en', 'ua' — в зависимости от языка текущей страницы

const firebaseConfig = {
  apiKey: "AIzaSyBm-9wyNiWZPZmeKP9gof96cAjd1Tin_lI",
  authDomain: "stop-neurodeception.firebaseapp.com",
  projectId: "stop-neurodeception",
  storageBucket: "stop-neurodeception.appspot.com",
  messagingSenderId: "146932602084",
  appId: "1:146932602084:web:70da4413d448498992c8f1",
  measurementId: "G-DMZSKVPKQJ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const API_BASE = 'https://vitualnebosinev.pythonanywhere.com';

let currentUserName = 'Аноним';

auth.onAuthStateChanged(user => {
  if (user) {
    currentUserName = user.displayName || 'Без имени';
    document.getElementById("user-photo").src = user.photoURL || 'default-avatar.png';
    document.getElementById("user-name").textContent = currentUserName;
    document.getElementById("auth-buttons").style.display = "none";
    document.getElementById("user-info").style.display = "flex";
    // Показать формы для авторизованных
    document.getElementById("new-thread-form").classList.remove("neuroLock");
    document.getElementById("auth-message").classList.add("neuroLock");
    document.querySelectorAll(".reply-form").forEach(form => form.classList.remove("neuroLock"));
    document.querySelectorAll("[id^='reply-auth-message']").forEach(msg => msg.classList.add("neuroLock"));
  } else {
    currentUserName = 'Аноним';
    document.getElementById("auth-buttons").style.display = "flex";
    document.getElementById("user-info").style.display = "none";
    // Скрыть формы для неавторизованных
    document.getElementById("new-thread-form").classList.add("neuroLock");
    document.getElementById("auth-message").classList.remove("neuroLock");
    document.querySelectorAll(".reply-form").forEach(form => form.classList.add("neuroLock"));
    document.querySelectorAll("[id^='reply-auth-message']").forEach(msg => msg.classList.remove("neuroLock"));
  }
});

function signInWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(console.error);
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = 'rgba(106, 101, 153, 0.8)';
  toast.style.color = '#fff';
  toast.style.padding = '10px 20px';
  toast.style.borderRadius = '5px';
  toast.style.zIndex = '9999';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}

// === GitHub ===
function signInWithFacebook() {
  const provider = new firebase.auth.GithubAuthProvider();
  provider.addScope('user:email');

  auth.signInWithPopup(provider)
    .then(result => {
      console.log("Sign in with GitHub:", result.user);
    })
    .catch(error => {
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData.email;
        showToast(`An account with the email ${email} already exists. Please sign in using Google.`);
      } else {
        console.error("GitHub sign-in error:", error);
      }
    });
}

function signOut() {
  auth.signOut();
}

document.getElementById('new-thread-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!auth.currentUser) {
    alert("Пожалуйста, войдите, чтобы создать тему.");
    return;
  }
  const title = document.getElementById('thread-title').value.trim();
  const message = document.getElementById('thread-content').value.trim();
  if (!title || !message) return;

  try {
    const res = await fetch(`${API_BASE}/add-thread?lang=${lang}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, author: currentUserName })
    });
    const data = await res.json();
    console.log("Тема добавлена с ID:", data.id);
    document.getElementById('new-thread-form').reset();
    loadThreads();
  } catch (error) {
    console.error("Ошибка при добавлении темы:", error);
  }
});

async function loadThreads() {
  const container = document.getElementById('threads');
  const topicsList = document.getElementById('topics-list');
  container.innerHTML = '';
  topicsList.innerHTML = ''; // очищаем список тем наверху

  const loadingMessage = document.getElementById('loading-message');
  loadingMessage.style.display = 'block'; // показать "Загрузка тем..."


  try {
    const res = await fetch(`${API_BASE}/get-threads?lang=${lang}`);
    const threads = await res.json();

    threads.forEach(thread => {
      // Добавляем ссылку в список тем вверху
      const link = document.createElement('a');
      link.href = `#thread-${thread.id}`;
      link.textContent = thread.title;
      link.style.display = 'block';
      topicsList.appendChild(link);

      // Добавляем тему ниже с id
      const div = document.createElement('div');
      div.className = 'thread';
      div.id = `thread-${thread.id}`;
      const time = thread.createdAt
        ? new Date(thread.createdAt).toLocaleString('ru-RU')
        : 'Время неизвестно';

      div.innerHTML = `
        <h3>${thread.title}</h3>
        <p>${thread.message}</p>
        <small>Author: ${thread.author}</small><br>
        <small>Time: ${time}</small>
        <div id="replies-${thread.id}"></div>
        <form id="reply-form-${thread.id}" class="reply-form ${auth.currentUser ? '' : 'neuroLock'}" onsubmit="addReply(event, '${thread.id}')">
          <textarea placeholder="Your reply" required></textarea>
          <button type="submit">Ответить</button>
        </form>
        <p id="reply-auth-message-${thread.id}" class="${auth.currentUser ? 'neuroLock' : ''}">Please log in to reply.</p>
      `;

      container.appendChild(div);
      loadReplies(thread.id);
    });
  } catch (error) {
    console.error("Ошибка при загрузке тем:", error);
  } finally {
    loadingMessage.style.display = 'none';
  }
}

async function addReply(e, threadId) {
  e.preventDefault();
  if (!auth.currentUser) {
    alert("Пожалуйста, войдите, чтобы оставить ответ.");
    return;
  }
  const content = e.target.querySelector('textarea').value.trim();
  if (!content) return;

  try {
    await fetch(`${API_BASE}/add-comment/${threadId}?lang=${lang}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content, author: currentUserName })
    });
    e.target.reset();
    loadReplies(threadId);
  } catch (error) {
    console.error("Ошибка при добавлении ответа:", error);
  }
}

async function loadReplies(threadId) {
  const container = document.getElementById(`replies-${threadId}`);
  container.innerHTML = '';
  try {
    const res = await fetch(`${API_BASE}/get-comments/${threadId}?lang=${lang}`);
    const replies = await res.json();

    replies.forEach(reply => {
      const div = document.createElement('div');

      const time = reply.createdAt
        ? new Date(reply.createdAt).toLocaleString('ru-RU')
        : 'Время неизвестно';

      div.className = 'reply';
      div.innerHTML = `
    <p>${reply.text}</p>
    <small>Автор: ${reply.author}</small><br>
    <small>Время: ${time}</small>
  `;
      container.appendChild(div);
    });

  } catch (error) {
    console.error("Ошибка при загрузке ответов:", error);
  }
}

loadThreads();
//кнопка вверх


document.addEventListener("DOMContentLoaded", function () {
  // Твой текущий код для scrollTopBtn
  const scrollBtn = document.getElementById("scrollTopBtn");

  function toggleScrollButton() {
    const scrolled = window.scrollY > 100;
    const canScroll = document.body.scrollHeight > window.innerHeight + 10;

    if (scrolled && canScroll) {
      scrollBtn.classList.add("show");
    } else {
      scrollBtn.classList.remove("show");
    }
  }

  window.addEventListener("scroll", toggleScrollButton);
  window.addEventListener("resize", toggleScrollButton);
  toggleScrollButton(); // проверка на старте

  scrollBtn.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Добавляем обработчики кнопок входа
  const googleBtn = document.getElementById("google-login");
  const facebookBtn = document.getElementById("facebook-login");

  if (googleBtn) googleBtn.addEventListener("click", signInWithGoogle);
  if (facebookBtn) facebookBtn.addEventListener("click", signInWithFacebook);
});
