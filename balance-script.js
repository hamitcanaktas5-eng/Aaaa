// balance-script.js (uyumlu sürüm)
// Bu dosya balance.html içindeki fonksiyon isimleriyle bire bir eşleşir.

var balUser = null;
var balUserData = null;
var selectedMethod = null;
var realPaparaName = "Yağmur Tuncal";

requireAuth(function(user){
    balUser = user;

    db.collection('users').doc(user.uid).get().then(function(snap){
        balUserData = snap.exists ? snap.data() : {};
        var name = balUserData.name || user.displayName || 'Kullanıcı';
        var bal  = balUserData.balance || 0;

        
        setShellUI({ name: name, email: user.email || '', balance: bal, verified: !!user.emailVerified });
// Üst bar
        var balEls = document.querySelectorAll('.balance-amount');
        balEls.forEach(function(el){ el.textContent = formatPrice(bal); });
        if (avatarSpan) avatarSpan.textContent = name;

        // Mesai kartı
        renderScheduleCard();

        // Varsayılan seçim
        selectMethod('iban');

        // Talepler/Geçmiş alanı varsa yükle
        loadBalanceHistory(user.uid);
    });
});

function toggleSidebar(){
    var s = document.getElementById('sidebar');
    var o = document.getElementById('overlay');
    if (s) s.classList.toggle('open');
    if (o) o.classList.toggle('active');
}

// ── Metod seçimi ──
function selectMethod(method){
    selectedMethod = method;

    var formIban = document.getElementById('form-iban');
    var formPay  = document.getElementById('form-payment');
    var cardIban  = document.getElementById('card-iban');
    var cardPay   = document.getElementById('card-payment');

    if (formIban) formIban.style.display = (method === 'iban') ? 'block' : 'none';
    if (formPay)  formPay.style.display  = (method === 'payment') ? 'block' : 'none';

    if (cardIban) cardIban.classList.toggle('selected', method === 'iban');
    if (cardPay)  cardPay.classList.toggle('selected', method === 'payment');
}

// ── Preset ──
function setPreset(amount, btn){
    if (!selectedMethod) selectedMethod = 'iban';
    if (selectedMethod === 'payment') {
        var el = document.getElementById('paymentAmount');
        if (el) el.value = amount;
        onPaymentAmountChange();
    } else {
        var el2 = document.getElementById('ibanAmount');
        if (el2) el2.value = amount;
        onIbanAmountChange();
    }
    // buton aktif görünümü
    document.querySelectorAll('.preset-btn').forEach(function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
}

// ── Amount değişimleri ──
function onIbanAmountChange(){
    var amount = parseInt((document.getElementById('ibanAmount')||{}).value) || 0;
    var btn = document.getElementById('btnIban');
    if (btn) btn.disabled = !(amount >= 10);
}
function onPaymentAmountChange(){
    var amount = parseInt((document.getElementById('paymentAmount')||{}).value) || 0;
    var totalEl = document.getElementById('paymentTotal');
    if (totalEl) totalEl.textContent = '₺' + (amount||0).toFixed(2);
    var btn = document.getElementById('btnPay');
    if (btn) btn.disabled = !(amount >= 10);
}

// ── Kopyala ──
function copyText(elId, btn){
    var el = document.getElementById(elId);
    if (!el) return;
    var txt = (el.textContent || '').trim();
    copyToClipboard(txt).then(function(){
        RoxyUI.toast('Kopyalandı', 'success', 1800);
        if (btn) { btn.classList.add('copied'); setTimeout(function(){btn.classList.remove('copied');}, 900); }
    }).catch(function(){
        RoxyUI.toast('Kopyalanamadı', 'error', 2500);
    });
}

function copyRealName(btn){
    copyToClipboard(realPaparaName).then(function(){
        RoxyUI.toast('İsim kopyalandı', 'success', 1800);
        if (btn) { btn.classList.add('copied'); setTimeout(function(){btn.classList.remove('copied');}, 900); }
    }).catch(function(){
        RoxyUI.toast('Kopyalanamadı', 'error', 2500);
    });
}

function copyToClipboard(text){
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    return new Promise(function(resolve, reject){
        try{
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            var ok = document.execCommand('copy');
            ta.remove();
            ok ? resolve() : reject();
        } catch(e){ reject(e); }
    });
}

// ── Mesai kartı ──
function renderScheduleCard(){
    var title = document.getElementById('ibanScheduleTitle');
    var text  = document.getElementById('ibanScheduleText');
    var icon  = document.getElementById('ibanScheduleIcon');
    if (!title || !text || !icon) return;

    if (isWorkingHours()){
        icon.innerHTML = '<i class="fas fa-bolt"></i>';
        title.textContent = 'Mesai Saatleri İçindesiniz';
        text.textContent  = 'Talebiniz daha hızlı incelenir. Transfer yaptıktan sonra formu gönderin.';
    } else {
        icon.innerHTML = '<i class="fas fa-moon"></i>';
        title.textContent = 'Mesai Dışındasınız';
        text.textContent  = 'Talebiniz mesai saatlerinde işleme alınacaktır.';
    }
}

// ── IBAN talebi oluştur ──
function handleIban(){
    var amount = parseInt((document.getElementById('ibanAmount')||{}).value) || 0;
    if (amount < 10) {
        RoxyUI.toast('Minimum ₺10 yükleyebilirsiniz.', 'warning', 2600);
        return;
    }
    var btn = document.getElementById('btnIban');
    if (btn) { btn.disabled = true; btn.textContent = 'Gönderiliyor...'; }

    var reqId = 'BAL-' + Date.now();
    db.collection('balance_requests').doc(reqId).set({
        requestId: reqId,
        userId: balUser.uid,
        userEmail: balUser.email,
        userName: (balUserData && balUserData.name) ? balUserData.name : '',
        amount: amount,
        method: 'papara_iban',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function(){
        RoxyUI.toast('Talebiniz alındı! Onaylandıktan sonra bakiyeniz yüklenecektir.', 'success', 5500);
        var el = document.getElementById('ibanAmount'); if (el) el.value = '';
        onIbanAmountChange();
        if (btn) { btn.textContent = 'Dekont Gönder'; } // UI metni mevcut tasarıma göre, sonra değiştirirsiniz
        loadBalanceHistory(balUser.uid);
    }).catch(function(e){
        if (btn) { btn.disabled = false; btn.textContent = 'Dekont Gönder'; }
        RoxyUI.alert('Hata', 'Talep gönderilemedi: ' + e.message, 'error');
    });
}

// Placeholder: ödeme sağlayıcı bakımda
function handlePayment(){
    RoxyUI.toast('Ödeme sağlayıcı şu an bakımda.', 'info', 3500);
}

// ── Geçmiş ──
function loadBalanceHistory(uid){
    var container = document.getElementById('balanceHistory');
    if (!container) return;

    db.collection('balance_requests')
      .where('userId','==',uid)
      .get().then(function(snap){
        if (snap.empty){
            container.innerHTML = '<div class="empty-history" style="text-align:center;padding:30px;color:#A0A0B8"><i class="fas fa-history" style="font-size:28px;opacity:.3;display:block;margin-bottom:10px"></i>Henüz bakiye talebi yok</div>';
            return;
        }
        var html = '';
        snap.forEach(function(doc){
            var r = doc.data() || {};
            var statusMap = {
                pending:  { icon:'⏳', label:'Beklemede', color:'#FFB347' },
                approved: { icon:'✅', label:'Onaylandı',  color:'#00FF88' },
                rejected: { icon:'❌', label:'Reddedildi', color:'#FF6584' }
            };
            var st = statusMap[r.status] || statusMap.pending;
            html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.04);">'
                + '<div><div style="font-weight:700">' + formatPrice(r.amount) + '</div>'
                + '<div style="font-size:11px;color:#A0A0B8">' + fmtDate(r.createdAt) + '</div></div>'
                + '<div style="color:' + st.color + ';font-weight:800;font-size:13px">' + st.icon + ' ' + st.label + '</div>'
                + '</div>';
        });
        container.innerHTML = '<div style="border-radius:12px;border:1px solid rgba(0,217,255,0.12);overflow:hidden">' + html + '</div>';
      }).catch(function(e){
        console.log('Geçmiş yüklenemedi:', e);
      });
}
