/* AUREUM Guide — POS journeys. Steps point at real till elements and read real till state (the ticket, the receipts list,
   which pop-ups are open). Nothing here adds items, takes a payment or creates a receipt: the person does, or it doesn't happen. */
(function(){
'use strict';
var G = window.AureumGuide; if(!G) return;
var $ = function(id){ return document.getElementById(id); };
var esc = G.esc;

/* ---- reading the till ---- */
function role(){ try{ return activeEmployee ? activeEmployee.role : ''; }catch(e){ return ''; } }
function canMgr(){ try{ return canManage(); }catch(e){ return false; } }
function shopHasProducts(){ try{ return PRODUCTS.some(function(p){ return productInShop(p, activeShop); }); }catch(e){ return false; } }
function cartQty(){ try{ return Object.keys(cart).reduce(function(t, k){ return t + (cart[k] || 0); }, 0); }catch(e){ return 0; } }
function receiptCount(){ try{ return RECEIPTS.length; }catch(e){ return 0; } }
function isOpen(id){ var el = $(id); return !!(el && el.classList.contains('open')); }
function txt(id){ var el = $(id); return el ? el.textContent.trim() : ''; }
function isPhone(){ return window.matchMedia && window.matchMedia('(max-width:900px)').matches && !!$('cartBar') && getComputedStyle($('cartBar')).display !== 'none' || document.body.classList.contains('ticket-open'); }
function view(which){   // phones show either the catalog or the ticket
  var cb = $('cartBar'), phone = cb && getComputedStyle(cb).display !== 'none' || document.body.classList.contains('ticket-open');
  if(!phone) return;
  document.body.classList.toggle('ticket-open', which === 'ticket');
}
function closeAllPopups(){ ['recentSalesOverlay', 'receiptOverlay', 'shiftOverlay', 'customerOverlay', 'discountOverlay', 'noteOverlay'].forEach(function(id){ if(isOpen(id)){ try{ closeModal(id); }catch(e){} } }); }

var journeys = [

/* ---------------------------------------------------------------- A. brief orientation */
{ id: 'pos-welcome', group: 'start', title: 'Find your way around', desc: 'A 30-second look at the till: products, ticket and where things live.', roles: ['*'],
  next: function(){ return { id: 'pos-first-sale', label: 'Complete your first sale' }; },
  steps: [
    { id: 'hello', title: 'Welcome to AUREUM', body: 'The till has two halves: <b>products on the left</b>, the <b>sale on the right</b>. This takes about 30 seconds and changes nothing.', nextLabel: 'Show me' },
    { id: 'search', target: '.catalog-search', title: 'Find products', body: 'Search by <b>name, SKU or barcode</b>. A barcode scanner types straight into this box.', placement: 'bottom', before: function(){ view('catalog'); } },
    { id: 'grid', target: '#productGrid', title: 'Product tiles', body: 'Each tile shows the <b>price</b> and how many are <b>In Stock</b> at this shop. Tap a tile to add it to the sale.', placement: 'top', before: function(){ view('catalog'); } },
    { id: 'ticket', target: '.ticket-wrap', title: 'The current ticket', body: 'The sale you are building. Items, <b>subtotal, tax and total</b>, the payment method and <b>Complete Sale</b> are all here.', placement: 'left', before: function(){ view('ticket'); } },
    { id: 'shop', target: '#shiftBtn', title: 'Your shop and shift', body: 'Sales are recorded against the <b>shop</b> and <b>shift</b> you started. Tap here to see the shift, or to close it at the end of your day.', placement: 'bottom', before: function(){ view('catalog'); } },
    { id: 'recent', target: '#recentSalesBtn', title: 'Recent sales', body: 'Today\'s sales for this shop live here, including receipts.', placement: 'bottom' },
    { id: 'backoffice', target: '#backOfficeBtn', title: 'Back Office', body: 'Products, stock, reports and settings are in the <b>Back Office</b>. You can see this button because your role allows it.', placement: 'bottom', when: function(){ return $('backOfficeBtn') && $('backOfficeBtn').style.display !== 'none'; } }
  ] },

/* ---------------------------------------------------------------- B. first sale */
{ id: 'pos-first-sale', group: 'start', title: 'Complete your first sale', desc: 'Search, add items, check the totals and take payment — with you in control the whole time.', roles: ['*'],
  next: function(c){ return { id: 'pos-receipts', label: 'Find a receipt' }; },
  prereq: function(){
    if(shopHasProducts()) return null;
    return { title: 'No products to sell yet', message: 'There are no products at <b>' + esc(typeof activeShop === 'string' ? activeShop : 'this shop') + '</b> yet, so there is nothing to ring up. ' + (canMgr() ? 'Add some in <b>Back Office → Products</b>, then come back to this guide.' : 'Ask a manager to add products in the Back Office, then come back to this guide.'),
      action: canMgr() ? { label: 'Open Back Office', run: function(){ var b = $('backOfficeBtn'); if(b) b.click(); } } : null };
  },
  steps: [
    { id: 'intro', title: 'Let\'s complete a sale together', body: 'We\'ll go through a real sale one step at a time. <b>Nothing is charged</b> unless you press Complete Sale yourself — you can stop before that.', nextLabel: 'Start', before: function(){ closeAllPopups(); view('catalog'); } },
    { id: 'search', target: '#searchInput', title: 'Find a product', body: 'Type part of a product <b>name, SKU or barcode</b>. If you have a scanner, scan straight into this box or press <b>Scan barcode</b>.', placement: 'bottom',
      before: function(){ view('catalog'); },
      done: function(){ var q = ($('searchInput').value || '').trim(); return (q.length > 0 && !!document.querySelector('#productGrid .card[data-id]')) || cartQty() > 0; }, doneText: 'Found it', waitText: 'Type a few letters of a product name…',
      help: function(){ var q = ($('searchInput').value || '').trim(); if(q && !document.querySelector('#productGrid .card[data-id]')) return 'No product matches “' + esc(q) + '” at this shop. Check the spelling, try fewer letters or the SKU, or clear the box to see everything. If a barcode finds nothing, the product may not have that barcode saved yet — a manager can add it in Back Office → Products.'; return null; } },
    { id: 'category', target: '#categories', title: 'Browse by category', body: 'Prefer browsing? <b>Category chips</b> narrow the tiles. <b>Sort</b> (right) orders them by sales, name or quantity.', placement: 'bottom', before: function(){ view('catalog'); } },
    { id: 'add', target: '#productGrid', title: 'Add it to the ticket', body: 'Tap a product tile. Check the <b>price</b> and the <b>In Stock</b> number on it first — if stock shows a minus, more was sold than recorded and a manager should correct the stock.', placement: 'top',
      before: function(){ view('catalog'); }, snap: function(){ return cartQty(); },
      done: function(c, snap){ return cartQty() > snap; }, doneText: 'Added to the ticket', waitText: 'Tap a product tile…',
      help: function(c, snap){ var n = document.querySelectorAll('#productGrid .card[data-id]').length; if(!n) return 'No products are showing — clear the search box (or choose the All category) to see them again.'; return null; } },
    { id: 'qty', target: '#ticketItems', title: 'Change a quantity', body: 'Your item is on the ticket. Use <b>+</b> and <b>–</b> to change the quantity, or <b>Remove</b> to take it off. Try adding one more of anything.', placement: 'left', optional: true,
      before: function(){ view('ticket'); }, snap: function(){ return cartQty(); },
      done: function(c, snap){ return cartQty() > snap; }, doneText: 'Quantity updated', waitText: 'Press + on the item, or add another product.' },
    { id: 'totals', target: '.ticket-totals', title: 'Understand the totals', placement: 'left', before: function(){ view('ticket'); },
      body: function(){ var incl = false; try{ incl = !!POS_SETTINGS.taxInclusive; }catch(e){}
        return 'Subtotal <b>' + esc(txt('subtotalVal')) + '</b> · Discount <b>' + esc(txt('discountVal')) + '</b> · Tax <b>' + esc(txt('taxVal')) + '</b> · <b>Total ' + esc(txt('totalVal')) + '</b>.<br>' + (incl ? 'Your prices <b>include</b> tax, so tax is part of the price, not added on top.' : 'Tax is <b>added on top</b> of the prices.') + ' The Total is what the customer pays.'; } },
    { id: 'extras', target: '.quick-chips', title: 'Customer, discount, note', body: 'Optional. <b>Add customer</b> attaches the sale to a customer, <b>Discount</b> takes a percentage or amount off (it may need a manager\'s permission), and <b>Note</b> adds a remark that appears on the receipt. Nothing here is needed for a normal sale.', placement: 'left', before: function(){ view('ticket'); } },
    { id: 'pay', target: '#payMethods', title: 'Choose how they pay', body: 'Pick <b>Cash, Card, Mobile or Split</b>. Cash asks for the amount received. <b>Split</b> lets the customer combine methods (for example part cash, part card). Card and Mobile just record the method used. Use the pause button to <b>Hold</b> a ticket and the <b>Held</b> button to bring it back.', placement: 'left', before: function(){ view('ticket'); } },
    { id: 'tender', target: ['#payMethods', '#tenderPanel'], title: 'Enter the cash received', placement: 'left', when: function(){ try{ return payMethod === 'cash'; }catch(e){ return false; } }, optional: true, before: function(){ view('ticket'); },
      body: 'For cash, type what the customer handed over (or tap a quick amount). <b>Change due</b> appears below. Cash less than the total is not accepted.',
      done: function(){ try{ return tenderedAmt > 0; }catch(e){ return false; } }, doneText: 'Amount entered', waitText: 'Enter an amount — or skip if you are only practising.' },
    { id: 'charge', target: ['#payMethods', '#tenderPanel', '#chargeBtn'], title: 'Complete the sale — only when it is real', placement: 'left', before: function(){ view('ticket'); }, snap: function(){ return receiptCount(); },
      body: '<b>Complete Sale records a real sale</b>: it reduces stock, saves a receipt and counts in your shift. Press it only when the customer has paid.<br>Just practising? Choose <b>Finish without selling</b> — then clear the ticket with the ✕ (Void) button if you like.',
      actions: [{ label: 'Finish without selling', finish: true }],
      done: function(c, snap){ return receiptCount() > snap; }, doneText: 'Sale recorded', delay: 600, waitText: 'Waiting for you to press Complete Sale…',
      onNext: function(c, run){ run.saleDone = true; },
      help: function(){ var b = $('chargeBtn'); if(!b) return null;
        if(b.classList.contains('disabled')) return 'Complete Sale is greyed out because the ticket is empty. Add a product first.';
        try{ if(payMethod === 'cash'){ if(!tenderedAmt) return 'Cash needs an amount: enter the cash received above, then press Complete Sale.'; var due = tenderDueAmount(computeTotals().total); if(tenderedAmt < due - 0.001) return 'The cash received is less than the amount due. Enter at least the total.'; } }catch(e){}
        return null; } },
    { id: 'receipt', target: '#receiptOverlay .modal-panel', title: 'The sale is complete', placement: 'left', when: function(c, run){ return !!run.saleDone && isOpen('receiptOverlay'); },
      body: 'This is the <b>real receipt</b> for the sale you just made, with the cashier, items, tax and total. You can print or email it here. <b>New Sale</b> clears the screen for the next customer.' },
    { id: 'close', target: '#receiptCloseBtn', title: 'Start the next sale', placement: 'top', when: function(c, run){ return !!run.saleDone && isOpen('receiptOverlay'); },
      body: 'Press <b>New Sale</b> to continue. You can always find this receipt again under <b>Recent sales</b>.', done: function(){ return !isOpen('receiptOverlay'); }, doneText: 'Ready for the next customer' }
  ] },

/* ---------------------------------------------------------------- D. receipts */
{ id: 'pos-receipts', group: 'start', title: 'Find a receipt', desc: 'Open today\'s sales, find a receipt and read it.', roles: ['*'],
  next: function(){ return { id: 'pos-signout', label: 'Learn to sign out safely' }; },
  steps: [
    { id: 'open', target: '#recentSalesBtn', title: 'Open recent sales', body: 'This lists <b>today\'s sales at this shop</b>.', placement: 'bottom', before: function(){ closeAllPopups(); view('catalog'); },
      done: function(){ return isOpen('recentSalesOverlay'); }, doneText: 'Opened', waitText: 'Press the ↻ button…' },
    { id: 'list', target: '#recentSalesSub', title: 'Today at a glance', placement: 'bottom', body: function(){ return 'The line shows how many sales and refunds there were today and the net amount. Older receipts are in <b>Back Office → Receipts</b>' + (canMgr() ? '.' : ' (managers can open it).'); } },
    { id: 'pick', target: '#recentSalesBody .sale-row', title: 'Open a receipt', body: 'Each row is one sale: number, time, items, amount and how it was paid. <b>Tap a row</b> to open its receipt.', placement: 'bottom', when: function(){ return !!document.querySelector('#recentSalesBody .sale-row'); },
      done: function(){ return isOpen('receiptOverlay'); }, doneText: 'Receipt open', waitText: 'Tap a sale…' },
    { id: 'empty', target: '#recentSalesBody', title: 'No sales yet today', body: 'Nothing has been sold at this shop today, so there is no receipt to open. Complete a sale (see <b>Complete your first sale</b>) and it will appear here.', placement: 'bottom', when: function(){ return !document.querySelector('#recentSalesBody .sale-row'); } },
    { id: 'read', target: '#receiptOverlay .modal-panel', title: 'Reading the receipt', placement: 'left', when: function(){ return isOpen('receiptOverlay'); },
      body: function(){ var a = []; [['receiptEmailBtn', 'email it'], ['thermalPrintBtn', 'print it'], ['receiptRefundBtn', 'refund items (if you are allowed to)']].forEach(function(p){ var b = $(p[0]); if(b && b.offsetParent !== null && getComputedStyle(b).display !== 'none') a.push(p[1]); });
        return 'The receipt shows what was sold, the tax, the total, how it was paid and who rang it up.' + (a.length ? ' From here you can ' + a.join(', ') + '.' : '') + ' Refunds are recorded as their own receipts — the original is never altered.'; } },
    { id: 'closeit', target: '#receiptCloseBtn', title: 'Close the receipt', body: 'When you have finished reading, press <b>Close</b>.', placement: 'top', when: function(){ return isOpen('receiptOverlay'); }, done: function(){ return !isOpen('receiptOverlay'); }, doneText: 'Closed', waitText: 'Press Close…' }
  ] },

/* ---------------------------------------------------------------- C. stock on the till */
{ id: 'pos-stock', group: 'more', title: 'Understand stock on the till', desc: 'What "In Stock" means, and how to spot items running low.', roles: ['*'],
  prereq: function(){ return shopHasProducts() ? null : { title: 'No products yet', message: 'There are no products at this shop, so there is no stock to look at yet.' }; },
  steps: [
    { id: 'tile', target: '#productGrid', title: 'Reading a product tile', placement: 'top', before: function(){ closeAllPopups(); view('catalog'); },
      body: 'Each tile shows the product\'s <b>price at this shop</b> and <b>In Stock</b> — the quantity AUREUM currently has recorded here. A <b>negative</b> number means more has been sold than was recorded as received. Don\'t work around it: tell a manager so stock can be corrected in the Back Office.' },
    { id: 'sort', target: '#catalogSort', title: 'Find what is running low', body: 'Choose <b>Quantity: low → high</b> to bring the lowest stock to the top.', placement: 'bottom',
      done: function(){ var v = $('catalogSort').value; return v === 'qtylo'; }, doneText: 'Lowest stock first', waitText: 'Open the Sort list and choose Quantity: low → high…' },
    { id: 'what', target: '#productGrid', title: 'What to do about low stock', placement: 'top', body: 'Low stock is fixed by <b>receiving goods</b> or a <b>stock adjustment</b> in the Back Office — the till only sells. If you spot a problem, tell your manager.' }
  ] },

/* ---------------------------------------------------------------- H. signing out */
{ id: 'pos-signout', group: 'more', title: 'Close your shift and sign out safely', desc: 'Where to finish your shift and sign out of the till.', roles: ['*'],
  steps: [
    { id: 'first', title: 'Before you sign out', body: 'Finish or clear any sale in progress first, so no half-built ticket is left on the screen. Closing this guide does <b>not</b> sign you out.', nextLabel: 'Continue', before: function(){ closeAllPopups(); view('catalog'); } },
    { id: 'open', target: '#clerkSwitch', title: 'Open your shift menu', body: 'Tap your name here.', placement: 'bottom', done: function(){ return isOpen('shiftOverlay'); }, doneText: 'Opened', waitText: 'Tap your name…' },
    { id: 'signout', target: '#spSignOut', title: 'Sign out', placement: 'top', when: function(){ return isOpen('shiftOverlay'); },
      body: '<b>Sign out — my shift stays open</b> returns the till to the sign-in screen; the next person at this shop carries on with the same shift. You won\'t be signed out unless you press it yourself.' },
    { id: 'close', target: '#spClose', title: 'End of day: close the shift', placement: 'top', when: function(){ return isOpen('shiftOverlay') && !!$('spClose'); },
      body: '<b>Close my shift…</b> counts the cash in the drawer and ends the shift. It needs a manager\'s or administrator\'s PIN. Do this at the end of your work period, not between customers.',
      onNext: function(){ try{ closeModal('shiftOverlay'); }catch(e){} } }
  ] }
];

/* ---- wiring ---- */
function who(){ try{ return activeEmployee ? String(activeEmployee.name || '') : ''; }catch(e){ return ''; } }
function metaKey(){ return 'pos:' + who(); }
G.init({
  app: 'pos',
  journeys: journeys,
  launcher: '#guideBtn',
  modalSel: '.modal-overlay.open',
  scope: function(){ var u = ''; try{ u = (currentUser && currentUser.id) || ''; }catch(e){} return u + ':' + who(); },
  context: function(){ return { role: role(), shop: (typeof activeShop === 'string' ? activeShop : ''), hasProducts: shopHasProducts() }; },
  remote: {
    load: function(){ try{ var m = currentUser && currentUser.user_metadata && currentUser.user_metadata.aureum_guide; return m && m[metaKey()] || null; }catch(e){ return null; } },
    save: function(d){ try{
      if(!(supaReady && sb) || !currentUser || !who()) return;
      var k = metaKey();
      /* read the latest copy first so the other app's progress (stored beside this one) is never overwritten by a stale tab */
      sb.auth.getUser().then(function(r){
        var u = r && r.data && r.data.user, all = Object.assign({}, (u && u.user_metadata && u.user_metadata.aureum_guide) || (currentUser.user_metadata && currentUser.user_metadata.aureum_guide) || {}); all[k] = d;
        return sb.auth.updateUser({ data: { aureum_guide: all } });
      }).then(function(r){ if(r && r.data && r.data.user) currentUser.user_metadata = r.data.user.user_metadata; }).catch(function(){});
    }catch(e){} }
  },
  links: [{ label: 'Till help', desc: 'Existing quick help for this till.', run: function(){ try{ openModal('helpOverlay'); }catch(e){} } }]
});
/* progress belongs to the person at the till: reload it whenever a different cashier signs in */
window.AureumGuidePos = {
  signedIn: function(){
    G.reload();
    /* first sign-in on this till: go straight into the highlighted tour (like the Back Office) — it needs no products, so brand-new accounts get it too */
    setTimeout(function(){ if(who()) G.maybeWelcome({ journey: 'pos-welcome', auto: true }); }, 900);
  }
};
})();
