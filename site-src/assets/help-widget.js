/* AUREUM website help centre: AUREUM Bot (the same help library the Back Office uses) + support tickets that reach the AUREUM team.
   - The Bot is NOT a live AI. It runs in the visitor's browser, answers from AUREUM's help library, and sends nothing anywhere.
   - Tickets go to the AUREUM team through the public database functions in supabase/support-website.sql. Until that file has been run,
     the form says so and offers an email (and WhatsApp when a number is set) with the message already written.
   - A visitor can follow replies under "My tickets" on the same device: the ticket's private link key is kept in this browser only. */
(function () {
  'use strict';
  var root = document.getElementById('aw');
  if (!root) return;
  var SCRIPT = (document.currentScript && document.currentScript.src) || '';
  var API = (root.getAttribute('data-api-url') || '').replace(/\/$/, ''), KEY = root.getAttribute('data-api-key') || '';
  var MAIL = root.getAttribute('data-email') || '', WA = root.getAttribute('data-wa') || '';

  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var $ = function (sel) { return root.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  function get(store, k, d) { try { var v = window[store].getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(store, k, v) { try { window[store].setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: the page still works */ } }
  var fmtDate = function (t) { try { return new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return String(t || ''); } };
  var clean = function (m) { return String(m || '').replace(/^RATE_LIMIT:\s*/, ''); };

  /* ---------- talking to the database (public functions only) ---------- */
  function rpc(fn, body) {
    return fetch(API + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
          if (r.ok) return j;
          var err = new Error((j && j.message) || 'Request failed'); err.status = r.status; err.code = j && j.code;
          err.unavailable = r.status === 404 || err.code === 'PGRST202' || /could not find the function|does not exist/i.test(err.message);
          throw err;
        });
      }, function () { var e = new Error('network'); e.network = true; throw e; });
  }

  /* ---------- AUREUM Bot (loaded the first time it is needed) ---------- */
  var bot = null, botP = null;
  function loadBot() {
    if (botP) return botP;
    botP = new Promise(function (res, rej) {
      if (window.AureumBotEngine && window.AUREUM_KB) { res(); return; }
      var s = document.createElement('script');
      s.src = SCRIPT ? SCRIPT.replace(/help-widget\.js/, 'help-bot.js') : '/site/assets/help-bot.js';
      s.onload = res; s.onerror = function () { rej(new Error('load')); };
      document.head.appendChild(s);
    }).then(function () { bot = window.AureumBotEngine.create(window.AUREUM_KB, {}); });
    botP.catch(function () { botP = null; });
    return botP;
  }

  var WELCOME = "Hi, I'm **AUREUM Bot**. Ask me how AUREUM works: the till, products, stock, staff, reports, pricing and more. I am not a live AI and I can't see your account. If I can't answer, I'll help you send a ticket to the AUREUM team.";
  var ASKS = ['How do I import products from Excel or CSV?', 'How much does AUREUM cost?', 'How do I add a product?', 'Does AUREUM work without internet?', 'How do I refund a customer?'];
  var chat = Object.assign({ messages: [], lastId: null, lastType: null, misses: 0, busy: false, topic: null }, get('sessionStorage', 'aureum_web_chat', {}));
  chat.busy = false; chat.topic = null;
  var saveChat = function () { set('sessionStorage', 'aureum_web_chat', { messages: chat.messages.slice(-40), lastId: chat.lastId, lastType: chat.lastType, misses: chat.misses }); };

  function chatHtml(text) {
    var lines = esc(text).split('\n'), out = '', list = null;
    var flush = function () { if (list) { out += '<' + list.t + '>' + list.items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</' + list.t + '>'; list = null; } };
    lines.forEach(function (raw) {
      var line = raw.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i>$1</i>').replace(/`([^`]+)`/g, '<code>$1</code>'), m;
      if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) { if (!list || list.t !== 'ol') { flush(); list = { t: 'ol', items: [] }; } list.items.push(m[2]); }
      else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) { if (!list || list.t !== 'ul') { flush(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); }
      else if (line.trim() === '') { flush(); }
      else { flush(); out += '<p>' + line + '</p>'; }
    });
    flush(); return out;
  }
  var plain = function (t) { return String(t || '').replace(/\*\*|`/g, '').replace(/\*/g, ''); };
  var chips = function (arr) { return arr.map(function (c) { return '<button type="button" class="aw-chip" data-ask="' + esc(c.id) + '">' + esc(c.title) + '</button>'; }).join(''); };
  var transcript = function () { return chat.messages.slice(-30).map(function (m) { return (m.role === 'user' ? 'Visitor: ' : 'AUREUM Bot: ') + plain(m.content); }).join('\n\n'); };

  /* ---------- page shell ---------- */
  root.innerHTML =
    '<div class="aw-card">' +
    '<div class="aw-tabs" role="tablist" aria-label="Help centre">' +
    '<button type="button" role="tab" class="aw-tab" id="awt-ask" data-pane="ask" aria-controls="awp-ask" aria-selected="true">Ask AUREUM Bot</button>' +
    '<button type="button" role="tab" class="aw-tab" id="awt-topics" data-pane="topics" aria-controls="awp-topics" aria-selected="false" tabindex="-1">Help topics</button>' +
    '<button type="button" role="tab" class="aw-tab" id="awt-ticket" data-pane="ticket" aria-controls="awp-ticket" aria-selected="false" tabindex="-1">Send a ticket</button>' +
    '<button type="button" role="tab" class="aw-tab" id="awt-mine" data-pane="mine" aria-controls="awp-mine" aria-selected="false" tabindex="-1">My tickets <span class="aw-dot" id="awDot" hidden></span><span class="sr-only" id="awDotTxt" hidden>(new reply)</span></button>' +
    '</div>' +
    '<div class="aw-pane" id="awp-ask" role="tabpanel" aria-labelledby="awt-ask">' +
    '<div class="aw-log" id="awLog" role="log" aria-live="polite" aria-label="Chat with AUREUM Bot"></div>' +
    '<div class="aw-sug" id="awSug"></div>' +
    '<form class="aw-ask" id="awAskForm"><label class="sr-only" for="awInput">Ask how to do something in AUREUM</label>' +
    '<textarea id="awInput" rows="2" maxlength="400" placeholder="Ask how to do something in AUREUM…"></textarea>' +
    '<button type="submit" class="aw-btn" id="awSend">Send</button></form>' +
    '<div class="aw-foot"><button type="button" class="aw-link aw-newchat" id="awNew">+ New chat</button><span aria-hidden="true">·</span><button type="button" class="aw-link" id="awToTicket">Not solved? Contact support</button></div>' +
    '<p class="aw-note">AUREUM Bot runs in your browser and is not a live AI: it answers from AUREUM’s help library and can’t see your account or data. Never type passwords, PINs or card numbers.</p>' +
    '</div>' +
    '<div class="aw-pane" id="awp-topics" role="tabpanel" aria-labelledby="awt-topics" hidden></div>' +
    '<div class="aw-pane" id="awp-ticket" role="tabpanel" aria-labelledby="awt-ticket" hidden></div>' +
    '<div class="aw-pane" id="awp-mine" role="tabpanel" aria-labelledby="awt-mine" hidden></div>' +
    '</div>';

  var currentPane = 'ask', pollTimer = null;
  function showPane(name) {
    currentPane = name;
    $$('.aw-tab').forEach(function (t) { var on = t.getAttribute('data-pane') === name; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    $$('.aw-pane').forEach(function (p) { p.hidden = p.id !== 'awp-' + name; });
    if (name !== 'mine') stopPoll();
    if (name === 'ask') renderChat();
    if (name === 'topics') renderTopics();
    if (name === 'ticket') renderTicketForm();
    if (name === 'mine') renderMine();
  }
  $$('.aw-tab').forEach(function (t, i, all) {
    t.addEventListener('click', function () { showPane(t.getAttribute('data-pane')); });
    t.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : -1;
      if (j < 0) return; e.preventDefault(); var n = all[(j + all.length) % all.length]; n.focus(); showPane(n.getAttribute('data-pane'));
    });
  });

  /* ---------- chat ---------- */
  function renderChat() {
    var log = $('#awLog'), sug = $('#awSug'), msgs = chat.messages;
    log.innerHTML = '<div class="aw-msg bot">' + chatHtml(WELCOME) + '</div>' + msgs.map(function (m, i) {
      if (m.role === 'user') return '<div class="aw-msg me">' + esc(m.content) + '</div>';
      var showFb = (m.type === 'answer' || m.type === 'maybe') && !m.fb && i === msgs.length - 1;
      return '<div class="aw-msg ' + (m.type === 'none' || m.type === 'human' ? 'err' : 'bot') + '">' + chatHtml(m.content) +
        (m.choices && m.choices.length ? '<div class="aw-chips">' + chips(m.choices) + '</div>' : '') +
        (m.related && m.related.length ? '<div class="aw-rel">Related:</div><div class="aw-chips">' + chips(m.related) + '</div>' : '') +
        (showFb ? '<div class="aw-fb">Did this answer your question? <button type="button" class="aw-fbbtn" data-fb="yes">Yes, thanks</button><button type="button" class="aw-fbbtn" data-fb="no">Not really</button></div>' : '') +
        (m.ticket ? '<div class="aw-cta"><button type="button" class="aw-btn" data-ticket-from="1">Send this to support</button></div>' : '') + '</div>';
    }).join('') + (chat.busy ? '<div class="aw-typing" aria-label="AUREUM Bot is typing"><i></i><i></i><i></i></div>' : '');
    log.scrollTop = log.scrollHeight;
    if (!bot && !botP && msgs.length) loadBot().then(function () { if (currentPane === 'ask') renderChat(); }, function () { });
    var topics = bot ? bot.topics() : [];
    if (chat.topic && bot) { var t = topics.filter(function (x) { return x.topic === chat.topic; })[0]; sug.innerHTML = t ? chips(t.entries) : ''; }
    else sug.innerHTML = msgs.length ? '' : ASKS.map(function (q) { return '<button type="button" class="aw-chip aw-q" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('');
    $('#awSend').disabled = chat.busy;
  }
  $('#awLog').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-ask')) askEntry(b.getAttribute('data-ask'), b.textContent);
    else if (b.hasAttribute('data-fb')) feedback(b.getAttribute('data-fb'));
    else if (b.hasAttribute('data-ticket-from')) openTicket(true);
  });
  $('#awSug').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-q')) sendChat(b.getAttribute('data-q'));
    else if (b.hasAttribute('data-ask')) { chat.topic = null; askEntry(b.getAttribute('data-ask'), b.textContent); }
  });
  /* two answers describe the in-app ticket screens; on the website they point to this page instead */
  var WEB_TEXT = {
    'contact-support': function () { return 'Press **Send a ticket** at the top of this box (or **Not solved? Contact support** under this chat), enter your name and email, write your message and press **Send ticket**. The AUREUM team replies there, and you can follow it under **My tickets**. You can also write to ' + MAIL + (WA ? ' or message us on WhatsApp' : '') + '.'; },
    'ticket-replies': function () { return 'Open **My tickets** at the top of this box. It lists the tickets you sent from this device and shows **New reply** when the AUREUM team has answered. Open a ticket to read the reply and write back.'; }
  };
  function botSays(r) {
    if (r.id && WEB_TEXT[r.id]) r = Object.assign({}, r, { text: WEB_TEXT[r.id]() });
    chat.busy = true; renderChat();
    setTimeout(function () {
      chat.messages.push({ role: 'assistant', content: r.text, type: r.type, id: r.id || null, related: r.related || [], choices: r.choices || [], ticket: !!r.ticket });
      if (r.id && (r.type === 'answer' || r.type === 'maybe' || r.type === 'related')) chat.lastId = r.id;
      chat.lastType = r.type; chat.misses = (r.type === 'none' || r.type === 'sorry') ? (chat.misses || 0) + 1 : 0;
      chat.busy = false; saveChat(); renderChat();
    }, 380);
  }
  function withBot(fn) {
    if (bot) { fn(); return; }
    chat.busy = true; renderChat();
    loadBot().then(function () { chat.busy = false; fn(); }, function () {
      chat.busy = false;
      chat.messages.push({ role: 'assistant', type: 'none', ticket: true, content: "I couldn't start just now (check your connection and try again). You can still send a ticket and the AUREUM team will help." });
      renderChat();
    });
  }
  function sendChat(text) {
    text = String(text || '').trim(); if (!text || chat.busy) return;
    chat.messages.push({ role: 'user', content: text }); chat.topic = null; saveChat(); $('#awInput').value = '';
    withBot(function () { botSays(bot.reply(text, { lastId: chat.lastId, lastType: chat.lastType, misses: chat.misses })); });
  }
  function askEntry(id, title) {
    if (chat.busy) return;
    chat.messages.push({ role: 'user', content: title }); chat.topic = null; saveChat();
    withBot(function () { var r = bot.answerById(id); if (r) botSays(r); });
  }
  function feedback(kind) {
    if (chat.busy) return;
    var last = chat.messages[chat.messages.length - 1]; if (last) last.fb = kind;
    chat.messages.push({ role: 'user', content: kind === 'yes' ? 'Yes, thanks' : 'Not really' });
    withBot(function () { botSays(bot.reply(kind, { lastId: chat.lastId, lastType: chat.lastType, misses: chat.misses })); });
  }
  $('#awAskForm').addEventListener('submit', function (e) { e.preventDefault(); sendChat($('#awInput').value); });
  $('#awInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(e.target.value); } });
  $('#awNew').addEventListener('click', function () { chat.messages = []; chat.lastId = null; chat.lastType = null; chat.misses = 0; chat.topic = null; saveChat(); renderChat(); });
  $('#awToTicket').addEventListener('click', function () { openTicket(true); });

  /* ---------- help topics ---------- */
  function renderTopics() {
    var pane = $('#awp-topics');
    pane.innerHTML = '<p class="aw-note aw-note-top">Pick a question and AUREUM Bot will answer it.</p><p class="aw-loading">Loading help topics…</p>';
    loadBot().then(function () {
      if (currentPane !== 'topics') return;
      pane.innerHTML = '<p class="aw-note aw-note-top">Pick a question and AUREUM Bot will answer it.</p><div class="aw-topics">' + bot.topics().map(function (t) {
        return '<details class="aw-topic"><summary>' + esc(t.topic) + ' <span>' + t.entries.length + '</span></summary><ul>' + t.entries.map(function (e) { return '<li><button type="button" class="aw-link" data-ask="' + esc(e.id) + '">' + esc(e.title) + '</button></li>'; }).join('') + '</ul></details>';
      }).join('') + '</div>';
    }, function () { pane.innerHTML = '<p class="aw-note aw-note-top">The help topics could not load. Check your connection, or <button type="button" class="aw-link" data-go-ticket="1">send us a ticket</button>.</p>'; });
  }
  $('#awp-topics').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-ask')) { showPane('ask'); askEntry(b.getAttribute('data-ask'), b.textContent); }
    if (b.hasAttribute('data-go-ticket')) openTicket(false);
  });

  /* ---------- tickets ---------- */
  var TOPIC_OPTS = [
    ['import', 'Help adding or moving my products', 'question'], ['question', 'A question about AUREUM', 'question'], ['problem', 'Something is not working', 'problem'],
    ['billing', 'Billing or my subscription', 'billing'], ['account', 'Sign-in or my account', 'account'], ['feature', 'A feature I would like', 'feature']
  ];
  var IMPORT_SUBJECT = 'Please help me add or move my products';
  var draft = {};
  function readForm() {
    var v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    return { topic: v('awTopic') || 'question', name: v('awName'), email: v('awEmail'), phone: v('awPhone'), business: v('awBiz'), subject: v('awSubject'), message: v('awMessage'), hp: v('awHp'), chat: !!($('#awIncl') && $('#awIncl').checked) };
  }
  function openTicket(fromChat) {
    var msgs = chat.messages.filter(function (m) { return m.role === 'user'; });
    if (fromChat && msgs.length) { draft.chat = true; if (!draft.message) draft.message = msgs[msgs.length - 1].content; }
    showPane('ticket');
    var root_ = $('#awp-ticket'); if (root_ && root_.scrollIntoView) { try { root_.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* old browser */ } }
    setTimeout(function () { var f = $('#awTopic'); if (f) f.focus({ preventScroll: true }); }, 50);
  }
  function renderTicketForm(prefillTopic) {
    var saved = get('localStorage', 'aureum_web_contact', {});
    var d = Object.assign({ topic: prefillTopic || draft.topic || 'question', name: saved.name || '', email: saved.email || '', phone: saved.phone || '', business: saved.business || '', subject: '', message: '', chat: false }, draft);
    var hasChat = chat.messages.length > 0;
    $('#awp-ticket').innerHTML =
      '<form class="aw-form" id="awForm" novalidate><p class="aw-note aw-note-top">Tell us what you need. A real person from the AUREUM team replies. You can follow the reply under <b>My tickets</b> on this device.</p>' +
      '<div class="aw-row"><label class="aw-f"><span>Your name *</span><input id="awName" autocomplete="name" maxlength="80" value="' + esc(d.name) + '" required></label>' +
      '<label class="aw-f"><span>Email *</span><input id="awEmail" type="email" autocomplete="email" maxlength="120" value="' + esc(d.email) + '" required></label></div>' +
      '<div class="aw-row"><label class="aw-f"><span>Phone / WhatsApp <em>(optional)</em></span><input id="awPhone" type="tel" autocomplete="tel" maxlength="40" value="' + esc(d.phone) + '"></label>' +
      '<label class="aw-f"><span>Business name <em>(optional)</em></span><input id="awBiz" autocomplete="organization" maxlength="100" value="' + esc(d.business) + '"></label></div>' +
      '<label class="aw-f"><span>What do you need help with? *</span><select id="awTopic">' + TOPIC_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === d.topic ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>' +
      '<label class="aw-f"><span>Subject *</span><input id="awSubject" maxlength="140" value="' + esc(d.subject || (d.topic === 'import' ? IMPORT_SUBJECT : '')) + '" required></label>' +
      '<label class="aw-f"><span>Message *</span><textarea id="awMessage" rows="5" maxlength="6000" required placeholder="' + (d.topic === 'import' ? 'Tell us what you use now (an old POS, Excel, paper) and roughly how many products you have.' : 'Describe what you need or what went wrong.') + '">' + esc(d.message) + '</textarea></label>' +
      '<div class="aw-hp" aria-hidden="true"><label>Leave this empty <input id="awHp" tabindex="-1" autocomplete="off"></label></div>' +
      (hasChat ? '<label class="aw-check"><input type="checkbox" id="awIncl"' + (d.chat ? ' checked' : '') + '> <span>Include my chat with AUREUM Bot so the team can see what I asked</span></label>' : '') +
      '<p class="aw-note">Never type passwords, PINs or card numbers. We use your details only to answer your ticket (<a href="/privacy/">Privacy Policy</a>).</p>' +
      '<div class="aw-err" id="awFormErr" role="alert"></div>' +
      '<div class="aw-actions"><button type="submit" class="aw-btn" id="awSubmit">Send ticket</button>' +
      '<a class="aw-link" href="mailto:' + esc(MAIL) + '">or email ' + esc(MAIL) + '</a>' + (WA ? '<a class="aw-link" href="https://wa.me/' + esc(WA) + '" target="_blank" rel="noopener">or WhatsApp us</a>' : '') + '</div></form>';
    var form = $('#awForm');
    $('#awTopic').addEventListener('change', function () {
      var s = $('#awSubject'), m = $('#awMessage');
      if (this.value === 'import') { if (!s.value.trim()) s.value = IMPORT_SUBJECT; m.placeholder = 'Tell us what you use now (an old POS, Excel, paper) and roughly how many products you have.'; }
      else { if (s.value === IMPORT_SUBJECT) s.value = ''; m.placeholder = 'Describe what you need or what went wrong.'; }
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); submitTicket(); });
  }
  function fail(msg, focusId) { var e = $('#awFormErr'); e.textContent = msg; if (focusId && $('#' + focusId)) $('#' + focusId).focus(); }
  function mailFallback(f) {
    var body = 'Name: ' + f.name + '\nEmail: ' + f.email + (f.phone ? '\nPhone/WhatsApp: ' + f.phone : '') + (f.business ? '\nBusiness: ' + f.business : '') + '\n\n' + f.message;
    var q = encodeURIComponent(body.slice(0, 1500));
    return { mail: 'mailto:' + MAIL + '?subject=' + encodeURIComponent(f.subject) + '&body=' + q, wa: WA ? 'https://wa.me/' + WA + '?text=' + encodeURIComponent((f.subject + '\n' + f.message).slice(0, 800)) : '' };
  }
  function submitTicket() {
    var f = readForm();
    if (f.name.length < 2) return fail('Please enter your name.', 'awName');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.email)) return fail('Please enter a valid email address so we can reply.', 'awEmail');
    if (f.subject.length < 3) return fail('Please give your ticket a short subject.', 'awSubject');
    if (f.message.length < 5) return fail('Please describe what you need (at least a few words).', 'awMessage');
    draft = { topic: f.topic, subject: f.subject, message: f.message, chat: f.chat };
    set('localStorage', 'aureum_web_contact', { name: f.name, email: f.email, phone: f.phone, business: f.business });
    var btn = $('#awSubmit'); btn.disabled = true; btn.textContent = 'Sending…'; $('#awFormErr').textContent = '';
    var cat = (TOPIC_OPTS.filter(function (o) { return o[0] === f.topic; })[0] || [0, 0, 'question'])[2];
    rpc('support_web_create_ticket', { p_name: f.name, p_email: f.email, p_phone: f.phone || null, p_business: f.business || null, p_subject: f.subject, p_category: cat, p_body: f.message, p_transcript: f.chat ? transcript() : null, p_website: f.hp || null })
      .then(function (r) {
        r = Array.isArray(r) ? r[0] : r;
        if (!r || !r.id || !r.token) throw new Error('bad reply');
        var list = get('localStorage', 'aureum_web_tickets', []); list.unshift({ id: r.id, token: r.token, subject: f.subject, email: f.email, at: new Date().toISOString(), seenAt: new Date().toISOString() });
        set('localStorage', 'aureum_web_tickets', list.slice(0, 20)); draft = {};
        showPane('mine'); openThread(list[0], true);
      })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = 'Send ticket';
        var el = $('#awFormErr');
        if (e && e.unavailable || e && e.network || !e || !e.status || e.status >= 500) {
          var fb = mailFallback(f);
          el.innerHTML = (e && e.network ? 'We couldn’t reach the AUREUM server. Check your connection and try again, or send your message another way:' : 'Tickets can’t be sent from the website right now. Your message is ready to send another way:') +
            ' <a class="aw-link" href="' + esc(fb.mail) + '">email it to us</a>' + (fb.wa ? ' · <a class="aw-link" href="' + esc(fb.wa) + '" target="_blank" rel="noopener">WhatsApp it to us</a>' : '') + '.';
        } else el.textContent = clean(e.message) || 'Sorry, the ticket could not be sent. Please try again.';
      });
  }

  /* ---------- my tickets + a ticket's conversation ---------- */
  var STATUS = { open: 'Open', pending: 'Replied', resolved: 'Solved', closed: 'Closed' };
  var unseen = function (ref, t) { return !!(t && t.last_admin_reply_at && (!ref.seenAt || new Date(t.last_admin_reply_at) > new Date(ref.seenAt))); };
  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
  function setDot(on) { var d = $('#awDot'), t = $('#awDotTxt'); if (d) d.hidden = !on; if (t) t.hidden = !on; }
  function renderMine() {
    stopPoll();
    var list = get('localStorage', 'aureum_web_tickets', []), pane = $('#awp-mine');
    if (!list.length) { pane.innerHTML = '<div class="aw-empty"><p>No tickets yet on this device.</p><p>Tickets you send here appear in this list, with the team’s replies.</p><button type="button" class="aw-btn" data-new="1">Send a ticket</button></div>'; return; }
    pane.innerHTML = '<div class="aw-mine-head"><h3>Your tickets on this device</h3><button type="button" class="aw-link" data-refresh="1">Refresh</button></div><ul class="aw-tk-list">' + list.map(function (r, i) {
      return '<li><button type="button" class="aw-tk" data-i="' + i + '"><span class="aw-tk-main"><b>' + esc(r.subject) + '</b><small>Ref ' + esc(String(r.id).slice(0, 8).toUpperCase()) + ' · ' + esc(fmtDate(r.at)) + '</small></span><span class="aw-tk-state" data-state="' + i + '"></span></button></li>';
    }).join('') + '</ul>';
    refreshStates(list);
  }
  function refreshStates(list) {
    var any = false, pending = Math.min(list.length, 8);
    list.slice(0, 8).forEach(function (r, i) {
      rpc('support_web_get_ticket', { p_id: r.id, p_token: r.token }).then(function (d) {
        var t = d && d.ticket, el = $('[data-state="' + i + '"]'), n = unseen(r, t);
        if (el && t) el.innerHTML = (n ? '<span class="aw-dot" title="New reply"></span> New reply' : esc(STATUS[t.status] || t.status));
        if (n) any = true; setDot(any);
      }).catch(function () { /* offline or not set up: the list still works */ });
    });
  }
  $('#awp-mine').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-new')) openTicket(false);
    else if (b.hasAttribute('data-refresh')) renderMine();
    else if (b.hasAttribute('data-i')) openThread(get('localStorage', 'aureum_web_tickets', [])[+b.getAttribute('data-i')]);
  });
  function bubble(m) {
    var who = m.author_type === 'admin' ? 'AUREUM Support' : 'You';
    return '<div class="aw-bub ' + (m.author_type === 'admin' ? 'team' : 'you') + '"><div class="aw-who">' + who + ' · ' + esc(fmtDate(m.created_at)) + '</div>' + esc(m.body) + '</div>';
  }
  function openThread(ref, justSent) {
    if (!ref) return;
    var pane = $('#awp-mine'); stopPoll();
    pane.innerHTML = '<button type="button" class="aw-link aw-back" id="awBack">‹ Back to my tickets</button><div id="awThread"><p class="aw-loading">Loading your ticket…</p></div>';
    $('#awBack').addEventListener('click', renderMine);
    var load = function (initial) {
      rpc('support_web_get_ticket', { p_id: ref.id, p_token: ref.token }).then(function (d) {
        var t = d.ticket, msgs = d.messages || [], box = $('#awThread'); if (!box) return;
        var typing = document.activeElement && document.activeElement.id === 'awReply' ? $('#awReply').value : '';
        box.innerHTML =
          (justSent && initial ? '<div class="aw-ok" role="status"><b>Ticket sent.</b> Your reference is <b>' + esc(String(ref.id).slice(0, 8).toUpperCase()) + '</b>. The AUREUM team will reply here, and may also email you at ' + esc(ref.email) + '.</div>' : '') +
          '<div class="aw-tk-title"><div><h3>' + esc(t.subject) + '</h3><small>Ref ' + esc(String(ref.id).slice(0, 8).toUpperCase()) + ' · ' + esc(STATUS[t.status] || t.status) + '</small></div></div>' +
          '<div class="aw-thread" id="awMsgs">' + msgs.map(bubble).join('') + '</div>' +
          (t.status === 'resolved' || t.status === 'closed' ? '<p class="aw-note">This ticket is marked ' + (t.status === 'resolved' ? 'solved' : 'closed') + '. Write below to reopen it.</p>' : '') +
          '<form class="aw-reply" id="awReplyForm"><label class="sr-only" for="awReply">Write a reply</label><textarea id="awReply" rows="3" maxlength="6000" placeholder="Write a reply…"></textarea><div class="aw-err" id="awReplyErr" role="alert"></div><button type="submit" class="aw-btn" id="awReplyBtn">Send reply</button></form>';
        var th = $('#awMsgs'); th.scrollTop = th.scrollHeight;
        if (typing) { $('#awReply').value = typing; $('#awReply').focus(); }
        $('#awReplyForm').addEventListener('submit', function (e) {
          e.preventDefault(); var txt = $('#awReply').value.trim(); if (!txt) { $('#awReplyErr').textContent = 'Type a message first.'; return; }
          $('#awReplyBtn').disabled = true;
          rpc('support_web_add_message', { p_id: ref.id, p_token: ref.token, p_body: txt }).then(function () { justSent = false; load(false); }, function (er) { $('#awReplyBtn').disabled = false; $('#awReplyErr').textContent = er.network ? 'We couldn’t reach the server. Please try again.' : clean(er.message); });
        });
        var list = get('localStorage', 'aureum_web_tickets', []);
        list.forEach(function (x) { if (x.id === ref.id) x.seenAt = new Date().toISOString(); }); set('localStorage', 'aureum_web_tickets', list); ref.seenAt = new Date().toISOString();
        setDot(false);
      }).catch(function (e) {
        var box = $('#awThread'); if (box && initial) box.innerHTML = '<div class="aw-err">' + (e && e.network ? 'We couldn’t reach the server. Check your connection and try again.' : 'We couldn’t open this ticket. ' + esc(clean(e && e.message))) + '</div>';
      });
    };
    load(true);
    pollTimer = setInterval(function () { if (!document.hidden && !(document.activeElement && document.activeElement.id === 'awReply' && $('#awReply').value)) load(false); }, 30000);
  }

  /* ---------- entry points ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-aw-open]'); if (!a) return;
    var what = a.getAttribute('data-aw-open'); if (what === 'ticket') { e.preventDefault(); draft.topic = draft.topic || 'import'; openTicket(false); var sec = document.getElementById('help'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth' }); }
  });
  renderChat();
  if (location.hash === '#ticket') openTicket(false);
  if (get('localStorage', 'aureum_web_tickets', []).length) {
    var l0 = get('localStorage', 'aureum_web_tickets', []).slice(0, 5), any0 = false;
    l0.forEach(function (r) { rpc('support_web_get_ticket', { p_id: r.id, p_token: r.token }).then(function (d) { if (unseen(r, d && d.ticket)) { any0 = true; setDot(true); } }).catch(function () { }); });
  }
})();
