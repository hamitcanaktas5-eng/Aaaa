var currentUser    = null;
var userData       = null;
var panelOpen      = false;
var RATE_LIMIT_KEY = 'pw_last_change';
var TWO_WEEKS_MS   = 14 * 24 * 60 * 60 * 1000;

requireAuth(function(user) {
    currentUser = user;
    loadProfileData();
});

async function loadProfileData() {
    var snap = await db.collection('users').doc(currentUser.uid).get();
    userData = snap.data();

    var name = userData.name || currentUser.displayName || 'Kullanıcı';
    document.getElementById('profileName').textContent  = name;
    document.getElementById('profileEmail').textContent = (currentUser.email || '—');

    var initials = (name||'K').trim().split(/\s+/).slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('') || 'K';
    var initEl = document.getElementById('profileInitials'); if (initEl) initEl.textContent = initials;

    var badge = document.getElementById('verifyBadge');
    if (badge){
        var verified = !!currentUser.emailVerified;
        badge.style.display = verified ? 'none' : 'inline-flex';
    }

    // Son şifre değişikliği
    var last = localStorage.getItem(RATE_LIMIT_KEY + '_' + currentUser.uid);
    if (last) {
        var d = new Date(parseInt(last));
        document.getElementById('lastPasswordChange').textContent =
            'Son değişiklik: ' + d.toLocaleDateString('tr-TR');
    } else {
        document.getElementById('lastPasswordChange').textContent = 'Son değişiklik: —';
    }
}

// ─── ŞİFRE PANELİ AÇ ───
function openPasswordPanel() {
    var last = localStorage.getItem(RATE_LIMIT_KEY + '_' + (currentUser ? currentUser.uid : ''));
    if (last && (Date.now() - parseInt(last)) < TWO_WEEKS_MS) {
        var next = new Date(parseInt(last) + TWO_WEEKS_MS);
        RoxyUI.alert('Şifre Sınırı',
            'Şifrenizi haftada yalnızca <strong>1 kez</strong> değiştirebilirsiniz.<br><br>' +
            'Sonraki değişiklik tarihi: <strong>' + next.toLocaleDateString('tr-TR') + '</strong>',
            'warning');
        return;
    }
    document.getElementById('passwordPanel').style.display = 'block';
    document.body.style.overflow = 'hidden';
    panelOpen = true;
    setTimeout(function() {
        var inp = document.getElementById('oldPassword');
        if (inp) inp.focus();
    }, 100);
}

function closePasswordPanel() {
    document.getElementById('passwordPanel').style.display = 'none';
    document.body.style.overflow = '';
    panelOpen = false;
    document.getElementById('oldPassword').value     = '';
    document.getElementById('newPassword').value     = '';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('btnSavePassword').disabled = true;
    document.getElementById('matchHint').textContent = '';
    ['req-len','req-upper','req-lower','req-num'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.className = 'req';
    });
}

// ─── ŞİFRE GÖSTER/GİZLE ───
function togglePw(inputId, btn) {
    var input = document.getElementById(inputId);
    var icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// ─── FORM KONTROL ───
function checkPasswordForm() {
    updateProfilePwRules();
    var oldPw  = document.getElementById('oldPassword').value;
    var newPw  = document.getElementById('newPassword').value;
    var st = roxyPwRulesState(newPw);
    if (!(st.upper && st.lower && st.number && st.length)) {
        showToast('Yeni şifre kuralları karşılamıyor.', 'error');
        updateProfilePwRules();
        return;
    }
    var confPw = document.getElementById('confirmPassword').value;
    var btn    = document.getElementById('btnSavePassword');

    // Gereksinimler
    var hasLen   = newPw.length >= 8;
    var hasUpper = /[A-Z]/.test(newPw);
    var hasLower = /[a-z]/.test(newPw);
    var hasNum   = /[0-9]/.test(newPw);

    setReq('req-len',   hasLen);
    setReq('req-upper', hasUpper);
    setReq('req-lower', hasLower);
    setReq('req-num',   hasNum);

    // Eşleşme
    var hint = document.getElementById('matchHint');
    if (confPw.length > 0) {
        if (newPw === confPw) {
            hint.textContent = '✓ Şifreler eşleşiyor';
            hint.style.color = '#00FF88';
        } else {
            hint.textContent = '✗ Şifreler eşleşmiyor';
            hint.style.color = '#FF6584';
        }
    } else {
        hint.textContent = '';
    }

    btn.disabled = !(oldPw.length > 0 && hasLen && hasUpper && hasLower && hasNum && newPw === confPw);
}

function setReq(id, ok) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = 'req ' + (ok ? 'ok' : '');
    el.querySelector('i').className = ok ? 'fas fa-check-circle' : 'fas fa-times-circle';
}

// ─── ŞİFRE KAYDET ───
async function savePassword() {
    var oldPw = document.getElementById('oldPassword').value;
    var newPw = document.getElementById('newPassword').value;
    var btn   = document.getElementById('btnSavePassword');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';

    try {
        // Önce yeniden giriş (Firebase re-auth gerektirir)
        var cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPw);
        await currentUser.reauthenticateWithCredential(cred);

        // Şifreyi güncelle
        await currentUser.updatePassword(newPw);

        // Rate limit kaydet
        localStorage.setItem(RATE_LIMIT_KEY + '_' + currentUser.uid, Date.now().toString());

        btn.innerHTML = '<i class="fas fa-check"></i> Şifreyi Güncelle';
        RoxyUI.toast('Şifreniz başarıyla güncellendi!', 'success');
        closePasswordPanel();
        loadProfileData();
    } catch(err) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Şifreyi Güncelle';
        var msg = 'Şifre güncellenemedi.';
        if (err.code === 'auth/wrong-password')      msg = 'Mevcut şifreniz hatalı.';
        if (err.code === 'auth/weak-password')       msg = 'Yeni şifre çok zayıf.';
        if (err.code === 'auth/requires-recent-login') msg = 'Lütfen önce çıkış yapıp tekrar giriş yapın.';
        RoxyUI.alert('Hata', msg, 'error');
    }
}

// ─── ÇIKIŞ ───
async function handleLogout() {
    var ok = await RoxyUI.confirm('Çıkış Yap', 'Hesabınızdan çıkış yapmak istiyor musunuz?', 'Çıkış Yap', 'İptal', true);
    if (ok) {
        await auth.signOut();
        window.location.href = 'auth.html';
    }
}


function roxyPwRulesState(pw){
  pw = pw || "";
  return {
    upper: /[A-ZÇĞİÖŞÜ]/.test(pw),
    lower: /[a-zçğıöşü]/.test(pw),
    number:/[0-9]/.test(pw),
    length: pw.length >= 6
  };
}

function updateProfilePwRules(){
  var pw = document.getElementById('newPassword');
  var box = document.getElementById('pwRulesProfile');
  if (!pw || !box) return {upper:false,lower:false,number:false,length:false};
  var st = roxyPwRulesState(pw.value);
  var set=function(id, ok){ var el=document.getElementById(id); if(el) el.classList.toggle('ok', !!ok); };
  set('pRuleUpper', st.upper); set('pRuleLower', st.lower); set('pRuleNumber', st.number); set('pRuleLength', st.length);
  return st;
}
