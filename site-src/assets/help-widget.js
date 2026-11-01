/* AUREUM website Live Chat: a floating ? button on every page that opens a panel with two tabs:
   - Live chat: online messaging with the AUREUM team. It only needs a data or Wi-Fi connection. The team reads and answers from the control panel
     (/admin → Support); replies appear here within a few seconds. When the chat is completed (the visitor ends it, or the team marks it solved) it is cleared.
   - FAQ: the same help library the Back Office uses (not a live AI, runs in the browser, sends nothing anywhere).
   Also: a "Leave us your contact details" form (data-aw-open="contact") used by the Support page.
   Messages go through the public database functions in supabase/support-website.sql. Until that file has been run, the forms say so and offer email instead. */
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
  function set(store, k, v) { try { if (v === null) window[store].removeItem(k); else window[store].setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked: the page still works */ } }
  var fmtTime = function (t) { try { return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  var clean = function (m) { return String(m || '').replace(/^RATE_LIMIT:\s*/, ''); };
  var EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

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
  var isDown = function (e) { return !!(e && (e.unavailable || e.network || !e.status || e.status >= 500)); };
  function mailFallback(f) {
    var body = 'Name: ' + f.name + (f.email ? '\nEmail: ' + f.email : '') + (f.phone ? '\nPhone/WhatsApp: ' + f.phone : '') + '\n\n' + f.message;
    return { mail: 'mailto:' + MAIL + '?subject=' + encodeURIComponent(f.subject) + '&body=' + encodeURIComponent(body.slice(0, 1500)), wa: WA ? 'https://wa.me/' + WA + '?text=' + encodeURIComponent((f.subject + '\n' + f.message).slice(0, 800)) : '' };
  }
  function downMsg(e, f, what) {
    var fb = mailFallback(f);
    return (e && e.network ? 'We couldn’t reach the AUREUM server. Check your data or Wi-Fi and try again, or write to us:' : what + ' is not available right now. Your message is ready to send another way:') +
      ' <a class="aw-link" href="' + esc(fb.mail) + '">email it to us</a>' + (fb.wa ? ' · <a class="aw-link" href="' + esc(fb.wa) + '" target="_blank" rel="noopener">WhatsApp it to us</a>' : '') + '.';
  }

  /* ---------- FAQ: the help library (loaded the first time it is needed) ---------- */
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
  var WELCOME = "Common questions about AUREUM, answered instantly from AUREUM's help library. Pick one below or type your own. For a person, use the **Live chat** tab.";
  var ASKS = ['How do I import products from Excel or CSV?', 'How much does AUREUM cost?', 'How do I add a product?', 'Does AUREUM work without internet?', 'How do I refund a customer?'];
  var chat = Object.assign({ messages: [], lastId: null, lastType: null, misses: 0 }, get('sessionStorage', 'aureum_web_chat', {}));
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
  var chips = function (arr) { return arr.map(function (c) { return '<button type="button" class="aw-chip" data-ask="' + esc(c.id) + '">' + esc(c.title) + '</button>'; }).join(''); };

  /* ---------- page shell: the ? button, the panel, the contact-details dialog ---------- */
  var SEND_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  root.innerHTML =
    '<button type="button" class="aw-fab" id="awFab" aria-label="Open live chat" aria-expanded="false" aria-controls="awPanel"><span aria-hidden="true">?</span><i class="aw-dot aw-fab-dot" id="awFabDot" hidden></i></button>' +
    '<div class="aw-panel" id="awPanel" role="dialog" aria-label="AUREUM Live Chat" hidden>' +
    '<div class="aw-head"><span class="aw-live" aria-hidden="true"></span><div class="aw-head-t"><b>AUREUM Live Chat</b><small>Reach the AUREUM team directly</small></div>' +
    '<button type="button" class="aw-x" id="awClose" aria-label="Close chat">✕</button></div>' +
    '<div class="aw-tabs" role="tablist" aria-label="Live chat sections">' +
    '<button type="button" role="tab" class="aw-tab" id="awt-live" data-pane="live" aria-controls="awp-live" aria-selected="true">Live chat <span class="aw-dot" id="awDot" hidden></span><span class="sr-only" id="awDotTxt" hidden>(new reply)</span></button>' +
    '<button type="button" role="tab" class="aw-tab" id="awt-ask" data-pane="ask" aria-controls="awp-ask" aria-selected="false" tabindex="-1">FAQ</button>' +
    '</div>' +
    '<div class="aw-pane aw-pane-chat" id="awp-live" role="tabpanel" aria-labelledby="awt-live"></div>' +
    '<div class="aw-pane aw-pane-chat" id="awp-ask" role="tabpanel" aria-labelledby="awt-ask" hidden>' +
    '<div class="aw-scroll" id="awScroll"><div class="aw-log" id="awLog" role="log" aria-live="polite" aria-label="Frequently asked questions"></div><div class="aw-sug" id="awSug"></div></div>' +
    '<div class="aw-compose"><form class="aw-ask" id="awAskForm"><label class="sr-only" for="awInput">Type your own question</label>' +
    '<textarea id="awInput" rows="1" maxlength="400" placeholder="Type your own question…"></textarea>' +
    '<button type="submit" class="aw-send" id="awSend" aria-label="Send">' + SEND_SVG + '</button></form>' +
    '<div class="aw-foot"><button type="button" class="aw-link aw-newchat" id="awNew">Clear</button><button type="button" class="aw-link" id="awTopicsBtn">Browse all topics</button><button type="button" class="aw-link" id="awToLive">Not solved? Chat with the team</button></div>' +
    '<p class="aw-note">FAQ answers are automated, from AUREUM’s help library, and can’t see your account. Never type passwords, PINs or card numbers.</p></div></div>' +
    '<div class="aw-pane aw-scroll" id="awp-topics" role="tabpanel" aria-label="Help topics" hidden></div>' +
    '</div>' +
    '<dialog class="aw-dialog" id="awContact" aria-labelledby="awCTitle"></dialog>';

  var currentPane = 'live', pollTimer = null, peekTimer = null;
  var panel = $('#awPanel'), fab = $('#awFab');
  function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }
  function setDot(on) { var d = $('#awDot'), t = $('#awDotTxt'), f = $('#awFabDot'); if (d) d.hidden = !on; if (t) t.hidden = !on; if (f) f.hidden = !on; }
  function showPane(name) {
    currentPane = name; var tabName = name === 'topics' ? 'ask' : name;
    $$('.aw-tab').forEach(function (t) { var on = t.getAttribute('data-pane') === tabName; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; });
    $$('.aw-pane').forEach(function (p) { p.hidden = p.id !== 'awp-' + name; });
    if (name !== 'live') stopPoll();
    if (name === 'live') renderLive();
    if (name === 'ask') renderChat();
    if (name === 'topics') renderTopics();
  }
  function openPanel(pane) {
    panel.hidden = false; fab.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('aw-open');
    showPane(pane || currentPane);
    setTimeout(function () { var f = currentPane === 'ask' ? $('#awInput') : currentPane === 'live' ? ($('#awLiveMsg') || $('#awLName')) : null; if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } } }, 60);
  }
  function closePanel() { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('aw-open'); stopPoll(); try { fab.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
  fab.addEventListener('click', function () { if (panel.hidden) openPanel(); else closePanel(); });
  $('#awClose').addEventListener('click', closePanel);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
  $$('.aw-tab').forEach(function (t, i, all) {
    t.addEventListener('click', function () { showPane(t.getAttribute('data-pane')); });
    t.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : -1;
      if (j < 0) return; e.preventDefault(); var n = all[(j + all.length) % all.length]; n.focus(); showPane(n.getAttribute('data-pane'));
    });
  });

  /* ---------- FAQ ---------- */
  function renderChat() {
    var log = $('#awLog'), sug = $('#awSug'), msgs = chat.messages;
    log.innerHTML = '<div class="aw-msg bot">' + chatHtml(WELCOME) + '</div>' + msgs.map(function (m, i) {
      if (m.role === 'user') return '<div class="aw-msg me">' + esc(m.content) + '</div>';
      var showFb = (m.type === 'answer' || m.type === 'maybe') && !m.fb && i === msgs.length - 1;
      return '<div class="aw-msg ' + (m.type === 'none' || m.type === 'human' ? 'err' : 'bot') + '">' + chatHtml(m.content) +
        (m.choices && m.choices.length ? '<div class="aw-chips">' + chips(m.choices) + '</div>' : '') +
        (m.related && m.related.length ? '<div class="aw-rel">Related:</div><div class="aw-chips">' + chips(m.related) + '</div>' : '') +
        (showFb ? '<div class="aw-fb">Did this answer your question? <button type="button" class="aw-fbbtn" data-fb="yes">Yes, thanks</button><button type="button" class="aw-fbbtn" data-fb="no">Not really</button></div>' : '') +
        (m.ticket ? '<div class="aw-cta"><button type="button" class="aw-btn" data-to-live="1">Ask the AUREUM team</button></div>' : '') + '</div>';
    }).join('') + (chat.busy ? '<div class="aw-typing" aria-label="Typing"><i></i><i></i><i></i></div>' : '');
    var sc = $('#awScroll'); if (sc) sc.scrollTop = msgs.length ? sc.scrollHeight : 0;
    if (!bot && !botP && msgs.length) loadBot().then(function () { if (currentPane === 'ask') renderChat(); }, function () { });
    sug.innerHTML = msgs.length ? '' : ASKS.map(function (q) { return '<button type="button" class="aw-chip aw-q" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('');
    $('#awSend').disabled = chat.busy;
  }
  $('#awLog').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-ask')) askEntry(b.getAttribute('data-ask'), b.textContent);
    else if (b.hasAttribute('data-fb')) feedback(b.getAttribute('data-fb'));
    else if (b.hasAttribute('data-to-live')) openLive(true);
  });
  $('#awSug').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b && b.hasAttribute('data-q')) sendChat(b.getAttribute('data-q')); });
  /* two answers describe the in-app ticket screens; on the website they point to the Live chat tab instead */
  var WEB_TEXT = {
    'contact-support': function () { return 'Open the **Live chat** tab at the top of this panel, type your name and message, and the AUREUM team will reply there. You can also write to ' + MAIL + (WA ? ' or message us on WhatsApp' : '') + '.'; },
    'ticket-replies': function () { return 'Replies from the AUREUM team appear in the **Live chat** tab, in the same conversation.'; }
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
      chat.messages.push({ role: 'assistant', type: 'none', ticket: true, content: "I couldn't load the answers just now (check your connection and try again). You can still chat with the AUREUM team." });
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
    chat.messages.push({ role: 'user', content: title }); saveChat();
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
  $('#awNew').addEventListener('click', function () { chat.messages = []; chat.lastId = null; chat.lastType = null; chat.misses = 0; saveChat(); renderChat(); });
  $('#awToLive').addEventListener('click', function () { openLive(true); });
  $('#awTopicsBtn').addEventListener('click', function () { showPane('topics'); });
  function renderTopics() {
    var pane = $('#awp-topics');
    pane.innerHTML = '<p class="aw-loading">Loading help topics…</p>';
    loadBot().then(function () {
      if (currentPane !== 'topics') return;
      pane.innerHTML = '<button type="button" class="aw-link aw-back" data-back-faq="1">‹ Back to FAQ</button><p class="aw-note aw-note-top">Pick a question and it is answered in the FAQ.</p><div class="aw-topics">' + bot.topics().map(function (t) {
        return '<details class="aw-topic"><summary>' + esc(t.topic) + ' <span>' + t.entries.length + '</span></summary><ul>' + t.entries.map(function (e) { return '<li><button type="button" class="aw-link" data-ask="' + esc(e.id) + '">' + esc(e.title) + '</button></li>'; }).join('') + '</ul></details>';
      }).join('') + '</div>';
    }, function () { pane.innerHTML = '<p class="aw-note aw-note-top">The help topics could not load. Check your connection, or <button type="button" class="aw-link" data-to-live="1">chat with the team</button>.</p>'; });
  }
  $('#awp-topics').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-ask')) { showPane('ask'); askEntry(b.getAttribute('data-ask'), b.textContent); }
    if (b.hasAttribute('data-back-faq')) showPane('ask');
    if (b.hasAttribute('data-to-live')) openLive(false);
  });

  /* ---------- Live chat: a conversation with the AUREUM team ---------- */
  var live = get('localStorage', 'aureum_web_live', null), liveDraft = '', liveNotice = '', liveShown = '';
  var LIVE_HELLO = 'Hello and welcome to AUREUM! One of our team members will be with you shortly. While you wait, you can already post your question here.';
  function openLive(fromFaq) {
    if (fromFaq && !live) { var us = chat.messages.filter(function (m) { return m.role === 'user' && m.content !== 'Not really' && m.content !== 'Yes, thanks'; }); if (us.length) liveDraft = us[us.length - 1].content; }
    openPanel('live');
  }
  function renderLive() { stopPoll(); liveShown = ''; var pane = $('#awp-live'); if (!live) renderLiveStart(pane); else renderLiveChat(pane); }
  function renderLiveStart(pane) {
    var saved = get('localStorage', 'aureum_web_contact', {});
    pane.innerHTML = '<div class="aw-scroll"><form class="aw-form" id="awLiveForm" novalidate><h3 class="aw-welcome">Welcome to AUREUM Live Chat</h3>' +
      (liveNotice ? '<div class="aw-ok" role="status">' + esc(liveNotice) + '</div>' : '') +
      '<p class="aw-note aw-note-top">Write to the AUREUM team directly. You only need a data or Wi-Fi connection. The team reads your message and replies right here.</p>' +
      '<label class="aw-f"><span>Your name *</span><input id="awLName" autocomplete="name" maxlength="80" value="' + esc(saved.name || '') + '" required></label>' +
      '<div class="aw-row"><label class="aw-f"><span>Email <em>(optional)</em></span><input id="awLEmail" type="email" autocomplete="email" maxlength="120" value="' + esc(saved.email || '') + '"></label>' +
      '<label class="aw-f"><span>Phone number <em>(optional)</em></span><input id="awLPhone" type="tel" autocomplete="tel" maxlength="40" value="' + esc(saved.phone || '') + '"></label></div>' +
      '<label class="aw-f"><span>How can we help? *</span><textarea id="awLMsg" rows="4" maxlength="2000" required placeholder="Type your message here…">' + esc(liveDraft) + '</textarea></label>' +
      '<div class="aw-hp" aria-hidden="true"><label>Leave this empty <input id="awLHp" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="aw-err" id="awLErr" role="alert"></div>' +
      '<div class="aw-bigsend"><button type="submit" class="aw-send aw-send-lg" id="awLGo" aria-label="Start chat">' + SEND_SVG + '</button></div>' +
      '<p class="aw-note">Never type passwords, PINs or card numbers. We use your details only to answer you (<a href="/privacy/">Privacy Policy</a>).</p></form></div>';
    liveNotice = '';
    $('#awLiveForm').addEventListener('submit', function (e) { e.preventDefault(); startLive(); });
  }
  function startLive() {
    var v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    var f = { name: v('awLName'), email: v('awLEmail'), phone: v('awLPhone'), message: v('awLMsg'), hp: v('awLHp') }, err = $('#awLErr');
    if (f.name.length < 2) { err.textContent = 'Please enter your name.'; $('#awLName').focus(); return; }
    if (f.email && !EMAIL_RX.test(f.email)) { err.textContent = 'That email address does not look right. Fix it, or leave it empty.'; $('#awLEmail').focus(); return; }
    if (f.message.length < 5) { err.textContent = 'Please type your message (at least a few words).'; $('#awLMsg').focus(); return; }
    set('localStorage', 'aureum_web_contact', { name: f.name, email: f.email, phone: f.phone });
    var btn = $('#awLGo'); btn.disabled = true; err.textContent = '';
    f.subject = 'Live chat: ' + f.message.replace(/\s+/g, ' ').slice(0, 60);
    rpc('support_web_create_ticket', { p_name: f.name, p_email: f.email || null, p_phone: f.phone || null, p_business: null, p_subject: f.subject, p_category: 'question', p_body: f.message, p_transcript: null, p_website: f.hp || null })
      .then(function (r) {
        r = Array.isArray(r) ? r[0] : r; if (!r || !r.id || !r.token) throw new Error('bad reply');
        live = { id: r.id, token: r.token, name: f.name, email: f.email, seenAt: new Date().toISOString() }; liveDraft = '';
        set('localStorage', 'aureum_web_live', live); renderLive();
        if (!peekTimer) peekTimer = setInterval(peekLive, 20000);
      })
      .catch(function (e) { btn.disabled = false; if (isDown(e)) err.innerHTML = downMsg(e, f, 'Live chat'); else err.textContent = clean(e.message) || 'Sorry, the chat could not be started. Please try again.'; });
  }
  function renderLiveChat(pane) {
    pane.innerHTML = '<div class="aw-scroll" id="awLiveScroll"><div class="aw-thread aw-livelog" id="awLiveMsgs" role="log" aria-live="polite" aria-label="Conversation with the AUREUM team"><p class="aw-loading">Loading your chat…</p></div></div>' +
      '<div class="aw-compose" id="awLiveCompose"><form class="aw-ask" id="awLiveSend"><label class="sr-only" for="awLiveMsg">Type your message</label><textarea id="awLiveMsg" rows="1" maxlength="2000" placeholder="Type your message here…"></textarea>' +
      '<button type="submit" class="aw-send" id="awLiveGo" aria-label="Send">' + SEND_SVG + '</button></form><div class="aw-err" id="awLiveErr" role="alert"></div>' +
      '<div class="aw-foot"><button type="button" class="aw-link" id="awLiveEnd">End chat</button><span class="aw-note aw-inline">Ending the chat clears it from this device.</span></div></div>';
    $('#awLiveSend').addEventListener('submit', function (e) { e.preventDefault(); sendLive(); });
    $('#awLiveMsg').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendLive(); } });
    $('#awLiveEnd').addEventListener('click', endLive);
    fetchLive(true);
    pollTimer = setInterval(function () { if (!document.hidden && !panel.hidden && currentPane === 'live') fetchLive(false); }, 4000);
  }
  /* the chat is finished: show it one last time, forget it on this device, and offer a fresh start */
  function chatFinished(note) {
    stopPoll(); live = null; set('localStorage', 'aureum_web_live', null); setDot(false);
    var c = $('#awLiveCompose'); if (c) c.innerHTML = '<p class="aw-note aw-note-top">' + esc(note) + '</p><button type="button" class="aw-btn" id="awLiveAgain">Start a new chat</button>';
    var b = $('#awLiveAgain'); if (b) b.addEventListener('click', function () { liveNotice = ''; renderLive(); });
  }
  function fetchLive(first) {
    if (!live) return;
    rpc('support_web_get_ticket', { p_id: live.id, p_token: live.token }).then(function (d) {
      if (!live) return;
      var t = d.ticket, msgs = d.messages || [], box = $('#awLiveMsgs'); if (!box) return;
      var ended = t.status === 'resolved' || t.status === 'closed';
      var sig = msgs.length + ':' + t.status; if (sig === liveShown) return; liveShown = sig;
      var team = msgs.some(function (m) { return m.author_type === 'admin'; });
      var sc = $('#awLiveScroll'), stick = first || !sc || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
      box.innerHTML = '<div class="aw-bub auto"><div class="aw-who">AUREUM · automatic message</div>' + esc(LIVE_HELLO) + '</div>' + msgs.map(function (m) {
        var tm = m.author_type === 'admin';
        return '<div class="aw-bub ' + (tm ? 'team' : 'you') + '"><div class="aw-who">' + (tm ? 'AUREUM Team' : 'You') + ' · ' + esc(fmtTime(m.created_at)) + '</div>' + esc(m.body) + '</div>';
      }).join('') + (!team && !ended ? '<p class="aw-note aw-wait">Message received. We will reply here as soon as someone from the team is free.' + (live.email ? ' We may also email you at ' + esc(live.email) + '.' : '') + '</p>' : '');
      if (stick && sc) sc.scrollTop = sc.scrollHeight;
      if (ended) chatFinished('This chat has ended. Thank you for contacting AUREUM. The conversation will clear from this device.');
      else { live.seenAt = new Date().toISOString(); set('localStorage', 'aureum_web_live', live); setDot(false); }
    }).catch(function (e) {
      if (e && e.status === 400 && /not found/i.test(e.message || '')) { live = null; set('localStorage', 'aureum_web_live', null); renderLive(); }
      else if (first) { var box = $('#awLiveMsgs'); if (box) box.innerHTML = '<div class="aw-err">' + (e && e.network ? 'We couldn’t reach the server. Check your data or Wi-Fi; this chat updates when you’re back online.' : 'We couldn’t load this chat.') + '</div>'; }
    });
  }
  function sendLive() {
    var ta = $('#awLiveMsg'), txt = ta.value.trim(), err = $('#awLiveErr'); if (!txt || !live) return;
    $('#awLiveGo').disabled = true; err.textContent = '';
    rpc('support_web_add_message', { p_id: live.id, p_token: live.token, p_body: txt }).then(function () { ta.value = ''; $('#awLiveGo').disabled = false; liveShown = ''; fetchLive(true); ta.focus(); },
      function (e) { $('#awLiveGo').disabled = false; err.textContent = e && e.network ? 'We couldn’t reach the server. Check your data or Wi-Fi and try again.' : clean(e && e.message) || 'The message could not be sent.'; });
  }
  function endLive() {
    if (!live) return;
    var ref = live, b = $('#awLiveEnd'); if (b) b.disabled = true;
    rpc('support_web_end_chat', { p_id: ref.id, p_token: ref.token }).catch(function () { /* the team can still close it; it is cleared here either way */ }).then(function () {
      live = null; set('localStorage', 'aureum_web_live', null); setDot(false); liveNotice = 'Chat ended. Thank you for contacting AUREUM. The conversation has been cleared from this device.'; renderLive();
    });
  }
  /* a red dot on the ? button when the team has replied while the chat was closed */
  function peekLive() {
    if (!live || !panel.hidden) return;
    rpc('support_web_get_ticket', { p_id: live.id, p_token: live.token }).then(function (d) {
      var t = d.ticket; if (t.status === 'resolved' || t.status === 'closed') { setDot(true); return; }
      var last = (d.messages || []).filter(function (m) { return m.author_type === 'admin'; }).pop();
      if (last && (!live.seenAt || new Date(last.created_at) > new Date(live.seenAt))) setDot(true);
    }).catch(function () { });
  }

  /* ---------- "Leave us your contact details" ---------- */
  var dlg = $('#awContact');
  function openContact() {
    var saved = get('localStorage', 'aureum_web_contact', {});
    dlg.innerHTML = '<form class="aw-form" id="awCForm" novalidate><div class="aw-dlg-head"><h3 id="awCTitle">Leave us your contact details</h3><button type="button" class="aw-x" id="awCClose" aria-label="Close">✕</button></div>' +
      '<p class="aw-note aw-note-top">We will get back to you. Add an email address, a phone number or both.</p>' +
      '<label class="aw-f"><span>Your name *</span><input id="awCName" autocomplete="name" maxlength="80" value="' + esc(saved.name || '') + '" required></label>' +
      '<div class="aw-row"><label class="aw-f"><span>Email</span><input id="awCEmail" type="email" autocomplete="email" maxlength="120" value="' + esc(saved.email || '') + '"></label>' +
      '<label class="aw-f"><span>Phone / WhatsApp</span><input id="awCPhone" type="tel" autocomplete="tel" maxlength="40" value="' + esc(saved.phone || '') + '"></label></div>' +
      '<label class="aw-f"><span>Business name <em>(optional)</em></span><input id="awCBiz" autocomplete="organization" maxlength="100"></label>' +
      '<label class="aw-f"><span>What do you need? <em>(optional)</em></span><textarea id="awCMsg" rows="3" maxlength="2000" placeholder="For example: help moving my products from my old POS"></textarea></label>' +
      '<div class="aw-hp" aria-hidden="true"><label>Leave this empty <input id="awCHp" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="aw-err" id="awCErr" role="alert"></div><div class="aw-actions"><button type="submit" class="aw-btn" id="awCGo">Send my details</button><button type="button" class="aw-link" id="awCCancel">Cancel</button></div>' +
      '<p class="aw-note">We use your details only to contact you about AUREUM (<a href="/privacy/">Privacy Policy</a>).</p></form>';
    var close = function () { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); };
    $('#awCClose').addEventListener('click', close); $('#awCCancel').addEventListener('click', close);
    $('#awCForm').addEventListener('submit', function (e) { e.preventDefault(); submitContact(close); });
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', '');
    setTimeout(function () { $('#awCName').focus(); }, 30);
  }
  function submitContact(close) {
    var v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
    var f = { name: v('awCName'), email: v('awCEmail'), phone: v('awCPhone'), business: v('awCBiz'), message: v('awCMsg'), hp: v('awCHp') }, err = $('#awCErr');
    if (f.name.length < 2) { err.textContent = 'Please enter your name.'; $('#awCName').focus(); return; }
    if (!f.email && !f.phone) { err.textContent = 'Please add an email address or a phone number so we can reach you.'; $('#awCEmail').focus(); return; }
    if (f.email && !EMAIL_RX.test(f.email)) { err.textContent = 'That email address does not look right.'; $('#awCEmail').focus(); return; }
    set('localStorage', 'aureum_web_contact', { name: f.name, email: f.email, phone: f.phone });
    f.subject = 'Contact request'; var body = f.message.length >= 5 ? f.message : 'Please contact me. (No message left.)'; f.message = body;
    var btn = $('#awCGo'); btn.disabled = true; err.textContent = '';
    rpc('support_web_create_ticket', { p_name: f.name, p_email: f.email || null, p_phone: f.phone || null, p_business: f.business || null, p_subject: f.subject, p_category: 'question', p_body: body, p_transcript: null, p_website: f.hp || null })
      .then(function () {
        $('#awCForm').innerHTML = '<div class="aw-dlg-head"><h3 id="awCTitle">Thank you</h3><button type="button" class="aw-x" id="awCClose2" aria-label="Close">✕</button></div><p class="aw-ok" role="status">We have your details. The AUREUM team will contact you' + (f.email ? ' at ' + esc(f.email) : f.phone ? ' on ' + esc(f.phone) : '') + '.</p><button type="button" class="aw-btn" id="awCDone">Close</button>';
        $('#awCClose2').addEventListener('click', close); $('#awCDone').addEventListener('click', close);
      })
      .catch(function (e) { btn.disabled = false; if (isDown(e)) err.innerHTML = downMsg(e, f, 'This form'); else err.textContent = clean(e.message) || 'Sorry, your details could not be sent. Please try again.'; });
  }
  dlg.addEventListener('click', function (e) { if (e.target === dlg && dlg.close) dlg.close(); });

  /* ---------- entry points ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-aw-open]'); if (!a) return;
    e.preventDefault(); var what = a.getAttribute('data-aw-open');
    if (what === 'contact') openContact(); else if (what === 'faq') openPanel('ask'); else openPanel('live');
  });
  renderChat();
  if (location.hash === '#chat') openPanel('live'); else if (location.hash === '#contact') openContact();
  if (live) { peekLive(); peekTimer = setInterval(peekLive, 20000); }
})();
