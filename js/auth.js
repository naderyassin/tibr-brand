document.addEventListener('DOMContentLoaded', () => {
  const authBtn = document.getElementById('auth-btn');
  const authModal = document.getElementById('auth-modal');
  const authCloseBtn = document.getElementById('auth-close-btn');
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const authToggleMode = document.getElementById('auth-toggle-mode');
  const authSubmitBtn = document.getElementById('auth-submit-btn');

  const authSignupFields = document.getElementById('auth-signup-fields');
  const authName = document.getElementById('auth-name');
  const authGender = document.getElementById('auth-gender');
  const authDob = document.getElementById('auth-dob');
  const authGoogleBtn = document.getElementById('auth-google-btn');

  const adminPanelBtn = document.getElementById('admin-panel-btn');
  const adminModal = document.getElementById('admin-modal');
  const adminCloseBtn = document.getElementById('admin-close-btn');

  let isLoginMode = true;
  let currentUser = null;

  const isEmailNotConfirmedError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    return message.includes('email not confirmed') || code.includes('email_not_confirmed');
  };

  const parseAuthCallbackError = () => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (!error) {
      return null;
    }

    const decodedDescription = errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : '';

    if (decodedDescription.toLowerCase().includes('unable to exchange external code')) {
      return 'تسجيل الدخول عبر Google لم يكتمل لأن إعداد Google Provider في Supabase ما زال غير صحيح. لازم تضيف Google Client ID و Client Secret وتطابق Redirect URL.';
    }

    return decodedDescription || 'حدث خطأ أثناء تسجيل الدخول.';
  };

  const clearAuthCallbackParams = () => {
    if (!window.location.search) return;
    const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  const syncModalMode = () => {
    const title = document.getElementById('auth-modal-title');
    const subtitle = document.getElementById('auth-modal-subtitle');

    if (isLoginMode) {
      if (title) title.textContent = 'تسجيل الدخول';
      if (subtitle) subtitle.textContent = 'أهلاً بعودتك في روبابيكيا';
      authSubmitBtn.textContent = 'دخول';
      authToggleMode.textContent = 'ليس لديك حساب؟ إنشاء حساب جديد';
      authSignupFields.style.display = 'none';
      authName.required = false;
      authGender.required = false;
      authDob.required = false;
    } else {
      if (title) title.textContent = 'إنشاء حساب جديد';
      if (subtitle) subtitle.textContent = 'انضم إلى عائلة روبابيكيا الراقية';
      authSubmitBtn.textContent = 'إنشاء حساب';
      authToggleMode.textContent = 'لديك حساب بالفعل؟ تسجيل الدخول';
      authSignupFields.style.display = 'flex';
      authName.required = true;
      authGender.required = true;
      authDob.required = false;
    }
  };

  const handleSessionChange = async (session) => {
    if (session && session.user) {
      currentUser = session.user;
      authBtn.textContent = 'تسجيل الخروج';
      authModal.classList.remove('active');
      document.body.style.overflow = '';

      try {
        const { data: profile } = await window.apiClient.getProfile();

        if (profile && profile.role === 'admin') {
          adminPanelBtn.style.display = 'block';
        } else {
          adminPanelBtn.style.display = 'none';
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
        adminPanelBtn.style.display = 'none';
      }
    } else {
      currentUser = null;
      authBtn.textContent = 'تسجيل الدخول';
      adminPanelBtn.style.display = 'none';
    }
  };

  const initAuth = async () => {
    const callbackErrorMessage = parseAuthCallbackError();
    if (callbackErrorMessage) {
      alert(callbackErrorMessage);
      clearAuthCallbackParams();
    }

    const { data: { session } } = await window.supabaseClient.auth.getSession();
    await handleSessionChange(session);

    window.supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      await handleSessionChange(session);
    });
  };

  authBtn.addEventListener('click', async () => {
    if (currentUser) {
      await window.supabaseClient.auth.signOut();
      alert('تم تسجيل الخروج بنجاح');
    } else {
      isLoginMode = true;
      syncModalMode();
      authModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  });

  authCloseBtn.addEventListener('click', () => {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  authToggleMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    syncModalMode();
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const password = authPassword.value;

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = 'جاري التحميل...';

    try {
      if (isLoginMode) {
        const { error } = await window.supabaseClient.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        alert('تم تسجيل الدخول بنجاح!');
      } else {
        const { data, error } = await window.supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: authName.value,
              gender: authGender.value,
              date_of_birth: authDob.value
            }
          }
        });
        if (error) throw error;

        if (data?.user && !data?.session) {
          alert('تم إنشاء الحساب، لكن يجب تأكيد البريد الإلكتروني أولاً. افتح Gmail واضغط رابط التأكيد ثم سجّل الدخول.');
        } else {
          alert('تم إنشاء الحساب وتسجيل الدخول بنجاح!');
        }
      }

      authModal.classList.remove('active');
      document.body.style.overflow = '';
      authForm.reset();
    } catch (error) {
      if (isEmailNotConfirmedError(error)) {
        alert('هذا البريد غير مؤكد بعد. افتح Gmail واضغط رابط التأكيد أولاً، أو عطّل Email Confirmation من إعدادات Supabase إذا كان هذا بيئة تطوير.');
      } else {
        alert(error.message || 'حدث خطأ. حاول مرة أخرى.');
      }
    } finally {
      authSubmitBtn.disabled = false;
      authSubmitBtn.textContent = isLoginMode ? 'دخول' : 'إنشاء حساب';
    }
  });

  if (authGoogleBtn) {
    authGoogleBtn.addEventListener('click', async () => {
      try {
        const redirectUrl = `${window.location.origin}${window.location.pathname}`;
        const { error } = await window.supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl
          }
        });
        if (error) throw error;
      } catch (err) {
        alert(
          err.message ||
          'تعذر تسجيل الدخول عبر Google. تأكد من تفعيل Google Provider وإضافة رابط الموقع الحالي إلى Redirect URLs في Supabase.'
        );
      }
    });
  }

  if (adminPanelBtn) {
    adminPanelBtn.addEventListener('click', () => {
      adminModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }

  if (adminCloseBtn) {
    adminCloseBtn.addEventListener('click', () => {
      adminModal.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  initAuth();
});
