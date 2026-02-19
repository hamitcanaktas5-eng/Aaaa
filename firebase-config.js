// firebase-config.js
(function() {
    if (!firebase.apps.length) {
        firebase.initializeApp({
            apiKey:            "AIzaSyALUIg2IlPC4TybNfc3awvYG-D_bbkjXgo",
            authDomain:        "roxystore-52c02.firebaseapp.com",
            projectId:         "roxystore-52c02",
            storageBucket:     "roxystore-52c02.firebasestorage.app",
            messagingSenderId: "1061135226190",
            appId:             "1:1061135226190:web:f2b5f9acf8ed346772fa1f"
        });
    }
})();

var auth = firebase.auth();
var db   = firebase.firestore();

// Auth guard - TEK SEFERLIK, token yenilemesinde tetiklenmez
function requireAuth(callback) {
    
    try { document.documentElement.classList.add('auth-loading'); } catch(e) {}
var unsub = auth.onAuthStateChanged(function(user) {
        unsub(); // İlk tepkiden sonra durdur
        if (!user) {
            window.location.href = 'auth.html';
            return;
        }
        try { document.documentElement.classList.remove('auth-loading'); } catch(e) {}
        try { document.documentElement.classList.remove('auth-loading'); } catch(e) {}
        callback(user);
    });
}

function formatPrice(n) {
    return Math.round(n || 0).toLocaleString('tr-TR') + ' ₺';
}

function fmtDate(ts) {
    if (!ts) return '—';
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('tr-TR') + ' ' +
           d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function isWorkingHours() {
    var now = new Date(), day = now.getDay(), h = now.getHours();
    return day === 0 || day === 6 || h >= 17;
}


function logout(){
  auth.signOut().then(function(){ window.location.href='auth.html'; });
}


function setShellUI(opts){
  opts = opts || {};
  var name = opts.name || 'Ad';
  var email = opts.email || '—';
  var balance = typeof opts.balance === 'number' ? opts.balance : (opts.balance||0);
  var initials = (name||'A').trim().split(/\s+/).slice(0,2).map(function(w){return (w[0]||'').toUpperCase();}).join('') || 'A';

  var el;
  el = document.getElementById('userName'); if (el) el.textContent = name;
  el = document.getElementById('pmName'); if (el) el.textContent = name;
  el = document.getElementById('pmEmail'); if (el) el.textContent = email;

  el = document.getElementById('profileInitials'); if (el) el.textContent = initials;
  el = document.getElementById('pmInitials'); if (el) el.textContent = initials;

  // balances
  var balText = formatPrice(balance);
  document.querySelectorAll('#balanceDisplay, .balance-amount, #statBalance').forEach(function(x){ x.textContent = balText; });

  // unverified badge in dropdown if exists
  var badge = document.getElementById('unverifiedBadge');
  if (badge){
    badge.style.display = opts.verified ? 'none' : 'inline-flex';
  }
}
