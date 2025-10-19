// Basic globals
let currentEventName = '';
let currentEventPrice = 0; // in KSh

/* ---------- Open payment modal immediately when user clicks Book Tickets ---------- */
/**
 * call: openPaymentForMovie(eventName, priceInKsh)
 * - shows the payment modal
 * - auto-fills pm_amount with priceInKsh * quantity (default quantity 1)
 * - pm_eventName hidden stores event movie name
 */
function openPaymentForMovie(eventName, priceInKsh) {
  currentEventName = eventName;
  currentEventPrice = Number(priceInKsh) || 0;

  // set modal visible
  const paymentModal = document.getElementById('paymentModal');
  if (!paymentModal) return;
  paymentModal.setAttribute('aria-hidden', 'false');

  // fill event name
  const eventHidden = document.getElementById('pm_eventName');
  if (eventHidden) eventHidden.value = eventName;

  // set default qty to 1
  const qtyInput = document.getElementById('pm_qty');
  if (qtyInput) qtyInput.value = 1;

  // fill form fields as necessary (empty other inputs)
  document.getElementById('pm_name').value = '';
  document.getElementById('pm_email').value = '';
  document.getElementById('pm_phone').value = '';

  // compute amount and display
  updatePaymentAmount();

  // lock scroll
  document.body.style.overflow = 'hidden';
}

/* Close payment modal */
function closePayment() {
  const paymentModal = document.getElementById('paymentModal');
  if (!paymentModal) return;
  paymentModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = 'auto';
}

/* Change quantity using +/- */
function changePaymentQty(delta) {
  const qtyInput = document.getElementById('pm_qty');
  if (!qtyInput) return;
  let v = parseInt(qtyInput.value || '1', 10);
  v = Math.min(10, Math.max(1, v + delta));
  qtyInput.value = v;
  updatePaymentAmount();
}

/* Update payment amount UI based on currentEventPrice and pm_qty */
function updatePaymentAmount() {
  const qtyInput = document.getElementById('pm_qty');
  const amountInput = document.getElementById('pm_amount');
  const amountText = document.getElementById('pm_amount_text');

  const qty = qtyInput ? Math.max(1, Math.min(10, parseInt(qtyInput.value || '1', 10))) : 1;
  const total = Math.round(currentEventPrice * qty);

  if (amountInput) amountInput.value = total;
  if (amountText) amountText.textContent = total.toLocaleString();
}

/* Submit payment form (M-Pesa STK push) */
const paymentFormModal = document.getElementById('paymentFormModal');
if (paymentFormModal) {
  paymentFormModal.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name = document.getElementById('pm_name')?.value.trim();
    const email = document.getElementById('pm_email')?.value.trim();
    const phone = document.getElementById('pm_phone')?.value.trim();
    const qty = Number(document.getElementById('pm_qty')?.value || 1);
    const amount = Number(document.getElementById('pm_amount')?.value || 0);
    const eventName = document.getElementById('pm_eventName')?.value || currentEventName;

    if (!name || !email || !phone || amount <= 0) {
      alert('Please fill in all required fields.');
      return;
    }

    // Example payload to backend: adjust endpoint as needed
    try {
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, amount, qty, eventName, currency: 'KSH'
        })
      });

      const data = await res.json();
      alert(data.message || 'Payment initiated. Check your phone for the STK prompt.');

      // close modal on success
      closePayment();
    } catch (err) {
      console.error('Payment error', err);
      alert('Failed to initiate payment. Please try again later.');
    }
  });
}

/* Ensure + / manual changes update amount */
const qtyInputLive = document.getElementById('pm_qty');
if (qtyInputLive) {
  qtyInputLive.addEventListener('input', function () {
    let v = parseInt(this.value || '1', 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 10) v = 10;
    this.value = v;
    updatePaymentAmount();
  });
}

/* ---------- Space booking (unchanged behavior kept) ---------- */
let currentSpace = '';
let fullDayPrice = 0;
let halfDayPrice = 0;

function openSpaceBooking(spaceName, fullPrice, halfPrice) {
  currentSpace = spaceName;
  fullDayPrice = Number(fullPrice) || 0;
  halfDayPrice = Number(halfPrice) || 0;

  // existing space modal fields if you have them
  const spaceModalTitle = document.getElementById('spaceModalTitle');
  if (spaceModalTitle) spaceModalTitle.textContent = `Book ${spaceName}`;

  // show space booking modal if exists
  const spaceBookingModal = document.getElementById('spaceBookingModal');
  if (spaceBookingModal) {
    spaceBookingModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

function closeSpaceBooking() {
  const spaceBookingModal = document.getElementById('spaceBookingModal');
  if (spaceBookingModal) spaceBookingModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function updateSpaceTotal() {
  const durationEl = document.getElementById('spaceDuration');
  if (!durationEl) return;
  const duration = durationEl.value;
  const basePrice = duration === 'full' ? fullDayPrice : halfDayPrice;
  let additionalCost = 0;
  if (document.getElementById('catering')?.checked) additionalCost += 200;
  if (document.getElementById('decoration')?.checked) additionalCost += 150;
  if (document.getElementById('techSupport')?.checked) additionalCost += 100;
  const total = basePrice + additionalCost;
  if (document.getElementById('spaceBasePrice')) document.getElementById('spaceBasePrice').textContent = `KSh ${Math.round(basePrice).toLocaleString()}`;
  if (document.getElementById('additionalServices')) document.getElementById('additionalServices').textContent = `KSh ${Math.round(additionalCost).toLocaleString()}`;
  if (document.getElementById('spaceTotalPrice')) document.getElementById('spaceTotalPrice').textContent = `KSh ${Math.round(total).toLocaleString()}`;
}

/* Close modals on outside click for compatibility (paymentModal handled) */
window.addEventListener('click', function (event) {
  const paymentModal = document.getElementById('paymentModal');
  if (paymentModal && event.target === paymentModal) {
    closePayment();
  }
});

/* ---------- Gallery filter (unchanged) ---------- */
function filterGallery(category, evt) {
  const items = document.querySelectorAll('.gallery-item');
  const buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(btn => btn.classList.remove('active'));
  let activeBtn = null;
  if (evt && evt.target) activeBtn = evt.target;
  else activeBtn = document.querySelector(`.filter-btn[data-category="${category}"]`) || buttons[0];
  if (activeBtn) activeBtn.classList.add('active');

  items.forEach(item => {
    if (category === 'all' || item.dataset.category === category) item.style.display = 'block';
    else item.style.display = 'none';
  });
}

/* Initialize gallery and set payment modal to hidden on load */
document.addEventListener('DOMContentLoaded', function () {
  // show all gallery items
  document.querySelectorAll('.gallery-item').forEach(it => it.style.display = 'block');
  // ensure payment modal hidden
  const pm = document.getElementById('paymentModal');
  if (pm) pm.setAttribute('aria-hidden', 'true');
});
