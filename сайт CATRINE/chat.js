/**
 * CATRINE AI Assistant — Интеграция OpenAI через локальный сервер
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'catrine_ai_dialogue';
  var WELCOME_TEXT = 'Здравствуйте! Я ваш онлайн-консультант CATRINE. Подскажу по материалам, расчёту стоимости мебели, срокам изготовления или помогу записаться на бесплатный замер в Астане. О чём хотите узнать?';

  var QUICK_CHIPS = [
    'Рассчитать стоимость кухни',
    'Как вызвать замерщика?',
    'Какую фурнитуру используете?',
    'Какие сроки изготовления?'
  ];

  // История сообщений: [{ role: 'assistant'|'user', content: string }]
  var messages = [];

  function loadHistory() {
    try {
      var saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        messages = JSON.parse(saved);
      }
    } catch (e) {
      messages = [];
    }
    if (!messages || messages.length === 0) {
      messages = [{ role: 'assistant', content: WELCOME_TEXT }];
    }
  }

  function saveHistory() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {}
  }

  function initChat() {
    loadHistory();

    // 1. Создание кнопки вызова
    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'catrine-chat-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Открыть чат с ИИ-консультантом CATRINE');
    toggleBtn.innerHTML = 
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>' +
        '<circle cx="9" cy="10" r="1" fill="currentColor"></circle>' +
        '<circle cx="12" cy="10" r="1" fill="currentColor"></circle>' +
        '<circle cx="15" cy="10" r="1" fill="currentColor"></circle>' +
      '</svg>' +
      '<span class="chat-toggle-badge" aria-hidden="true"></span>' +
      '<span class="chat-toggle-tooltip">Чат с ИИ-консультантом</span>';

    // 2. Создание окна чата
    var chatWindow = document.createElement('div');
    chatWindow.id = 'catrine-chat-window';
    chatWindow.setAttribute('role', 'dialog');
    chatWindow.setAttribute('aria-modal', 'true');
    chatWindow.setAttribute('aria-label', 'Чат с онлайн-консультантом CATRINE');

    chatWindow.innerHTML =
      '<div class="chat-header">' +
        '<div class="chat-header-info">' +
          '<div class="chat-avatar">C</div>' +
          '<div class="chat-title-wrap">' +
            '<div class="chat-title">CATRINE AI</div>' +
            '<div class="chat-status"><span class="chat-status-dot"></span>Консультант онлайн</div>' +
          '</div>' +
        '</div>' +
        '<div class="chat-header-actions">' +
          '<button class="chat-btn-icon" id="chat-btn-clear" type="button" title="Очистить историю диалога" aria-label="Очистить диалог">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>' +
          '</button>' +
          '<button class="chat-btn-icon" id="chat-btn-close" type="button" title="Закрыть чат" aria-label="Закрыть чат">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-messages" id="chat-messages-box"></div>' +
      '<div class="chat-input-area">' +
        '<form class="chat-form" id="catrine-chat-form">' +
          '<input type="text" class="chat-input" id="catrine-chat-input" placeholder="Задайте вопрос о мебели или замере..." autocomplete="off" />' +
          '<button type="submit" class="chat-send-btn" id="catrine-chat-send" aria-label="Отправить сообщение">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>' +
          '</button>' +
        '</form>' +
      '</div>';

    document.body.appendChild(toggleBtn);
    document.body.appendChild(chatWindow);

    var messagesBox = document.getElementById('chat-messages-box');
    var inputEl = document.getElementById('catrine-chat-input');
    var sendBtn = document.getElementById('catrine-chat-send');
    var formEl = document.getElementById('catrine-chat-form');
    var closeBtn = document.getElementById('chat-btn-close');
    var clearBtn = document.getElementById('chat-btn-clear');

    var isOpen = false;
    var isSending = false;

    function toggleChat(open) {
      if (typeof open === 'boolean') {
        isOpen = open;
      } else {
        isOpen = !isOpen;
      }
      if (isOpen) {
        chatWindow.classList.add('chat-open');
        toggleBtn.setAttribute('aria-expanded', 'true');
        renderMessages();
        setTimeout(function() { inputEl.focus(); }, 150);
      } else {
        chatWindow.classList.remove('chat-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    }

    toggleBtn.addEventListener('click', function() { toggleChat(); });
    closeBtn.addEventListener('click', function() { toggleChat(false); });

    clearBtn.addEventListener('click', function() {
      messages = [{ role: 'assistant', content: WELCOME_TEXT }];
      saveHistory();
      renderMessages();
    });

    document.addEventListener('keydown', function(e) {
      if (isOpen && e.key === 'Escape') {
        toggleChat(false);
      }
    });

    function escapeHtml(text) {
      var d = document.createElement('div');
      d.textContent = text;
      return d.innerHTML;
    }

    function formatText(text) {
      var safe = escapeHtml(text);
      return safe.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    }

    function renderMessages() {
      messagesBox.innerHTML = '';

      messages.forEach(function(msg) {
        var bubble = document.createElement('div');
        bubble.className = 'chat-bubble ' + (msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant');
        bubble.innerHTML = '<p>' + formatText(msg.content) + '</p>';
        messagesBox.appendChild(bubble);
      });

      // Если в истории только первое приветственное сообщение, показываем кнопки-подсказки
      if (messages.length === 1 && messages[0].role === 'assistant') {
        var chipsWrap = document.createElement('div');
        chipsWrap.className = 'chat-suggestions';
        QUICK_CHIPS.forEach(function(chipText) {
          var chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'chat-chip';
          chip.textContent = chipText;
          chip.addEventListener('click', function() {
            sendMessage(chipText);
          });
          chipsWrap.appendChild(chip);
        });
        messagesBox.appendChild(chipsWrap);
      }

      scrollToBottom();
    }

    function scrollToBottom() {
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function showTypingIndicator() {
      var typing = document.createElement('div');
      typing.id = 'chat-typing-indicator';
      typing.className = 'chat-typing';
      typing.innerHTML = '<span></span><span></span><span></span>';
      messagesBox.appendChild(typing);
      scrollToBottom();
    }

    function removeTypingIndicator() {
      var el = document.getElementById('chat-typing-indicator');
      if (el) el.remove();
    }

    function showError(errText) {
      var errBubble = document.createElement('div');
      errBubble.className = 'chat-bubble chat-bubble-error';
      errBubble.innerHTML = '<p><strong>Внимание:</strong> ' + escapeHtml(errText) + '</p>';
      messagesBox.appendChild(errBubble);
      scrollToBottom();
    }

    async function sendMessage(text) {
      var trimmed = (text || inputEl.value || '').trim();
      if (!trimmed || isSending) return;

      inputEl.value = '';
      isSending = true;
      sendBtn.disabled = true;
      inputEl.disabled = true;

      // Добавляем сообщение пользователя
      messages.push({ role: 'user', content: trimmed });
      saveHistory();
      renderMessages();

      showTypingIndicator();

      try {
        var response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages: messages })
        });

        var data = await response.json();
        removeTypingIndicator();

        if (!response.ok || data.error) {
          showError(data.error || 'Произошла ошибка при обращении к ИИ.');
        } else if (data.reply) {
          messages.push({ role: 'assistant', content: data.reply });
          saveHistory();
          renderMessages();
        }
      } catch (err) {
        removeTypingIndicator();
        showError('Не удалось связаться с сервером. Проверьте подключение.');
      } finally {
        isSending = false;
        sendBtn.disabled = false;
        inputEl.disabled = false;
        inputEl.focus();
      }
    }

    formEl.addEventListener('submit', function(e) {
      e.preventDefault();
      sendMessage();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }
})();
