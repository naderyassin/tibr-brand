/* -------------------------------------------------------------
 * STORE / AUTH.JS — Login + signup validation
 * One file for both forms (detected via data-form). Demo only:
 * on success it stores a local session and routes to /account.
 * Depends on chrome.js (window.RB).
 * ------------------------------------------------------------- */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const form = $(".auth__form");
  if (!form) return;
  const kind = form.dataset.form;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE = /^01[0125]\d{8}$/;
  const toLatinDigits = (s) => String(s).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

  function setInvalid(el, invalid) {
    const wrap = el.closest(".field");
    if (wrap) wrap.classList.toggle("is-invalid", invalid);
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function validate() {
    let firstInvalid = null;
    const checks = [];

    if (kind === "signup") {
      const name = $("#name"), phone = $("#phone"), confirm = $("#confirm");
      checks.push([name, name.value.trim().length >= 2]);
      checks.push([phone, PHONE.test(toLatinDigits(phone.value).replace(/\s/g, ""))]);
      checks.push([$("#email"), EMAIL.test($("#email").value.trim())]);
      checks.push([$("#password"), $("#password").value.length >= 8]);
      checks.push([confirm, confirm.value === $("#password").value && confirm.value.length > 0]);
    } else {
      checks.push([$("#email"), EMAIL.test($("#email").value.trim())]);
      checks.push([$("#password"), $("#password").value.length > 0]);
    }

    checks.forEach(([el, ok]) => {
      setInvalid(el, !ok);
      if (!ok && !firstInvalid) firstInvalid = el;
    });
    if (firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  form.querySelectorAll("input").forEach((el) =>
    el.addEventListener("input", () => setInvalid(el, false)));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validate()) return;
    const btn = form.querySelector('button[type="submit"]');
    btn.classList.add("is-loading");
    btn.disabled = true;
    setTimeout(() => {
      try { localStorage.setItem("tibr-auth", $("#email").value.trim()); } catch (_) {}
      location.href = "/account";
    }, 700);
  });
})();
