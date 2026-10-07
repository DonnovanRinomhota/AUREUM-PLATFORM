/* AUREUM Bot engine — finds the best answer in the built-in help library (kb.js).
   Pure JavaScript: no AI, no internet, no network calls of any kind. It copes with plurals, typos and synonyms
   ("store"/"shop", "delete"/"remove"), says how sure it is, and hands over to a support ticket when it isn't. */
(function(root){
const STOP = new Set(('a an the of in on at to for from with by and or but if then than so as is are was were be been being am do does did done have has had having ' +
  'i me my mine you your yours we our us it its this that these those there here can could would should will shall may might must please pls kindly just also very really ' +
  'aureum app system software want need like help tell show give let know get got how what where when why which who whom whose about into onto over under up down out off again more most some any all ' +
  'bot thing things way able between one ones once something not put use using used going go goes says say said ask asking asked mean means meaning work works increase raise higher many ' +
  'whats wheres hows whos theres heres thats lets im ive').split(/\s+/));
// phrases that mean one word (applied to lowercase text before splitting into words)
const PHRASES = [
  [/\b(can ?not|can'?t|cant|couldn'?t|couldnt|won'?t|wont|doesn'?t|doesnt|isn'?t|isnt|don'?t|dont|didn'?t|didnt|unable to|not able to|not working|does not work|doesn'?t work|stopped working|not showing|not appearing|no longer)\b/g, ' problem '],
  [/\b(log ?in|sign ?in|log on|signing in|logging in)\b/g, ' signin '], [/\b(log ?out|sign ?out)\b/g, ' signout '],
  [/\b(money back|give back money|pay back)\b/g, ' refund '], [/\bpoint of sale\b/g, ' till '], [/\bback ?office\b/g, ' backoffice '],
  [/\b(no|without|lost|losing|loses|lose) (the )?(internet|wi-?fi|connection|network|data connection)\b/g, ' offline '], [/\b(internet|wi-?fi|network) (is )?(down|off|gone|drops?|dropped|goes down)\b/g, ' offline '],
  [/\bstock[- ]?take\b/g, ' stocktake '], [/\bgoods received( note)?s?\b/g, ' grn '], [/\bpurchase orders?\b/g, ' po '], [/\bpin code\b/g, ' pin '],
  [/\be[- ]?mail\b/g, ' email '], [/\beco ?cash\b/g, ' ecocash '], [/\b(tax[- ]free|zero[- ]rated|tax exempt|vat exempt|no tax)\b/g, ' taxfree '],
  [/\bcash ?up\b/g, ' closeshift '], [/\bend of (the )?day\b/g, ' close day '], [/\b(turn|switch|set) (it )?off\b/g, ' disable '], [/\b(turn|switch|set) (it )?on\b/g, ' enable '],
  [/\bfree trial\b/g, ' trial '], [/\bsplit (the )?(payment|bill|pay)s?\b/g, ' splitpay '], [/\bhalf (in )?cash\b/g, ' splitpay '], [/\bvoid(ed|ing)?\b/g, ' remove '],
  [/\b(should(n'?t| not)|do(es)?n'?t need to|must not) (have|charge|include|pay|add) (any )?(vat|tax|gst)\b/g, ' taxfree '], [/\bwithout (vat|tax|gst)\b/g, ' taxfree '],
  [/\b(lots? of|loads? of|a lot of|hundreds of|thousands of)\b/g, ' bulk '],
  [/\b(from (my |the )?(old|previous|other|another|existing) (system|software|pos|program|app|spreadsheet)|migrat(e|ing|ion))\b/g, ' import '],
  [/\b(running out|run out|runs out|ran out|almost (finished|out|gone|empty)|nearly (finished|out|gone|empty)|about to run out|finishing)\b/g, ' low stock '],
  [/\b(percentage|percent|% )\b/g, ' percent '],
  [/\b(opening|starting|initial|beginning) (cash|balance|amount|money|float|till|change)\b/g, ' float ']
];
const stem = w => {
  if(w.length > 3){
    if(/ies$/.test(w) && w.length > 4) w = w.slice(0, -3) + 'y';
    else if(/(ss|us|is)$/.test(w)) { /* keep */ }
    else if(/(sses|xes|ches|shes)$/.test(w)) w = w.slice(0, -2);
    else if(/s$/.test(w)) w = w.slice(0, -1);
    if(/ing$/.test(w) && w.length > 5) w = w.slice(0, -3); else if(/ed$/.test(w) && w.length > 4) w = w.slice(0, -2);
    if(w.length > 3 && /e$/.test(w)) w = w.slice(0, -1);
  }
  return w;
};
const GROUPS = [
  ['add','create','make','register','insert'], ['remove','delete','erase','discard','deactivate','void'], ['edit','change','update','modify','amend','alter'],
  ['shop','store','branch','outlet','location'], ['product','item','article'], ['employee','staff','worker','personnel'], ['till','pos','register','checkout'],
  ['refund','reimburse','return'], ['discount','promo','promotion','markdown'], ['print','printer','printing','printed'], ['barcode','scanner','scan','qr'], ['tax','vat','gst'],
  ['subscription','subscribe','plan','membership'], ['pay','payment','paid','paying'], ['stock','inventory'], ['customer','client','shopper','buyer'], ['supplier','vendor'],
  ['excel','xlsx','xls','spreadsheet'], ['export','download'], ['close','finish','closeshift'], ['start','begin'], ['problem','issue','bug','trouble','error','broken','fail','failed','failing'],
  ['wrong','incorrect','mistake','mistaken'], ['negative','minus'], ['phone','cellphone','smartphone'], ['tablet','ipad'], ['picture','photo','image','pic'], ['password','passcode'],
  ['sale','sell','sold','selling','sales','transaction'], ['receipt','slip'], ['profit','margin'], ['disable','hide'], ['enable','show'], ['cashier','clerk'],
  ['quantity','qty'], ['logo','brand'], ['trial','demo'], ['another','second','extra','additional','third'], ['view','see','look','display'], ['fee','bill','charge'], ['percent','rate']
];
const SYN = {};
GROUPS.forEach(g => { const c = stem(g[0]); g.forEach(a => { SYN[stem(a)] = c; }); });
const canon = raw => { const s = stem(raw); return SYN[s] || s; };
function words(text){
  let t = ' ' + String(text || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/\$/g, ' dollar ') + ' ';
  PHRASES.forEach(([rx, to]) => { t = t.replace(rx, to); });
  t = t.replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ');
  return t.split(' ').filter(Boolean);
}
const tokensOf = text => words(text).filter(w => !STOP.has(w)).map(canon).filter(w => w && w !== 'dollar');
function lev(a, b, max){      // edit distance where swapping two neighbouring letters counts as ONE mistake
  if(Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for(let i = 1; i <= a.length; i++){
    const cur = [i]; let best = i;
    for(let j = 1; j <= b.length; j++){
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if(prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v; if(v < best) best = v;
    }
    if(best > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}
const swapped = (a, b) => { if(a.length !== b.length) return false; const d = []; for(let i = 0; i < a.length; i++) if(a[i] !== b[i]) d.push(i); return d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]]; };
// questions made only of filler words once cleaned, so they are matched as whole sentences
const DIRECT = [
  [/^(what is|whats|explain|describe|tell me about|about|what does)( the)?( this| aureum| the system| the software| the app| the platform| it| the program)( software| system| app| platform| program)?( do| to me| for me)?$|^what are the (different )?parts( of( the)?( aureum| system| software| app))?$|^explain aureum( to me)?$/, 'what-is-aureum'],
  [/^(how (do|can|could|would|should) (i|we|you)|how to|where (do|can) i) (send|create|open|submit|raise|make|write|log|start|get) (a |an |my |the )?(support )?ticket( to (the )?(team|support|aureum))?$/, 'contact-support'],
  [/\b(report|tell|inform|notify|let) (you|the team|support|aureum|someone)\b.*\b(bug|problem|issue|error)\b|\b(found|have|got|spotted) a (bug|glitch)\b|^(how (do|can) i )?report a (bug|problem|issue|glitch)$/, 'contact-support'],
  [/^(can|could|may|would) (i|we) (ask for|request|suggest|get|have) (a |an |some )?(new|extra|different|another|better|custom|more)\b/, 'feature-request']
];
const RX = {
  greet: /^(hi|hello|hey|hie|howdy|yo|hiya|good (morning|afternoon|evening|day)|greetings)( there| aureum)?$/,
  thanks: /^(ok |okay |great |cool )?(thanks|thank you|thankyou|thx|cheers|much appreciated|awesome|perfect|brilliant|nice one|great)( a lot| so much| very much| again)?$/,
  bye: /^(bye|goodbye|good bye|see you|cya|that is all|thats all)$/,
  yes: /^(yes|yeah|yep|yup|sure|ok|okay|it did|that helped|that worked|helpful|got it|it helped|solved)( thanks| thank you)?$/,
  no: /^(no|nope|nah|not really|that didnt help|didnt help|not what i asked|not helpful|still stuck|still problem|doesnt help)$/,
  human: /(talk|speak|chat|connect|escalate|transfer|put me through)( me)? (to|with) (a |an |the |some ?one |your |real |live |customer )?(human|person|agent|someone|somebody|representative|support|team|member|service|people)|real person|live agent|human agent|real human|customer (service|care)|(create|open|make|send|submit|raise|log|start|write) (a |an |my )?(support )?ticket|contact (support|aureum|you|the team|someone)|get in touch|(call|phone) (you|support|aureum)|support (team|agent|staff)/,
  about: /^(are you|r u|are u|who are you|what are you|who is this|what is this bot|what is aureum bot)\b|what can you (do|answer|help)|how can you help|what do you know|what can i ask|what questions|how do you work|are you (a )?(real|human|ai|robot|bot)|do you use ai|is this ai/,
  aboutFirst: /^(are you|r u|are u|who are you|what are you|do you use ai|is this ai)\b/,
  company: /\b(founded|founder|who (made|built|created|owns|owner|runs)|which company|headquarter|where (are|is) (you|aureum) (based|located)|company (name|address|number|registration)|how old is aureum|encrypt|encryption|gdpr|privacy policy|terms (and|&) conditions|security certificate)\b/,
  more: /^(more|tell me more|more details|details|explain|explain more|elaborate|go on|and|what else|how|why|steps|next|then what)$/
};
function create(lib, opts){
  opts = opts || {};
  const KB = lib.KB, N = KB.length;
  const docs = KB.map(e => {
    const tTitle = tokensOf(e.title), tQ = e.q.map(tokensOf), tKw = tokensOf(e.kw || ''), tAns = tokensOf(e.a);
    const strong = new Set([...tTitle, ...tQ.flat(), ...tKw]), weak = new Set(tAns);
    const bigrams = new Set();
    [tTitle, ...tQ].forEach(seq => { for(let i = 0; i + 1 < seq.length; i++) bigrams.add(seq[i] + ' ' + seq[i + 1]); });
    const phrases = [tTitle, ...tQ].map(a => new Set(a));
    const core = new Set([...tTitle, ...tQ.flat()]);
    return { e, strong, weak, bigrams, phrases, core, title: new Set(tTitle), spec: 1 / (1 + Math.max(0, strong.size - 20) * 0.012) };
  });
  const df = new Map(), vocab = new Map();
  docs.forEach(d => { new Set([...d.strong, ...d.weak]).forEach(t => df.set(t, (df.get(t) || 0) + 1)); d.strong.forEach(t => vocab.set(t, true)); d.weak.forEach(t => vocab.set(t, true)); });
  const idf = t => Math.log(1 + N / (df.get(t) || 1)), maxIdf = Math.log(1 + N);
  docs.forEach(d => { d.phraseW = d.phrases.map(ph => [...ph].reduce((a, t) => a + idf(t), 0) || 1); });
  const vocabList = [...new Set([...vocab.keys(), ...Object.keys(SYN)])];
  const STOPLIST = [...STOP].filter(w => w.length >= 3);
  // a typo of a filler word means a doubled last letter ("howw") or two swapped letters ("wnat") — nothing else
  const stopish = w => STOP.has(w) || (!vocab.has(w) && !vocab.has(canon(w)) && !SYN[stem(w)] && w.length >= 4 && STOPLIST.some(x => w === x + x[x.length - 1] || swapped(w, x)));
  const byId = new Map(KB.map(e => [e.id, e]));
  const ans = e => (opts.storeMode && e.pay && e.store) ? e.store : e.a;
  const brief = id => { const e = byId.get(id); return e ? { id: e.id, title: e.title } : null; };
  const related = e => (e.rel || []).map(brief).filter(Boolean).slice(0, 4);
  const pack = (type, e, extra) => Object.assign({ type, id: e ? e.id : null, title: e ? e.title : null, text: e ? ans(e) : '', related: e ? related(e) : [], choices: [], ticket: !!(e && e.human), confidence: 1 }, extra || {});
  function fix(t){      // correct a typo to the closest word the library knows (never a word it already knows)
    if(vocab.has(t) || t.length < 4 || /^\d+$/.test(t)) return t;
    const max = t.length >= 9 ? 2 : 1; let best = null, bd = max + 1, bdf = 0;
    for(const v of vocabList){
      if(v[0] !== t[0] && max === 1) continue;
      if(!vocab.has(v) && v.length < 6) continue;                    // a synonym spelling is only a typo target when it is a longer word
      if(t.length === 4 && !(v.length === 4 && lev(t, v, 1) === 1 && swapped(t, v))) continue;     // 4-letter words: only an adjacent swap
      const d = lev(t, v, max); if(d < bd || (d === bd && (df.get(v) || 0) > bdf)){ bd = d; best = v; bdf = df.get(v) || 0; }
    }
    return best && bd <= max ? (SYN[best] || best) : t;
  }
  function search(text, ctx){
    const qtoks = words(text).filter(w => !stopish(w) && !/^\d+$/.test(w)).map(canon).filter(w => w && w !== 'dollar').map(fix);
    const toks = [...new Set(qtoks)];
    if(!toks.length) return { toks, ranked: [] };
    const bi = []; const seq = qtoks; for(let i = 0; i + 1 < seq.length; i++) bi.push(seq[i] + ' ' + seq[i + 1]);
    const total = toks.reduce((s, t) => s + (vocab.has(t) ? idf(t) : maxIdf * 1.2), 0) || 1;
    const wt = t => vocab.has(t) ? idf(t) : maxIdf * 1.2;
    const fscore = (ph, pw) => { let m = 0; toks.forEach(t => { if(ph.has(t)) m += wt(t); }); if(!m) return 0; const P = m / pw, Rc = m / total; return 2 * P * Rc / (P + Rc); };
    const ranked = docs.map(d => {
      let m = 0, th = 0;
      toks.forEach(t => { const w = vocab.has(t) ? idf(t) : 0; if(d.strong.has(t)) m += w; else if(d.weak.has(t)) m += w * 0.35; if(d.title.has(t)) th += w; });
      const cov = m / total, bg = bi.length ? bi.filter(b => d.bigrams.has(b)).length / bi.length : 0;
      const page = ctx && ctx.page && d.e.pages && d.e.pages.includes(ctx.page) ? 0.10 : 0;
      let sim = 0; d.phrases.forEach((ph, i) => { const f = fscore(ph, d.phraseW[i]); if(f > sim) sim = f; });
      let cm = 0; toks.forEach(t => { if(d.core.has(t)) cm += vocab.has(t) ? idf(t) : 0; });
      return { e: d.e, cov, sim, ccov: cm / total, rank: 0.32 * cov * d.spec + 0.53 * sim + 0.10 * bg + 0.05 * (th / total) + page };
    }).sort((a, b) => b.rank - a.rank);
    return { toks, ranked };
  }
  function reply(raw, ctx){
    ctx = ctx || {};
    const text = String(raw || '').trim();
    const norm = words(text).join(' ');
    const mk = (type, t, extra) => Object.assign({ type, text: t, id: null, related: [], choices: [], ticket: false, confidence: 1 }, extra || {});
    if(!norm) return mk('empty', 'Type a question about using AUREUM, or pick a topic below.', { confidence: 0 });
    if(RX.greet.test(norm)) return mk('greeting', 'Hello! What would you like to know about AUREUM? Type a question, or pick a topic below.');
    if(RX.thanks.test(norm)) return mk('thanks', "You're welcome! Ask me anything else about AUREUM any time.");
    if(RX.bye.test(norm)) return mk('thanks', "Goodbye! I'm here whenever you need help.");
    if(ctx.lastId && RX.yes.test(norm)) return mk('thanks', 'Glad that helped! Anything else?');
    if(ctx.lastId && RX.no.test(norm)){
      const e = byId.get(ctx.lastId), alts = e ? related(e).slice(0, 3) : [];
      return mk('sorry', alts.length ? 'Sorry about that. Maybe one of these is closer — or I can send your question to the AUREUM team.' : 'Sorry about that. I can send your question to the AUREUM team.', { related: alts, ticket: true, confidence: 0 });
    }
    if(RX.company.test(norm)) return mk('none', "I only know how to use AUREUM, so I can't answer that. If you need an answer from the team, I can help you send a ticket.", { ticket: true, confidence: 0 });
    for(const [rx, id] of DIRECT) if(rx.test(norm) && byId.has(id)) return pack('answer', byId.get(id));
    if(!RX.aboutFirst.test(norm) && RX.human.test(norm)) return mk('human', "Of course. I'll help you send this to the AUREUM team — press the button below, add the details, and they'll reply inside your ticket.", { ticket: true });
    if(RX.about.test(norm)) return mk('about', "I'm **AUREUM Bot**, the built-in guide. I'm **not a live AI**: I answer from AUREUM's own help library, with no internet connection needed, and I can't see or change your shop's data.\n\nAsk me how to do something — for example *\"How do I close my shift?\"* — or pick a topic. If I can't answer, I'll help you send a **ticket** to the AUREUM team.");
    if(ctx.lastId && RX.more.test(norm)){
      const e = byId.get(ctx.lastId);
      if(e) return pack('related', e, { text: related(e).length ? 'Related topics:' : "That's everything I have on that. Want me to send a question to the AUREUM team?", ticket: !related(e).length });
    }
    const { toks, ranked } = search(text, ctx);
    if(!toks.length) return mk('none', "I didn't catch a question there. Try something like *\"How do I add a product?\"*, or pick a topic below.", { confidence: 0 });
    const top = ranked[0], second = ranked[1];
    const linked = new Set([...(top.e.rel || []), top.e.id]);
    const close = ranked.filter(r => r.rank >= top.rank - 0.05 && r.cov >= 0.6 && r.ccov >= 0.6 && !(linked.has(r.e.id) && r.e.id !== top.e.id)).slice(0, 4);
    // a vague question ("how do I add one?") is settled by the screen the person is on, when it singles out exactly one candidate
    const here = ctx.page ? close.filter(r => r.e.pages && r.e.pages.includes(ctx.page)) : [];
    if(top.cov >= 0.6 && toks.length <= 2 && close.length >= 2 && here.length === 1) return pack('answer', here[0].e, { confidence: top.cov });
    if(top.cov >= 0.6 && toks.length <= 2 && close.length >= 2 && second.rank >= top.rank - 0.05)
      return mk('choices', 'I can help with a few things like that — which one do you mean?', { choices: close.map(r => ({ id: r.e.id, title: r.e.title })), confidence: top.cov });
    if(top.cov >= 0.7 && top.sim >= 0.5) return pack('answer', top.e, { confidence: top.cov });
    if(top.cov >= 0.46 && top.sim >= 0.3){
      const alts = ranked.slice(1, 4).filter(r => r.cov >= 0.3).slice(0, 2).map(r => ({ id: r.e.id, title: r.e.title }));
      return pack('maybe', top.e, { confidence: top.cov, ticket: true, text: 'I think you\'re asking about **' + top.e.title.replace(/\*/g, '') + '**:\n\n' + ans(top.e), choices: alts });
    }
    const near = ranked.slice(0, 3).filter(r => r.cov >= 0.28).map(r => ({ id: r.e.id, title: r.e.title }));
    return mk('none', "I couldn't find an answer to that in my help library." + (near.length ? ' These might be close:' : ' You can pick a topic below, or I can send your question to the AUREUM team.'), { choices: near, ticket: true, confidence: top.cov });
  }
  return {
    reply, search, entry: id => byId.get(id) || null, answerById: id => { const e = byId.get(id); return e ? pack('answer', e) : null; },
    topics: () => lib.TOPICS.map(t => ({ topic: t, entries: KB.filter(e => e.topic === t).map(e => ({ id: e.id, title: e.title })) })).filter(t => t.entries.length),
    popular: () => (lib.POPULAR || []).map(brief).filter(Boolean), size: N
  };
}
const api = { create, tokensOf };
if(typeof module !== 'undefined' && module.exports) module.exports = api; else root.AureumBotEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
