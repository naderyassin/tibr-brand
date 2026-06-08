/* checkout.js — Multi-step Checkout Flow */

document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  const paymentLabels = {
    cash_on_delivery: { ar: 'الدفع عند الاستلام', en: 'Cash on Delivery' },
    vodafone_cash: { ar: 'فودافون كاش', en: 'Vodafone Cash' },
    instapay: { ar: 'إنستاباي', en: 'InstaPay' }
  };

  const getPaymentLabel = (paymentMethod, lang) =>
    paymentLabels[paymentMethod]?.[lang] || paymentLabels.cash_on_delivery[lang];

  const showStep = (step) => {
    document.querySelectorAll('.checkout-step').forEach((el, i) => {
      el.classList.toggle('active', i + 1 === step);
    });
    document.querySelectorAll('.step-indicator-item').forEach((el, i) => {
      el.classList.toggle('active', i + 1 <= step);
    });
    currentStep = step;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const populateReview = () => {
    const reviewList = document.getElementById('checkout-review-list');
    const reviewTotal = document.getElementById('checkout-review-total');
    const reviewPayment = document.getElementById('checkout-review-payment');
    if (!reviewList || !window.cart) return;

    const items = window.cart.getItems();
    const lang = window.utils?.getCurrentLang() || 'ar';

    if (items.length === 0) {
      reviewList.innerHTML = '';
      return;
    }

    reviewList.innerHTML = items.map(item => {
      const name = lang === 'en' ? (item.nameEn || item.nameAr) : item.nameAr;
      const price = lang === 'en' ? (item.priceEn || item.priceAr) : item.priceAr;
      return `
        <div class="review-item">
          <span class="review-item-name">${name}${item.size ? ` (${item.size})` : ''}</span>
          <span class="review-item-qty">× ${item.qty}</span>
          <span class="review-item-price">${price}</span>
        </div>
      `;
    }).join('');

    if (reviewTotal) {
      reviewTotal.textContent = window.utils?.formatPrice(window.cart.getTotal()) || '';
    }
    if (reviewPayment) {
      const paymentMethod = document.getElementById('co-payment')?.value || 'cash_on_delivery';
      reviewPayment.textContent = getPaymentLabel(paymentMethod, lang);
    }
  };

  const prefillCheckout = async () => {
    const lang = window.utils?.getCurrentLang() || 'ar';
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session) return;

      const [profileRes, addressesRes] = await Promise.allSettled([
        window.apiClient.getProfile(),
        window.apiClient.getAddresses()
      ]);

      const profile = profileRes.status === 'fulfilled' ? profileRes.value?.data : null;
      const addresses = addressesRes.status === 'fulfilled' ? addressesRes.value?.data || [] : [];
      const defaultAddress = addresses.find((address) => address.is_default) || addresses[0];

      const nameField = document.getElementById('co-name');
      const phoneField = document.getElementById('co-phone');
      const cityField = document.getElementById('co-city');
      const addressField = document.getElementById('co-address');

      if (nameField && !nameField.value.trim()) {
        nameField.value = profile?.full_name || '';
      }
      if (phoneField && !phoneField.value.trim()) {
        phoneField.value = profile?.phone_number || defaultAddress?.phone || '';
      }
      if (cityField && !cityField.value.trim()) {
        cityField.value = defaultAddress?.city || '';
      }
      if (addressField && !addressField.value.trim()) {
        addressField.value = defaultAddress?.street || profile?.address || '';
      }
    } catch (err) {
      console.warn('[checkout] prefill failed:', err);
      if (lang === 'en') return;
    }
  };

  const markFieldInvalid = (id, msg) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-invalid');
    let errEl = el.parentElement.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('span');
      errEl.className = 'field-error';
      el.parentElement.appendChild(errEl);
    }
    errEl.textContent = msg;
    el.addEventListener('input', () => {
      el.classList.remove('is-invalid');
      errEl.textContent = '';
    }, { once: true });
  };

  // Step 1 → Step 2 (review)
  document.getElementById('checkout-to-review-btn')?.addEventListener('click', () => {
    const nameEl = document.getElementById('co-name');
    const phoneEl = document.getElementById('co-phone');
    const addressEl = document.getElementById('co-address');
    const cityEl = document.getElementById('co-city');
    const lang = window.utils?.getCurrentLang() || 'ar';

    const name = nameEl?.value?.trim();
    const phone = phoneEl?.value?.trim();
    const address = addressEl?.value?.trim();
    const city = cityEl?.value?.trim();

    let hasError = false;
    const req = lang === 'en' ? 'Required' : 'هذا الحقل مطلوب';

    if (!name)    { markFieldInvalid('co-name', req);    hasError = true; }
    if (!phone)   { markFieldInvalid('co-phone', req);   hasError = true; }
    if (!city)    { markFieldInvalid('co-city', req);    hasError = true; }
    if (!address) { markFieldInvalid('co-address', req); hasError = true; }

    if (hasError) {
      const firstInvalid = document.querySelector('.checkout-step.active .is-invalid');
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid?.focus();
      return;
    }

    if (window.cart?.getCount() === 0) {
      const msg = lang === 'en' ? 'Your cart is empty.' : 'السلة فارغة.';
      window.utils?.showToast(msg, 'error');
      window.location.hash = '#cart';
      return;
    }

    populateReview();
    showStep(2);
  });

  // Step 2 → Step 1 (back)
  document.getElementById('checkout-back-btn')?.addEventListener('click', () => showStep(1));

  // Step 2 → Submit order
  document.getElementById('checkout-submit-btn')?.addEventListener('click', async () => {
    const lang = window.utils?.getCurrentLang() || 'ar';
    const items = window.cart?.getItems() || [];

    if (items.length === 0) {
      window.utils?.showToast(lang === 'en' ? 'Cart is empty.' : 'السلة فارغة.', 'error');
      return;
    }

    const submitBtn = document.getElementById('checkout-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = lang === 'en' ? 'Processing...' : 'جارٍ المعالجة...';

    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (!session) {
        window.utils?.showToast(
          lang === 'en' ? 'Please sign in to complete checkout.' : 'يرجى تسجيل الدخول لإتمام الطلب.',
          'error'
        );
        window.location.hash = '#login';
        return;
      }

      const customerName = document.getElementById('co-name')?.value?.trim();
      const customerPhone = document.getElementById('co-phone')?.value?.trim();
      const city = document.getElementById('co-city')?.value?.trim();
      const address = document.getElementById('co-address')?.value?.trim();
      const paymentMethod = document.getElementById('co-payment')?.value || 'cash_on_delivery';
      const fullAddress = `${city}، ${address}`;

      await window.apiClient.submitCheckout({
        items: items.map((item) => ({
          productId: item.productId,
          size: item.size || null,
          qty: item.qty || 1
        })),
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: fullAddress,
        payment_method: paymentMethod
      });

      window.cart.clearCart();
      window.location.hash = '#order-confirm';

    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err?.message || (lang === 'en'
        ? 'Order failed. Please try again.'
        : 'حدث خطأ أثناء تأكيد الطلب. يرجى المحاولة مرة أخرى.');
      window.utils?.showToast(msg, 'error');
      alert(msg);
    } finally {
      const btn = document.getElementById('checkout-submit-btn');
      if (btn) {
        btn.disabled = false;
        btn.textContent = window.utils?.getCurrentLang() === 'en' ? 'Place Order' : 'تأكيد الطلب';
      }
    }
  });

  // Reset to step 1 whenever navigating to checkout
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#checkout') {
      showStep(1);
      prefillCheckout();
    }
  });

  if (window.location.hash === '#checkout') {
    prefillCheckout();
  }
});
