var ADMIN_EMAIL = 'hamitcanaktas5@gmail.com';

function handleKey(e) { if (e.key === 'Enter') handleLogin(); }

function togglePw() {
    var input = document.getElementById('adminPassword');
    var icon  = document.getElementById('pwEyeIcon');
    input.type = input.type === 'password' ? 'text' : 'password';
    icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

function hideError() { document.getElementById('errorBox').classList.remove('show'); }

function showError(msg) {
    var box = document.getElementById('errorBox');
    document.getElementById('errorText').textContent = msg;
    box.classList.remove('show');
    setTimeout(function() { box.classList.add('show'); }, 10);
}

function setLoading(loading) {
    var btn    = document.getElementById('btnLogin');
    var spinner= document.getElementById('loginSpinner');
    var icon   = document.getElementById('loginIcon');
    var text   = document.getElementById('loginText');
    btn.disabled          = loading;
    spinner.style.display = loading ? 'block' : 'none';
    icon.style.display    = loading ? 'none'  : 'inline';
    text.textContent      = loading ? 'Giriş yapılıyor...' : 'Giriş Yap';
}

function handleLogin() {
    var email    = document.getElementById('adminEmail').value.trim();
    var password = document.getElementById('adminPassword').value;

    if (!email || !password) {
        showError('E-posta ve şifre boş bırakılamaz.');
        return;
    }
    if (email !== ADMIN_EMAIL) {
        showError('Bu hesap admin yetkisine sahip değil.');
        return;
    }

    setLoading(true);

    auth.signInWithEmailAndPassword(email, password)
        .then(function() {
            document.getElementById('loginText').textContent = '✓ Yönlendiriliyor...';
            setTimeout(function() {
                window.location.href = 'admin-dashboard.html';
            }, 400);
        })
        .catch(function(err) {
            setLoading(false);
            var msg = 'Giriş başarısız.';
            if (err.code === 'auth/wrong-password')     msg = 'Şifre hatalı.';
            if (err.code === 'auth/user-not-found')     msg = 'Kullanıcı bulunamadı.';
            if (err.code === 'auth/invalid-credential') msg = 'E-posta veya şifre hatalı.';
            if (err.code === 'auth/too-many-requests')  msg = 'Çok fazla hatalı giriş. Bekleyin.';
            showError(msg);
            document.getElementById('adminPassword').value = '';
        });
}

// Zaten giriş yapılmışsa ve admin ise direkt gönder
var _unsubLogin = auth.onAuthStateChanged(function(user) {
    _unsubLogin();
    if (user && user.email === ADMIN_EMAIL) {
        window.location.href = 'admin-dashboard.html';
    }
});

window.addEventListener('DOMContentLoaded', function() {
    document.getElementById('adminEmail').focus();
});
