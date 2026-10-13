/* AUREUM Guide — Back Office journeys. Each step points at a real, stable element and is completed by real application
   state (which page is open, what is in the form, whether the record really got saved). Journeys that create records
   say so before the final button, and always offer a way out that creates nothing. */
(function(){
'use strict';
var G = window.AureumGuide; if(!G) return;
var $ = function(id){ return document.getElementById(id); };
var esc = G.esc;

function navEl(page){ return document.querySelector('.nav-item[data-page="' + page + '"]'); }
function can(page){ return G.visible(navEl(page)); }            // a page the person's role cannot open is never offered
function page(){ try{ return currentPage; }catch(e){ return ''; } }
function go(p){ var n = navEl(p); if(n && page() !== p) n.click(); }
function isOpen(id){ var el = $(id); return !!(el && el.classList.contains('open')); }
function shown(id){ return G.visible($(id)); }
function hasProducts(){ try{ return PRODUCTS.length > 0; }catch(e){ return false; } }
function noProducts(){ return hasProducts() ? null : { title: 'Add a product first', message: 'This guide uses your products, and there are none yet. Open <b>Products → Add Product</b> to create your first one, then come back.', action: can('products') ? { label: 'Show me how to add a product', run: function(){ G.start('bo-products'); } } : null }; }
function closePopups(){ ['detailModal'].forEach(function(id){ if(isOpen(id)){ try{ closeModal(id); }catch(e){} } }); }
/* a short "area" tour: open the screen, point at its main control, say what it is for */
function area(id, pageId, title, desc, steps, extra){
  var j = { id: id, group: 'more', title: title, desc: desc, roles: ['*'], available: function(){ return can(pageId); }, steps: [
    { id: 'open', target: '.nav-item[data-page="' + pageId + '"]', title: 'Open ' + title.replace(/^(Learn about |Explore |Understand )/, ''), body: 'Click it in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === pageId; }, doneText: 'Opened', waitText: 'Click the highlighted menu item…' }
  ].concat(steps) };
  if(extra) Object.keys(extra).forEach(function(k){ j[k] = extra[k]; });
  return j;
}

var journeys = [

/* ---------------------------------------------------------------- A/E. orientation + dashboard */
{ id: 'bo-welcome', group: 'start', title: 'Explore the Back Office', desc: 'The menu, the dashboard numbers, stock alerts and where to go next.', roles: ['*'],
  next: function(){ return can('employees') ? { id: 'bo-till-login', label: 'Create a till login before your first sale' } : (can('products') ? { id: 'bo-products', label: 'Add or edit a product' } : { id: 'bo-receipts', label: 'Review your sales' }); },
  steps: [
    { id: 'hello', title: 'Welcome to the Back Office', body: 'This is where you <b>manage</b> the business. Sales are rung up in the <b>POS</b>; everything behind them — products, stock, reports, settings — lives here. This tour only points things out.', nextLabel: 'Show me', before: function(){ closePopups(); if(page() !== 'dashboard') go('dashboard'); } },
    { id: 'menu', target: '#navGroup', title: 'The menu', placement: 'right', body: '<b>Sales Tracking &amp; Visualisation</b>, <b>Product Entry &amp; Inventory Management</b> and <b>Control Panel</b>.' },
    { id: 'shop', target: '#sidebarShopTrigger', title: 'Which shop are you viewing?', placement: 'right', body: 'Choose <b>All Shops</b> or a single shop. Stock, sales and reports follow this choice, so check it before reading any number.' },
    { id: 'kpis', target: '#kpiRow', title: 'The four numbers', placement: 'bottom', before: function(){ go('dashboard'); },
      body: '<b>Gross Sales</b>: everything sold, tax included, before refunds. <b>Net Sales</b>: gross sales minus refunds. <b>Cost of Sales</b>: what the items you sold cost you (the cost saved on each sale). <b>Gross Profit</b>: net sales minus the sales tax you collected minus cost of sales. Use the shop and date controls above to change what they cover.' },
    { id: 'alerts', target: '#alertsPanel', title: 'Alerts: what needs attention', placement: 'top', before: function(){ go('dashboard'); },
      body: function(){ var neg = document.querySelector('#alertsList [data-alert="neg"]'), low = document.querySelector('#alertsList [data-alert="low"]');
        return '<b>Negative stock</b> means more was sold than was ever recorded as received; <b>low stock</b> means an item is running out. Click an alert to open the list. Fix negative stock by recording the missing delivery on <b>Goods Received</b> or correcting it with a <b>Stock Adjustment</b> — never by ignoring it.'; } },
    { id: 'pos', target: '#openPosBtn', title: 'Ready to sell?', placement: 'right', when: function(){ return shown('openPosBtn'); }, body: '<b>Ready To Sell ? Switch To POS Check-Out</b> opens the till in a new tab. Your guide progress is kept in both.' },
    { id: 'guide', target: '#guideBtn', title: 'Your guide is always here', placement: 'right', body: 'Open <b>Guide</b> any time to start, pause or restart a walkthrough. Short guides for Receipts, Products and stock tasks are listed there.' }
  ] },

/* ---------------------------------------------------------------- F. products */
{ id: 'bo-products', group: function(c){ return c.hasProducts ? 'more' : 'start'; }, title: 'Add or edit a product', desc: 'Name, price, cost and stock per shop — and what is saved when you press Save.', roles: ['*'],
  available: function(){ return can('products'); },
  steps: [
    { id: 'open', target: '.nav-item[data-page="products"]', title: 'Open Products', body: 'Click <b>Products</b> in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'products'; }, doneText: 'Opened', waitText: 'Click Products…' },
    { id: 'list', target: '#productTableBody', title: 'Your product list', placement: 'top', when: function(){ return hasProducts(); }, body: 'Each row shows the product\'s price, cost and <b>stock</b>. Use the search and the shop and category filters above to find one. <b>Product history</b> (top right) shows every stock figure typed directly on a product.' },
    { id: 'add', target: '#addProductBtn', title: 'Add a product', placement: 'bottom', body: 'Press <b>Add Product</b>. (To change an existing product, click its row instead.)', before: function(){ if(!shown('addProductBtn')) go('products'); }, done: function(){ return shown('pfName'); }, doneText: 'Form open', waitText: 'Press Add Product…', missing: 'The Add Product button is not available for your role.' },
    { id: 'name', target: '#pfName', title: 'Name the product', placement: 'bottom', body: 'Use the name your staff will search for at the till, for example “Sparkling Water 500ml”.', done: function(){ return ($('pfName').value || '').trim().length > 1; }, doneText: 'Named', waitText: 'Type the product name…' },
    { id: 'price', target: '#pfPrice', title: 'Set the selling price', placement: 'bottom', body: 'The price the customer pays. A shop can have its <b>own price</b> further down.', done: function(){ var v = parseFloat($('pfPrice').value); return v > 0; }, doneText: 'Price set', waitText: 'Type a price above 0…' },
    { id: 'cost', target: '#pfCost', title: 'What does it cost you?', placement: 'bottom', optional: true, body: 'Your cost per item. Profit and stock value use this, so it is worth entering. Leave it empty if you don\'t know yet — <b>Reports → Data Check</b> will remind you.', done: function(){ return ($('pfCost').value || '') !== ''; }, doneText: 'Cost saved' },
    { id: 'shops', target: '#pfShopTable', title: 'Shops, prices and stock', placement: 'top', body: 'Tick the shops that sell this product. For each shop you can set its own <b>Price</b> and <b>Cost</b> (leave empty to use the regular ones) and the <b>Stock on hand</b>. Stock typed here is logged in Product history; later deliveries should go through <b>Goods Received</b>.' },
    { id: 'save', target: '#productSaveBtn', title: 'Save', placement: 'top', snap: function(){ try{ return PRODUCTS.length; }catch(e){ return 0; } },
      body: '<b>Saving creates a real product</b> that appears on the till straight away. Not ready? Choose <b>Finish without saving</b> and close the form — nothing is created.',
      actions: [{ label: 'Finish without saving', finish: true }],
      done: function(c, snap){ try{ return PRODUCTS.length > snap; }catch(e){ return false; } }, doneText: 'Product saved',
      help: function(){ if(!($('pfName').value || '').trim()) return 'A product needs a name before it can be saved.'; var v = parseFloat($('pfPrice').value); if(!(v >= 0)) return 'Enter a price (0 or more).'; return null; } }
  ] },

/* ---------------------------------------------------------------- D. receipts */
{ id: 'bo-receipts', group: 'start', title: 'Review sales and receipts', desc: 'Filter sales, open a receipt and read it.', roles: ['*'], available: function(){ return can('sales'); },
  next: function(){ return can('products') ? { id: 'bo-products', label: 'Add or edit a product' } : null; },
  steps: [
    { id: 'open', target: '.nav-item[data-page="sales"]', title: 'Open Receipts', body: 'Click <b>Receipts</b>.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'sales'; }, doneText: 'Opened', waitText: 'Click Receipts…' },
    { id: 'filters', target: '#rcpShopFilter', title: 'Narrow it down', placement: 'bottom', body: 'Use the <b>date</b>, <b>shop</b>, customer, employee and type filters to find the sales you want. The totals and chart above the table follow these filters.' },
    { id: 'pick', target: '#rcpTableBody .rcp-view', title: 'Open a receipt', placement: 'left', when: function(){ return !!document.querySelector('#rcpTableBody .rcp-view'); },
      body: 'Each row is one sale. Click <b>VIEW</b> to open its receipt.', done: function(){ return isOpen('detailModal'); }, doneText: 'Receipt open', waitText: 'Click a receipt row…' },
    { id: 'none', target: '#rcpTableBody', title: 'No receipts for this filter', placement: 'top', when: function(){ return !document.querySelector('#rcpTableBody .rcp-view'); }, body: 'Nothing matches the current filters (or nothing has been sold yet). Widen the date range, or make a sale at the POS and it will appear here.' },
    { id: 'read', target: '#detailModal .modal-panel', title: 'Reading the receipt', placement: 'left', when: function(){ return isOpen('detailModal'); }, body: 'Items, tax, total, payment method and cashier. Refunds appear as their own receipts and never alter the original sale.' },
    { id: 'close', target: '#detailModal [data-close="detailModal"]', title: 'Close it', body: 'Press <b>Close</b> when you have finished reading.', placement: 'top', when: function(){ return isOpen('detailModal'); }, done: function(){ return !isOpen('detailModal'); }, doneText: 'Closed', waitText: 'Close the receipt…' }
  ] },

/* ---------------------------------------------------------------- stock alerts */
{ id: 'bo-stock-alerts', group: 'more', title: 'Understand stock alerts', desc: 'What low and negative stock mean, and exactly what to do about them.', roles: ['*'], available: function(){ return can('dashboard'); },
  steps: [
    { id: 'alerts', target: '#alertsPanel', title: 'Where alerts appear', placement: 'top', before: function(){ closePopups(); go('dashboard'); }, body: 'The dashboard lists items with <b>negative</b> and <b>low</b> stock. Click an alert to open the full list in <b>Reports</b>.' },
    { id: 'neg', target: '#alertsPanel', title: 'Negative stock', placement: 'top', body: 'More was sold than the system had recorded as received. Find out why (a delivery that was never entered, or a miscount), then record it on <b>Goods Received</b> or correct it with a <b>Stock Adjustment</b>. Don\'t ignore it — profit and valuation are off until it is fixed.' },
    { id: 'low', target: '#alertsPanel', title: 'Low stock', placement: 'top', body: 'An item is below its low-stock level. Reorder it with a <b>Purchase Order</b>, and record the delivery on <b>Goods Received</b> when it arrives. Each product can have its own level in its form.' }
  ] },

/* ---------------------------------------------------------------- inventory operations */
{ id: 'bo-receive-goods', group: 'more', title: 'Receive goods (add stock)', desc: 'Record a delivery so stock and cost are right.', roles: ['*'], available: function(){ return can('goods-received'); }, prereq: noProducts,
  steps: [
    { id: 'open', target: '.nav-item[data-page="goods-received"]', title: 'Open Goods Received', body: 'Click it in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'goods-received'; }, doneText: 'Opened', waitText: 'Click Goods Received…' },
    { id: 'new', target: '#addGrnBtn', title: 'Start a goods received note', placement: 'bottom', body: 'Press <b>Add GRN</b>. A GRN records a delivery that has <b>physically arrived</b>.', done: function(){ return shown('grnSaveBtn'); }, doneText: 'Form open', waitText: 'Press the button…' },
    { id: 'shop', target: '#grnShop', title: 'Which shop received it?', placement: 'bottom', body: 'Choose the shop where the goods arrived. <b>Stock is added to this shop only.</b>' },
    { id: 'product', target: '#grnProductSearch', title: 'Add what arrived', placement: 'bottom', snap: function(){ try{ return grnLineItems.length; }catch(e){ return 0; } }, body: 'Search for a product and pick it.', done: function(c, s){ try{ return grnLineItems.length > s; }catch(e){ return false; } }, doneText: 'Added', waitText: 'Search for a product and click it…' },
    { id: 'lines', target: '#grnLineBody', title: 'Quantity, pack and cost', placement: 'top', body: 'Enter how many arrived. <b>Unit</b> lets you receive packs (a pack of 12 adds 12 items per pack). The <b>Cost</b> you type becomes this shop\'s cost for the product.' },
    { id: 'save', target: '#grnSaveBtn', title: 'Save the note', placement: 'top', snap: function(){ try{ return GRN_RECORDS.length; }catch(e){ return 0; } },
      body: '<b>Saving adds the stock for real</b> and can change the shop\'s cost. Not a real delivery? Choose <b>Finish without saving</b> and leave the form — nothing is recorded.',
      actions: [{ label: 'Finish without saving', finish: true }],
      done: function(c, s){ try{ return GRN_RECORDS.length > s; }catch(e){ return false; } }, doneText: 'Delivery recorded',
      help: function(){ try{ if(!grnLineItems.length) return 'Add at least one product first.'; if(!grnLineItems.some(function(r){ return r.qty > 0; })) return 'Each line needs a quantity above 0.'; }catch(e){} return null; } }
  ] },

{ id: 'bo-adjust', group: 'more', title: 'Adjust stock', desc: 'Correct stock after a count, damage or loss — with a reason.', roles: ['*'], available: function(){ return can('stock-adjustments'); }, prereq: noProducts,
  steps: [
    { id: 'open', target: '.nav-item[data-page="stock-adjustments"]', title: 'Open Stock Adjustments', body: 'Click it in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'stock-adjustments'; }, doneText: 'Opened', waitText: 'Click Stock Adjustments…' },
    { id: 'new', target: '#addStockAdjBtn', title: 'Start an adjustment', placement: 'bottom', body: 'Press the button to start a new adjustment.', done: function(){ return shown('saSaveBtn'); }, doneText: 'Form open', waitText: 'Press the button…' },
    { id: 'type', target: '#saType', title: 'Add, Reduce or Override', placement: 'bottom', body: '<b>Add</b> and <b>Reduce</b> change stock by the amount you type. <b>Override</b> sets stock to the number you counted. Pick the one that matches what happened.' },
    { id: 'reason', target: '#saReason', title: 'Always give a reason', placement: 'bottom', body: 'The reason (for example damaged, expired, stock count) is kept on the record so every change can be explained later.' },
    { id: 'product', target: '#saProductSearch', title: 'Choose the product', placement: 'bottom', snap: function(){ try{ return saLineItems.length; }catch(e){ return 0; } }, done: function(c, s){ try{ return saLineItems.length > s; }catch(e){ return false; } }, doneText: 'Added', waitText: 'Search for a product and click it…', body: 'Search and pick the product to adjust.' },
    { id: 'save', target: '#saSaveBtn', title: 'Save the adjustment', placement: 'top', snap: function(){ try{ return STOCK_ADJUSTMENTS.length; }catch(e){ return 0; } },
      body: '<b>Saving changes your stock for real</b> and cannot be quietly undone — the adjustment stays on record. Just looking? Choose <b>Finish without saving</b>.',
      actions: [{ label: 'Finish without saving', finish: true }],
      done: function(c, s){ try{ return STOCK_ADJUSTMENTS.length > s; }catch(e){ return false; } }, doneText: 'Adjustment recorded' }
  ] },

{ id: 'bo-transfer', group: 'more', title: 'Transfer goods between shops', desc: 'Move stock from one shop to another.', roles: ['*'], available: function(){ return can('stock-transfers') && (function(){ try{ return SHOPS.length > 1; }catch(e){ return false; } })(); }, prereq: noProducts,
  steps: [
    { id: 'open', target: '.nav-item[data-page="stock-transfers"]', title: 'Open Transfer of Goods', body: 'Click it in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'stock-transfers'; }, doneText: 'Opened', waitText: 'Click Transfer of Goods…' },
    { id: 'new', target: '#addTransferBtn', title: 'Start a transfer', placement: 'bottom', body: 'Press the button.', done: function(){ return shown('trSaveBtn'); }, doneText: 'Form open', waitText: 'Press the button…' },
    { id: 'shops', target: ['#trFromShop', '#trToShop'], title: 'From which shop, to which shop?', placement: 'bottom', body: 'Choose the shop the goods <b>leave</b> and the shop they <b>arrive</b> at. They must be different.',
      done: function(){ var a = $('trFromShop').value, b = $('trToShop').value; return !!a && !!b && a !== b; }, doneText: 'Shops chosen', waitText: 'Choose two different shops…' },
    { id: 'lines', target: '#trLineBody', title: 'Pick products and quantities', placement: 'top', body: 'Search a product in the row, then enter the quantity. You cannot move more than the sending shop has in stock — AUREUM will stop you.',
      done: function(){ try{ return trLineItems.some(function(r){ return r.productId && r.qty > 0; }); }catch(e){ return false; } }, doneText: 'Line ready', waitText: 'Choose a product and a quantity…' },
    { id: 'save', target: '#trSaveBtn', title: 'Save the transfer', placement: 'top', snap: function(){ try{ return TRANSFERS.length; }catch(e){ return 0; } },
      body: '<b>Saving moves the stock for real</b>: it leaves one shop and is added to the other, and a permanent record is kept. Choose <b>Finish without saving</b> to leave it.',
      actions: [{ label: 'Finish without saving', finish: true }],
      done: function(c, s){ try{ return TRANSFERS.length > s; }catch(e){ return false; } }, doneText: 'Transfer recorded' }
  ] },

/* ---------------------------------------------------------------- G. short area tours */

/* ---------------------------------------------------------------- till login (before the first sale) */
{ id: 'bo-till-login', group: 'start', title: 'Create a till login (owner or cashier)', desc: 'You cannot sign in at the till without one: add yourself or a cashier with a role and a 4-digit PIN.', roles: ['*'],
  available: function(){ return can('employees'); },
  next: function(){ return { id: 'bo-employee-calendar', label: 'Plan who works when' }; },
  steps: [
    { id: 'why', title: 'Before your first sale', body: 'The till signs in with a <b>name and a 4-digit PIN</b> from your Employees list. Without at least one employee who may sell, nobody can sign in. We will add one now &mdash; <b>yourself</b> (role <b>Administrator</b>) or a <b>Cashier</b>.', nextLabel: 'Let\'s do it' },
    { id: 'open', target: '.nav-item[data-page="employees"]', title: 'Open Employees', body: 'Click <b>Employees</b> in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'employees'; }, doneText: 'Employees opened' },
    { id: 'add', target: '#addEmployeeBtn', title: 'Add an employee', placement: 'bottom', body: 'Press <b>Add employee</b>.', before: function(){ if(!shown('addEmployeeBtn') && !shown('efName')) go('employees'); }, done: function(){ return shown('efName'); }, doneText: 'Form open' },
    { id: 'name', target: '#efName', title: 'Type the name', placement: 'bottom', focus: true, body: 'Click in the box and type the person\'s name, for example your own name or &ldquo;Chipo Ndlovu&rdquo;. This is the name the till will show.', done: function(){ return ($('efName').value || '').trim().length > 1; }, doneText: 'Name entered' },
    { id: 'role', target: '#efRole', title: 'Choose the role', placement: 'bottom', body: 'Pick <b>Administrator</b> for the owner (can use everything), <b>Shop Manager</b> to run a shop, or <b>Cashier</b> for someone who only sells.', nextLabel: 'Got it' },
    { id: 'shop', target: '#efShop', title: 'Which shop?', placement: 'bottom', body: 'Choose the shop this person works in.', nextLabel: 'Got it' },
    { id: 'pin', target: '#efPin', title: 'Give a 4-digit PIN', placement: 'bottom', focus: true, body: 'Click in the box and type <b>4 digits</b>. This is the PIN used to sign in at the till &mdash; no two people can share one.', done: function(){ return /^\d{4}$/.test(($('efPin').value || '').trim()); }, doneText: 'PIN entered' },
    { id: 'save', target: '#employeeSaveBtn', title: 'Save', placement: 'top', snap: function(){ try{ return EMPLOYEES.length; }catch(e){ return 0; } },
      body: '<b>Saving creates a real employee.</b> Not ready? Choose <b>Finish without saving</b> and nothing is created.',
      actions: [{ label: 'Finish without saving', finish: true }],
      done: function(c, snap){ try{ return EMPLOYEES.length > snap; }catch(e){ return false; } }, doneText: 'Employee saved' },
    { id: 'pos', target: '#openPosBtn', title: 'Ready to sell?', placement: 'right', when: function(){ return shown('openPosBtn'); }, body: 'Press <b>Ready To Sell ? Switch To POS Check-Out</b>. At the till, sign in with your business email and password, then choose the <b>shop</b>, the <b>name</b> you just added and the <b>PIN</b>.' }
  ] },

/* ---------------------------------------------------------------- employee calendar */
{ id: 'bo-employee-calendar', group: 'more', title: 'Use the Employee Calendar', desc: 'Plan who works on which day, with shop and hours, and save the schedule.', roles: ['*'],
  available: function(){ return can('employees'); },
  steps: [
    { id: 'open', target: '.nav-item[data-page="employees"]', title: 'Open Employees', body: 'Click <b>Employees</b> in the menu.', placement: 'right', before: function(){ closePopups(); }, done: function(){ return page() === 'employees'; }, doneText: 'Employees opened' },
    { id: 'tab', target: '#employeeTabs [data-etab="calendar"]', title: 'Open the Calendar tab', placement: 'bottom', body: 'Press <b>Calendar</b> (next to Employee List).', before: function(){ if(!shown('employeeTabs')) go('employees'); }, done: function(){ return shown('ecGrid'); }, doneText: 'Calendar open' },
    { id: 'grid', target: '#ecGrid', title: 'Pick a day', placement: 'right', body: 'Tap a day. Days with a <b>gold dot</b> already have a team scheduled. Use the arrows above to change month, or <b>Today</b> to come back.', nextLabel: 'Got it' },
    { id: 'add', target: '#ecAddRow', title: 'Add an employee to the day', placement: 'left', snap: function(){ return document.querySelectorAll('#ecRows .ec-row').length; }, body: 'Press <b>Add employee</b> to add a row for this day.', done: function(c, snap){ return document.querySelectorAll('#ecRows .ec-row').length > snap; }, doneText: 'Row added' },
    { id: 'name', target: '#ecRows .ec-name', title: 'Choose who works', placement: 'top', focus: true, body: 'Click the <b>Name</b> box and pick or type the employee. Their role and shop fill in by themselves. (No names? Add employees first in the Employee List.)', done: function(){ var n = document.querySelector('#ecRows .ec-name'); return !!(n && n.value.trim() && !n.classList.contains('invalid')); }, doneText: 'Employee chosen' },
    { id: 'times', target: '#ecRows .ec-row-grid', title: 'Set the hours', placement: 'top', body: 'Choose a <b>Shift</b> (Full Day, Morning&hellip;) or set <b>Start time</b> and <b>End time</b>. The hours worked are worked out for you below.', nextLabel: 'Got it' },
    { id: 'save', target: '#ecSave', title: 'Save the schedule', placement: 'top', body: '<b>Save schedule</b> stores this day. Use <b>Copy previous day</b> to repeat yesterday\'s team. Not ready? Just close the guide &mdash; nothing is saved until you press Save.', nextLabel: 'Finish' }
  ] },

area('bo-customers', 'customers', 'Learn about Customers', 'Find customers and add new ones.', [
  { id: 'add', target: '#addCustomerBtn', title: 'Add a customer', placement: 'bottom', body: 'Customers you add here can be attached to sales at the till, and their orders and spending build up over time.' }
]),
area('bo-employees', 'employees', 'Learn about Employees', 'Staff, roles and clock-in hours.', [
  { id: 'add', target: '#addEmployeeBtn', title: 'Add an employee', placement: 'bottom', body: 'Each employee has a <b>role</b> (Cashier, Shop Manager, Administrator…) and a <b>PIN</b> for the till. The role decides what they may do, including who may open the Back Office.' }
]),
area('bo-suppliers', 'suppliers', 'Learn about Suppliers', 'Who you buy from.', [
  { id: 'add', target: '#addSupplierBtn', title: 'Add a supplier', placement: 'bottom', body: 'Suppliers can be chosen on Purchase Orders and Goods Received notes so deliveries are traceable.' }
]),
area('bo-reports', 'reports', 'Explore Reports', 'Stock, valuation, expired products and the Data Check.', [
  { id: 'tabs', target: '#reportTabs', title: 'Pick a report', placement: 'bottom', body: 'Each tab is a different report. <b>Data Check</b> lists problems that quietly spoil your numbers (missing costs, cost above price, negative stock). <b>Low stock</b> and <b>Valuation</b> help with ordering.' }
]),
area('bo-settings', 'settings', 'Explore Settings', 'Business profile, currency, taxes, shops and devices.', [
  { id: 'tabs', target: '.settings-tab-item', title: 'Settings areas', placement: 'right', body: 'Business profile and <b>currency / time zone</b>, <b>taxes</b>, <b>shops</b>, <b>POS devices</b>, payments and receipts live here. Changes apply to the whole business.' }
]),

/* ---------------------------------------------------------------- H. signing out */
{ id: 'bo-signout', group: 'more', title: 'Sign out safely', desc: 'Where to sign out of the Back Office.', roles: ['*'],
  steps: [
    { id: 'first', title: 'Before you sign out', body: 'Save or leave any form you have open first — unsaved changes are lost. Closing this guide does <b>not</b> sign you out.', nextLabel: 'Continue' },
    { id: 'out', target: '#logoutBtn', title: 'Sign out', placement: 'right', body: '<b>Sign out</b> ends your session on this device. Your products, sales and guide progress stay safely with your account. You will only be signed out if you click it.' }
  ] }
];

function metaKey(){ return 'bo'; }
G.init({
  app: 'bo', journeys: journeys, launcher: '#guideBtn', modalSel: '.modal-overlay.open',
  scope: function(){ try{ return (currentUser && currentUser.id) || ''; }catch(e){ return ''; } },
  context: function(){ var r = ''; try{ r = currentRole || ''; }catch(e){} return { role: r, hasProducts: hasProducts() }; },
  remote: {
    load: function(){ try{ var m = currentUser && currentUser.user_metadata && currentUser.user_metadata.aureum_guide; return m && m[metaKey()] || null; }catch(e){ return null; } },
    save: function(d){ try{
      if(!(supaReady && sb) || !currentUser) return;
      var k = metaKey();
      /* read the latest copy first so the other app's progress (stored beside this one) is never overwritten by a stale tab */
      sb.auth.getUser().then(function(r){
        var u = r && r.data && r.data.user, all = Object.assign({}, (u && u.user_metadata && u.user_metadata.aureum_guide) || (currentUser.user_metadata && currentUser.user_metadata.aureum_guide) || {}); all[k] = d;
        return sb.auth.updateUser({ data: { aureum_guide: all } });
      }).then(function(r){ if(r && r.data && r.data.user) currentUser.user_metadata = r.data.user.user_metadata; }).catch(function(){});
    }catch(e){} }
  },
  links: [{ label: 'Ask AUREUM Bot', desc: 'Questions about the app or your numbers.', run: function(){ var f = $('helpFab'); if(f) f.click(); } }, { label: 'Help & support', desc: 'FAQs and contact the AUREUM team.', run: function(){ var h = $('helpBtn'); if(h) h.click(); } }]
});
window.AureumGuideBo = {
  ready: function(){
    G.reload();
    setTimeout(function(){ if(!hasProducts() && can('products')) G.maybeWelcome({ journey: 'bo-welcome', title: 'Welcome to AUREUM', text: 'Take a 1-minute look around the Back Office — or start with adding your first product.', cta: 'Show me around' }); else G.maybeWelcome({ journey: 'bo-welcome', title: 'Welcome to AUREUM', text: 'Take a 1-minute look around the Back Office.', cta: 'Show me around' }); }, 1200);
  },
  /* a one-time offer the first time someone opens a screen that has its own short guide */
  pageOpened: function(p){
    var map = { sales: ['bo-receipts', 'First time in Receipts? A 30-second guide shows how to find and read a sale.'], products: ['bo-products', 'First time in Products? A short guide shows how to add or edit a product.'], 'goods-received': ['bo-receive-goods', 'Receiving a delivery? A short guide walks through it step by step.'], 'stock-adjustments': ['bo-adjust', 'First stock adjustment? A short guide explains Add, Reduce and Override.'], 'stock-transfers': ['bo-transfer', 'Moving stock between shops? A short guide shows how.'] };
    var m = map[p]; if(m) setTimeout(function(){ G.hint(m[0], m[1]); }, 700);
  }
};
})();
