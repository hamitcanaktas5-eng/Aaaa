// ── FORM GEÇİŞİ ──
function switchForm(type) {
    document.querySelectorAll('.form-content').forEach(function(f) { f.classList.remove('active'); });
    document.getElementById(type + 'Form').classList.add('active');
}

// ── ŞİFRE GÖSTER/GİZLE ──
function togglePassword(id) {
    var input = document.getElementById(id);
    var btn   = input.parentElement.querySelector('.password-toggle i');
    if (input.type === 'password') {
        input.type = 'text';
        btn.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        btn.className = 'fas fa-eye';
    }
}

// ── ŞİFRE GEREKSİNİMLERİ ──
function checkPasswordStrength(pw) {
    var reqs = {
        reqLength: pw.length >= 8,
        reqUpper:  /[A-Z]/.test(pw),
        reqLower:  /[a-z]/.test(pw),
        reqNumber: /[0-9]/.test(pw)
    };
    for (var id in reqs) {
        var el = document.getElementById(id);
        if (!el) continue;
        var icon = el.querySelector('i');
        if (reqs[id]) {
            el.classList.add('valid');
            if (icon) icon.className = 'fas fa-check-circle';
        } else {
            el.classList.remove('valid');
            if (icon) icon.className = 'fas fa-times-circle';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var pwInput = document.getElementById('registerPassword');
    if (pwInput) {
        pwInput.addEventListener('input', function() {
            checkPasswordStrength(this.value);
        });
    }
});

// ── HATA GÖSTERİCİ ──
function showFormError(formId, msg) {
    var existing = document.getElementById(formId + 'Error');
    if (existing) { existing.textContent = msg; existing.style.display = 'flex'; return; }
    var form = document.getElementById(formId);
    var errDiv = document.createElement('div');
    errDiv.id = formId + 'Error';
    errDiv.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(255,101,132,0.1);border:1px solid rgba(255,101,132,0.3);border-radius:12px;margin-bottom:14px;font-size:13px;color:#FF6584;';
    errDiv.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>' + msg + '</span>';
    var submitBtn = form.querySelector('.btn-submit');
    if (submitBtn) form.insertBefore(errDiv, submitBtn);
    else form.appendChild(errDiv);
}
function hideFormError(formId) {
    var el = document.getElementById(formId + 'Error');
    if (el) el.style.display = 'none';
}

// ── GİRİŞ YAP ──
function handleLogin(event) {
    event.preventDefault(); // FORM NATIVE SUBMIT'İ DURDUR
    var email    = document.getElementById('loginEmail').value.trim();
    var password = document.getElementById('loginPassword').value;
    var btn      = document.querySelector('#loginForm .btn-submit');

    hideFormError('loginForm');
    if (!email || !password) {
        showFormError('loginForm', 'E-posta ve şifre boş bırakılamaz.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span>Giriş yapılıyor...</span><i class="fas fa-spinner fa-spin"></i>';

    auth.signInWithEmailAndPassword(email, password)
        .then(function() {
            showToast('Hesap oluşturuldu. Giriş yapılıyor...', 'success');
            setTimeout(function(){ window.location.href = 'dashboard.html'; }, 600);
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.innerHTML = '<span>Giriş Yap</span><i class="fas fa-arrow-right"></i>';
            var msg = 'Giriş başarısız.';
            if (err.code === 'auth/user-not-found')    msg = 'Bu e-posta ile kayıtlı hesap bulunamadı.';
            if (err.code === 'auth/wrong-password')    msg = 'Şifre hatalı.';
            if (err.code === 'auth/invalid-email')     msg = 'Geçersiz e-posta adresi.';
            if (err.code === 'auth/too-many-requests') msg = 'Çok fazla hatalı giriş. Lütfen bekleyin.';
            if (err.code === 'auth/invalid-credential') msg = 'E-posta veya şifre hatalı.';
            showFormError('loginForm', msg);
        });
}

// ── KAYIT OL ──
function handleRegister(event) {
    event.preventDefault();
    var name     = document.getElementById('registerName').value.trim();
    var email    = document.getElementById('registerEmail').value.trim();
    var password = document.getElementById('registerPassword').value;
    var confirm  = document.getElementById('registerPasswordConfirm').value;
    var btn      = document.querySelector('#registerForm .btn-submit');

    hideFormError('registerForm');

    if (!name || !email || !password || !confirm) {
        showFormError('registerForm', 'Tüm alanlar doldurulmalıdır.');
        return;
    }
    if (password.length < 8) {
        showFormError('registerForm', 'Şifre en az 8 karakter olmalıdır.');
        return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        showFormError('registerForm', 'Şifre büyük harf, küçük harf ve rakam içermelidir.');
        return;
    }
    if (password !== confirm) {
        showFormError('registerForm', 'Şifreler eşleşmiyor.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span>Hesap oluşturuluyor...</span><i class="fas fa-spinner fa-spin"></i>';

    auth.createUserWithEmailAndPassword(email, password)
        .then(function(cred) {
            return Promise.all([
                db.collection('users').doc(cred.user.uid).set({
                    name:      name,
                    email:     email,
                    balance:   0,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }),
                cred.user.updateProfile({ displayName: name })
            ]);
        })
        .then(function() {
            showToast('Hesap oluşturuldu. Giriş yapılıyor...', 'success');
            setTimeout(function(){ window.location.href = 'dashboard.html'; }, 600);
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.innerHTML = '<span>Hesap Oluştur</span><i class="fas fa-arrow-right"></i>';
            var msg = 'Kayıt başarısız.';
            if (err.code === 'auth/email-already-in-use') msg = 'Bu e-posta zaten kullanılıyor.';
            if (err.code === 'auth/invalid-email')        msg = 'Geçersiz e-posta adresi.';
            if (err.code === 'auth/weak-password')        msg = 'Şifre çok zayıf.';
            showFormError('registerForm', msg);
        });
}

// ── ŞİFRE SIFIRLA ──
function handleForgot(event) {
    event.preventDefault();
    var email = document.getElementById('forgotEmail').value.trim();
    var btn   = document.querySelector('#forgotForm .btn-submit');

    hideFormError('forgotForm');
    if (!email) { showFormError('forgotForm', 'E-posta adresi girin.'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span>Gönderiliyor...</span><i class="fas fa-spinner fa-spin"></i>';

    auth.sendPasswordResetEmail(email)
        .then(function() {
            btn.disabled = false;
            btn.innerHTML = '<span>Sıfırlama Bağlantısı Gönder</span><i class="fas fa-paper-plane"></i>';
            var successBox = document.getElementById('forgotSuccess');
            if (successBox) successBox.style.display = 'block';
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.innerHTML = '<span>Sıfırlama Bağlantısı Gönder</span><i class="fas fa-paper-plane"></i>';
            var msg = 'Gönderme başarısız.';
            if (err.code === 'auth/user-not-found') msg = 'Bu e-posta ile kayıtlı hesap bulunamadı.';
            showFormError('forgotForm', msg);
        });
}

// ── ZATEN GİRİŞ YAPILMIŞSA YÖNLENDİR (sadece 1 kez kontrol) ──
var unsubAuth = auth.onAuthStateChanged(function(user) {
    unsubAuth();
    if (user) window.location.href = 'dashboard.html';
});

// --- Password rules (Register) ---
function roxyPwRulesState(pw){
  pw = pw || "";
  return {
    upper: /[A-ZÇĞİÖŞÜ]/.test(pw),
    lower: /[a-zçğıöşü]/.test(pw),
    number:/[0-9]/.test(pw),
    length: pw.length >= 6
  };
}

function updatePwRulesUI(){
  var pw  = document.getElementById('registerPassword');
  var pw2 = document.getElementById('registerPassword2');
  var box = document.getElementById('pwRules');
  if (!pw || !pw2 || !box) return;

  // show when user starts typing/focus
  if ((pw.value && pw.value.length>0) || document.activeElement===pw || document.activeElement===pw2) {
    box.style.display = 'block';
  }

  var st = roxyPwRulesState(pw.value);
  var set = function(id, ok){
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('ok', !!ok);
  };
  set('ruleUpper', st.upper);
  set('ruleLower', st.lower);
  set('ruleNumber', st.number);
  set('ruleLength', st.length);

  var mismatch = document.getElementById('pwMismatch');
  if (mismatch){
    var show = pw2.value.length>0 && pw.value !== pw2.value;
    mismatch.style.display = show ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', function(){
  var pw  = document.getElementById('registerPassword');
  var pw2 = document.getElementById('registerPassword2');
  if (pw) {
    pw.addEventListener('focus', updatePwRulesUI);
    pw.addEventListener('input', updatePwRulesUI);
    pw.addEventListener('blur', updatePwRulesUI);
  }
  if (pw2){
    pw2.addEventListener('focus', updatePwRulesUI);
    pw2.addEventListener('input', updatePwRulesUI);
    pw2.addEventListener('blur', updatePwRulesUI);
  }
});
