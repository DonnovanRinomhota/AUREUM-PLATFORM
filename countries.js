/* AUREUM — countries, their usual currency and time zone, a flag + search country picker, and the time-zone switch.
   Shared by the Back Office sign-up / Settings and the till. Pure browser code, no network needed except the small flag pictures. */
(function(root){
'use strict';
/* [ISO code, name, predominant currency, main time zone]  — where a country has several zones the capital's zone is used;
   the owner can always change both in Settings. */
const RAW = [
['DZ','Algeria','DZD','Africa/Algiers'],['AO','Angola','AOA','Africa/Luanda'],['BJ','Benin','XOF','Africa/Porto-Novo'],['BW','Botswana','BWP','Africa/Gaborone'],['BF','Burkina Faso','XOF','Africa/Ouagadougou'],['BI','Burundi','BIF','Africa/Bujumbura'],['CV','Cabo Verde','CVE','Atlantic/Cape_Verde'],['CM','Cameroon','XAF','Africa/Douala'],['CF','Central African Republic','XAF','Africa/Bangui'],['TD','Chad','XAF','Africa/Ndjamena'],['KM','Comoros','KMF','Indian/Comoro'],['CG','Congo','XAF','Africa/Brazzaville'],['CD','Congo (DR)','CDF','Africa/Kinshasa'],['CI',"Côte d'Ivoire",'XOF','Africa/Abidjan'],['DJ','Djibouti','DJF','Africa/Djibouti'],['EG','Egypt','EGP','Africa/Cairo'],['GQ','Equatorial Guinea','XAF','Africa/Malabo'],['ER','Eritrea','ERN','Africa/Asmara'],['SZ','Eswatini','SZL','Africa/Mbabane'],['ET','Ethiopia','ETB','Africa/Addis_Ababa'],['GA','Gabon','XAF','Africa/Libreville'],['GM','Gambia','GMD','Africa/Banjul'],['GH','Ghana','GHS','Africa/Accra'],['GN','Guinea','GNF','Africa/Conakry'],['GW','Guinea-Bissau','XOF','Africa/Bissau'],['KE','Kenya','KES','Africa/Nairobi'],['LS','Lesotho','LSL','Africa/Maseru'],['LR','Liberia','LRD','Africa/Monrovia'],['LY','Libya','LYD','Africa/Tripoli'],['MG','Madagascar','MGA','Indian/Antananarivo'],['MW','Malawi','MWK','Africa/Blantyre'],['ML','Mali','XOF','Africa/Bamako'],['MR','Mauritania','MRU','Africa/Nouakchott'],['MU','Mauritius','MUR','Indian/Mauritius'],['MA','Morocco','MAD','Africa/Casablanca'],['MZ','Mozambique','MZN','Africa/Maputo'],['NA','Namibia','NAD','Africa/Windhoek'],['NE','Niger','XOF','Africa/Niamey'],['NG','Nigeria','NGN','Africa/Lagos'],['RW','Rwanda','RWF','Africa/Kigali'],['ST','São Tomé and Príncipe','STN','Africa/Sao_Tome'],['SN','Senegal','XOF','Africa/Dakar'],['SC','Seychelles','SCR','Indian/Mahe'],['SL','Sierra Leone','SLE','Africa/Freetown'],['SO','Somalia','SOS','Africa/Mogadishu'],['ZA','South Africa','ZAR','Africa/Johannesburg'],['SS','South Sudan','SSP','Africa/Juba'],['SD','Sudan','SDG','Africa/Khartoum'],['TZ','Tanzania','TZS','Africa/Dar_es_Salaam'],['TG','Togo','XOF','Africa/Lome'],['TN','Tunisia','TND','Africa/Tunis'],['UG','Uganda','UGX','Africa/Kampala'],['ZM','Zambia','ZMW','Africa/Lusaka'],['ZW','Zimbabwe','USD','Africa/Harare'],
['AL','Albania','ALL','Europe/Tirane'],['AD','Andorra','EUR','Europe/Andorra'],['AT','Austria','EUR','Europe/Vienna'],['BY','Belarus','BYN','Europe/Minsk'],['BE','Belgium','EUR','Europe/Brussels'],['BA','Bosnia and Herzegovina','BAM','Europe/Sarajevo'],['BG','Bulgaria','EUR','Europe/Sofia'],['HR','Croatia','EUR','Europe/Zagreb'],['CY','Cyprus','EUR','Asia/Nicosia'],['CZ','Czechia','CZK','Europe/Prague'],['DK','Denmark','DKK','Europe/Copenhagen'],['EE','Estonia','EUR','Europe/Tallinn'],['FI','Finland','EUR','Europe/Helsinki'],['FR','France','EUR','Europe/Paris'],['DE','Germany','EUR','Europe/Berlin'],['GR','Greece','EUR','Europe/Athens'],['HU','Hungary','HUF','Europe/Budapest'],['IS','Iceland','ISK','Atlantic/Reykjavik'],['IE','Ireland','EUR','Europe/Dublin'],['IT','Italy','EUR','Europe/Rome'],['XK','Kosovo','EUR','Europe/Belgrade'],['LV','Latvia','EUR','Europe/Riga'],['LI','Liechtenstein','CHF','Europe/Vaduz'],['LT','Lithuania','EUR','Europe/Vilnius'],['LU','Luxembourg','EUR','Europe/Luxembourg'],['MT','Malta','EUR','Europe/Malta'],['MD','Moldova','MDL','Europe/Chisinau'],['MC','Monaco','EUR','Europe/Monaco'],['ME','Montenegro','EUR','Europe/Podgorica'],['NL','Netherlands','EUR','Europe/Amsterdam'],['MK','North Macedonia','MKD','Europe/Skopje'],['NO','Norway','NOK','Europe/Oslo'],['PL','Poland','PLN','Europe/Warsaw'],['PT','Portugal','EUR','Europe/Lisbon'],['RO','Romania','RON','Europe/Bucharest'],['RU','Russia','RUB','Europe/Moscow'],['SM','San Marino','EUR','Europe/San_Marino'],['RS','Serbia','RSD','Europe/Belgrade'],['SK','Slovakia','EUR','Europe/Bratislava'],['SI','Slovenia','EUR','Europe/Ljubljana'],['ES','Spain','EUR','Europe/Madrid'],['SE','Sweden','SEK','Europe/Stockholm'],['CH','Switzerland','CHF','Europe/Zurich'],['UA','Ukraine','UAH','Europe/Kyiv'],['GB','United Kingdom','GBP','Europe/London'],['VA','Vatican City','EUR','Europe/Vatican'],
['AF','Afghanistan','AFN','Asia/Kabul'],['AM','Armenia','AMD','Asia/Yerevan'],['AZ','Azerbaijan','AZN','Asia/Baku'],['BH','Bahrain','BHD','Asia/Bahrain'],['BD','Bangladesh','BDT','Asia/Dhaka'],['BT','Bhutan','BTN','Asia/Thimphu'],['BN','Brunei','BND','Asia/Brunei'],['KH','Cambodia','KHR','Asia/Phnom_Penh'],['CN','China','CNY','Asia/Shanghai'],['GE','Georgia','GEL','Asia/Tbilisi'],['HK','Hong Kong','HKD','Asia/Hong_Kong'],['IN','India','INR','Asia/Kolkata'],['ID','Indonesia','IDR','Asia/Jakarta'],['IR','Iran','IRR','Asia/Tehran'],['IQ','Iraq','IQD','Asia/Baghdad'],['IL','Israel','ILS','Asia/Jerusalem'],['JP','Japan','JPY','Asia/Tokyo'],['JO','Jordan','JOD','Asia/Amman'],['KZ','Kazakhstan','KZT','Asia/Almaty'],['KW','Kuwait','KWD','Asia/Kuwait'],['KG','Kyrgyzstan','KGS','Asia/Bishkek'],['LA','Laos','LAK','Asia/Vientiane'],['LB','Lebanon','LBP','Asia/Beirut'],['MO','Macao','MOP','Asia/Macau'],['MY','Malaysia','MYR','Asia/Kuala_Lumpur'],['MV','Maldives','MVR','Indian/Maldives'],['MN','Mongolia','MNT','Asia/Ulaanbaatar'],['MM','Myanmar','MMK','Asia/Yangon'],['NP','Nepal','NPR','Asia/Kathmandu'],['KP','North Korea','KPW','Asia/Pyongyang'],['OM','Oman','OMR','Asia/Muscat'],['PK','Pakistan','PKR','Asia/Karachi'],['PS','Palestine','ILS','Asia/Gaza'],['PH','Philippines','PHP','Asia/Manila'],['QA','Qatar','QAR','Asia/Qatar'],['SA','Saudi Arabia','SAR','Asia/Riyadh'],['SG','Singapore','SGD','Asia/Singapore'],['KR','South Korea','KRW','Asia/Seoul'],['LK','Sri Lanka','LKR','Asia/Colombo'],['SY','Syria','SYP','Asia/Damascus'],['TW','Taiwan','TWD','Asia/Taipei'],['TJ','Tajikistan','TJS','Asia/Dushanbe'],['TH','Thailand','THB','Asia/Bangkok'],['TL','Timor-Leste','USD','Asia/Dili'],['TR','Türkiye','TRY','Europe/Istanbul'],['TM','Turkmenistan','TMT','Asia/Ashgabat'],['AE','United Arab Emirates','AED','Asia/Dubai'],['UZ','Uzbekistan','UZS','Asia/Tashkent'],['VN','Vietnam','VND','Asia/Ho_Chi_Minh'],['YE','Yemen','YER','Asia/Aden'],
['AG','Antigua and Barbuda','XCD','America/Antigua'],['AR','Argentina','ARS','America/Argentina/Buenos_Aires'],['BS','Bahamas','BSD','America/Nassau'],['BB','Barbados','BBD','America/Barbados'],['BZ','Belize','BZD','America/Belize'],['BO','Bolivia','BOB','America/La_Paz'],['BR','Brazil','BRL','America/Sao_Paulo'],['CA','Canada','CAD','America/Toronto'],['CL','Chile','CLP','America/Santiago'],['CO','Colombia','COP','America/Bogota'],['CR','Costa Rica','CRC','America/Costa_Rica'],['CU','Cuba','CUP','America/Havana'],['DM','Dominica','XCD','America/Dominica'],['DO','Dominican Republic','DOP','America/Santo_Domingo'],['EC','Ecuador','USD','America/Guayaquil'],['SV','El Salvador','USD','America/El_Salvador'],['GD','Grenada','XCD','America/Grenada'],['GT','Guatemala','GTQ','America/Guatemala'],['GY','Guyana','GYD','America/Guyana'],['HT','Haiti','HTG','America/Port-au-Prince'],['HN','Honduras','HNL','America/Tegucigalpa'],['JM','Jamaica','JMD','America/Jamaica'],['MX','Mexico','MXN','America/Mexico_City'],['NI','Nicaragua','NIO','America/Managua'],['PA','Panama','USD','America/Panama'],['PY','Paraguay','PYG','America/Asuncion'],['PE','Peru','PEN','America/Lima'],['PR','Puerto Rico','USD','America/Puerto_Rico'],['KN','Saint Kitts and Nevis','XCD','America/St_Kitts'],['LC','Saint Lucia','XCD','America/St_Lucia'],['VC','Saint Vincent and the Grenadines','XCD','America/St_Vincent'],['SR','Suriname','SRD','America/Paramaribo'],['TT','Trinidad and Tobago','TTD','America/Port_of_Spain'],['US','United States','USD','America/New_York'],['UY','Uruguay','UYU','America/Montevideo'],['VE','Venezuela','VES','America/Caracas'],
['AU','Australia','AUD','Australia/Sydney'],['FJ','Fiji','FJD','Pacific/Fiji'],['KI','Kiribati','AUD','Pacific/Tarawa'],['MH','Marshall Islands','USD','Pacific/Majuro'],['FM','Micronesia','USD','Pacific/Pohnpei'],['NR','Nauru','AUD','Pacific/Nauru'],['NZ','New Zealand','NZD','Pacific/Auckland'],['PW','Palau','USD','Pacific/Palau'],['PG','Papua New Guinea','PGK','Pacific/Port_Moresby'],['WS','Samoa','WST','Pacific/Apia'],['SB','Solomon Islands','SBD','Pacific/Guadalcanal'],['TO','Tonga','TOP','Pacific/Tongatapu'],['TV','Tuvalu','AUD','Pacific/Funafuti'],['VU','Vanuatu','VUV','Pacific/Efate']
];
const list = RAW.map(r => ({ code:r[0], name:r[1], currency:r[2], tz:r[3] })).sort((a,b) => a.name.localeCompare(b.name));
const byCode = {}; list.forEach(c => { byCode[c.code] = c; });
const AFRICA = new Set('DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW'.split(' '));

const flagUrl = (code, w) => 'https://flagcdn.com/w' + (w || 40) + '/' + String(code).toLowerCase() + '.png';
const flagEmoji = code => String(code).toUpperCase().replace(/./g, ch => String.fromCodePoint(127397 + ch.charCodeAt(0)));
function flagHtml(code, w){
  w = w || 24;
  return '<img class="cp-flag" src="' + flagUrl(code, w <= 24 ? 40 : 80) + '" data-code="' + String(code).toUpperCase() + '" width="' + w + '" height="' + Math.round(w * 0.75) + '" alt="" loading="lazy">';
}

/* currency symbols/names come from the browser, so every currency works without a hand-kept list */
const SYMBOL_FIX = { ZWG:'ZWG ', USD:'$', ZAR:'R', EUR:'€', GBP:'£' };
function symbolFor(cur){
  if(SYMBOL_FIX[cur]) return SYMBOL_FIX[cur];
  try{
    const p = new Intl.NumberFormat('en', { style:'currency', currency:cur, currencyDisplay:'narrowSymbol' }).formatToParts(0).find(x => x.type === 'currency');
    const v = p ? p.value : cur;
    return /^[A-Za-z]{2,}$/.test(v) ? v + ' ' : v;       // letters (e.g. ZMW, TZS) get a space before the amount
  }catch(e){ return cur + ' '; }
}
function currencyName(cur){ try{ return new Intl.DisplayNames(['en'], { type:'currency' }).of(cur) || cur; }catch(e){ return cur; } }
function allCurrencies(){
  let codes = [];
  try{ codes = Intl.supportedValuesOf('currency'); }catch(e){}
  const must = ['USD','ZWG','ZAR','EUR','GBP','ZMW','TZS','NGN','KES','UGX','GHS','BWP','NAD','MZN','MWK','XOF','XAF','EGP','MAD','ETB','RWF','AOA'];
  const set = new Set(codes.concat(must, list.map(c => c.currency)));
  return [...set].sort();
}
function allTimezones(){
  let z = [];
  try{ z = Intl.supportedValuesOf('timeZone'); }catch(e){}
  const set = new Set(z.concat(list.map(c => c.tz), ['UTC']));
  return [...set].sort();
}
function tzLabel(z){
  let off = '';
  try{ off = new Intl.DateTimeFormat('en-US', { timeZone:z, timeZoneName:'shortOffset' }).formatToParts(new Date()).find(p => p.type === 'timeZoneName').value; }catch(e){}
  return z.replace(/_/g, ' ') + (off ? ' (' + off + ')' : '');
}

/* ---- time zone: every date/time the app SHOWS follows the business's time zone (stored times stay exact UTC) ---- */
let TZ = '';
const orig = { ls: Date.prototype.toLocaleString, ld: Date.prototype.toLocaleDateString, lt: Date.prototype.toLocaleTimeString };
function wrap(fn, defaults){ return function(loc, opts){ if(TZ && !(opts && opts.timeZone)){ opts = Object.assign({}, opts || {}, { timeZone: TZ }); } return fn.call(this, loc, opts); }; }
Date.prototype.toLocaleString = wrap(orig.ls); Date.prototype.toLocaleDateString = wrap(orig.ld); Date.prototype.toLocaleTimeString = wrap(orig.lt);
function setTimezone(z){ try{ if(z){ new Intl.DateTimeFormat('en', { timeZone:z }); TZ = z; } else TZ = ''; }catch(e){ TZ = ''; } }

/* ---- country picker: a button showing the flag + name; opens a search box and a scrolling list ---- */
/* if a flag picture can't load (offline), show the two-letter country code instead — done here because inline onerror attributes are blocked */
document.addEventListener('error', e => {
  const t = e.target;
  if(t && t.tagName === 'IMG' && t.classList && t.classList.contains('cp-flag')){ const sp = document.createElement('span'); sp.className = 'cp-flag-fb'; sp.textContent = t.dataset.code || ''; t.replaceWith(sp); }
}, true);
let cssDone = false;
function css(){
  if(cssDone) return; cssDone = true;
  const st = document.createElement('style');
  st.textContent = '.cp{position:relative;width:100%}.cp-btn{width:100%;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;font:inherit}.cp-btn .cp-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cp-btn .cp-car{opacity:.6;font-size:10px}'
    + '.cp-panel{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:2000;background:var(--panel-alt,#16301f);border:1px solid var(--line-strong,#3a5a45);border-radius:12px;box-shadow:0 18px 44px rgba(0,0,0,.55);padding:8px;display:none}.cp.open .cp-panel{display:block}'
    + '.cp-search{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid var(--line-strong,#3a5a45);background:var(--panel,#10261a);color:var(--ivory,#f4efe2);font:inherit;font-size:14px;outline:none}'
    + '.cp-list{max-height:min(260px,40vh);overflow-y:auto;margin-top:6px;-webkit-overflow-scrolling:touch}.cp-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;color:var(--ivory-dim,#e6e0cf);font-size:13.5px}'
    + '.cp-item:hover,.cp-item.hl{background:var(--panel,#22402e)}.cp-item .cp-cur{margin-left:auto;font-size:11px;opacity:.65}.cp-flag{border-radius:2px;object-fit:cover;flex:0 0 auto;box-shadow:0 0 0 1px rgba(255,255,255,.15)}.cp-flag-fb{display:inline-block;min-width:24px;text-align:center;font-size:10px;font-weight:700;opacity:.8}.cp-empty{padding:14px;text-align:center;opacity:.7;font-size:13px}';
  document.head.appendChild(st);
}
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function mountPicker(host, opts){
  css(); opts = opts || {};
  let value = opts.value || '', hl = 0, shown = list;
  host.classList.add('cp');
  host.innerHTML = '<button type="button" class="cp-btn ' + (opts.btnClass || '') + '" aria-haspopup="listbox" aria-expanded="false"></button><div class="cp-panel"><input class="cp-search" type="search" placeholder="Search country…" aria-label="Search country" autocomplete="off"><div class="cp-list" role="listbox"></div></div>';
  const btn = host.querySelector('.cp-btn'), panel = host.querySelector('.cp-panel'), search = host.querySelector('.cp-search'), box = host.querySelector('.cp-list');
  const label = () => { const c = byCode[value]; btn.innerHTML = c ? flagHtml(c.code, 24) + '<span class="cp-name">' + c.name + '</span><span class="cp-car">&#9662;</span>' : '<span class="cp-name" style="opacity:.65">' + (opts.placeholder || 'Select your country') + '</span><span class="cp-car">&#9662;</span>'; };
  const draw = () => {
    box.innerHTML = shown.length ? shown.map((c, i) => '<div class="cp-item' + (i === hl ? ' hl' : '') + '" role="option" data-c="' + c.code + '">' + flagHtml(c.code, 24) + '<span>' + c.name + '</span><span class="cp-cur">' + c.currency + '</span></div>').join('') : '<div class="cp-empty">No country matches “' + search.value.replace(/[<>&]/g, '') + '”</div>';
    const h = box.querySelector('.hl'); if(h && h.scrollIntoView) h.scrollIntoView({ block:'nearest' });
  };
  const open = () => { host.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); search.value = ''; shown = list; hl = Math.max(0, list.findIndex(c => c.code === value)); draw(); setTimeout(() => search.focus(), 0); };
  const close = () => { host.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
  const pick = code => { value = code; label(); close(); if(opts.onChange) opts.onChange(byCode[code]); };
  btn.addEventListener('click', () => host.classList.contains('open') ? close() : open());
  search.addEventListener('input', () => { const q = norm(search.value).trim(); shown = q ? list.filter(c => norm(c.name).includes(q) || c.code.toLowerCase() === q || c.currency.toLowerCase() === q)
        .map(c => { const nm = norm(c.name); return { c, r: nm.startsWith(q) ? 0 : nm.split(/[\s-]+/).some(w => w.startsWith(q)) ? 1 : (c.code.toLowerCase() === q || c.currency.toLowerCase() === q) ? 2 : 3 }; })
        .sort((a, b) => a.r - b.r).map(x => x.c) : list; hl = 0; draw(); });   // names that START with the typed text come first
  search.addEventListener('keydown', e => {
    if(e.key === 'ArrowDown'){ e.preventDefault(); hl = Math.min(shown.length - 1, hl + 1); draw(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); hl = Math.max(0, hl - 1); draw(); }
    else if(e.key === 'Enter'){ e.preventDefault(); if(shown[hl]) pick(shown[hl].code); }
    else if(e.key === 'Escape'){ e.preventDefault(); close(); btn.focus(); }
  });
  box.addEventListener('click', e => { const it = e.target.closest('.cp-item'); if(it) pick(it.dataset.c); });
  document.addEventListener('click', e => { if(!host.contains(e.target)) close(); });
  label();
  return { get value(){ return value; }, set(code){ value = code || ''; label(); }, open, close };
}

root.AureumCountries = { list, byCode, isAfrica: c => AFRICA.has(c), flagHtml, flagEmoji, symbolFor, currencyName, allCurrencies, allTimezones, tzLabel, setTimezone, getTimezone: () => TZ, mountPicker };
})(typeof window !== 'undefined' ? window : globalThis);
