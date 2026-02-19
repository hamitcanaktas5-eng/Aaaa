// virtual-number-script.js
// HTML elementleri: apiSelect, serviceSelect, priceBox, priceValue, buyBtn

var vnUser     = null;
var vnUserData = null;

requireAuth(function(user) {
    vnUser = user;
    db.collection('users').doc(user.uid).get().then(function(snap) {
        vnUserData = snap.exists ? snap.data() : { balance: 0 };
        var name    = vnUserData.name || user.displayName || 'Kullanıcı';
        var balance = vnUserData.balance || 0;

        
        setShellUI({ name: name, email: user.email || '', balance: balance, verified: !!user.emailVerified });
var balEl = document.querySelector('.balance-amount');
        if (balEl) balEl.textContent = formatPrice(balance);
        if (avatarSpan) avatarSpan.textContent = name;
    });
});

// Fiyat tablosu (API + Servis kombinasyonu)
var VN_PRICES = {
    whatsapp: { global: 45, turkey: 85 },
    telegram: { global: 45, turkey: 85 }
};

function updatePrice() {
    var api     = document.getElementById('apiSelect').value;
    var service = document.getElementById('serviceSelect').value;
    var priceBox = document.getElementById('priceBox');
    var priceVal = document.getElementById('priceValue');
    var buyBtn   = document.getElementById('buyBtn');

    if (api && service) {
        var price = (VN_PRICES[api] && VN_PRICES[api][service]) ? VN_PRICES[api][service] : 45;
        if (priceVal) priceVal.textContent = formatPrice(price);
        if (priceBox) priceBox.style.display = 'flex';
        if (buyBtn)   buyBtn.disabled = false;
    } else {
        if (priceBox) priceBox.style.display = 'none';
        if (buyBtn)   buyBtn.disabled = true;
    }
}

function handleOrder() {
    var api     = document.getElementById('apiSelect').value;
    var service = document.getElementById('serviceSelect').value;
    if (!api || !service) return;

    var price   = (VN_PRICES[api] && VN_PRICES[api][service]) ? VN_PRICES[api][service] : 45;
    var balance = vnUserData ? (vnUserData.balance || 0) : 0;

    if (balance < price) {
        RoxyUI.alert('Yetersiz Bakiye',
            'Bu işlem için yeterli bakiyeniz bulunmuyor.<br><br>Gerekli: <strong>' + formatPrice(price) + '</strong><br>Bakiyeniz: <strong>' + formatPrice(balance) + '</strong>',
            'warning').then(function() { window.location.href = 'balance.html'; });
        return;
    }

    var platformMap = { whatsapp: 'WhatsApp', telegram: 'Telegram' };
    var serviceMap  = { global: '🌍 Global', turkey: '🇹🇷 Türkiye' };
    var orderId = generateVNId();
    var working = isWorkingHours();

    RoxyUI.confirm(
        'Sipariş Özeti',
        '<strong>Platform:</strong> ' + platformMap[api] + '<br>' +
        '<strong>Servis:</strong> ' + serviceMap[service] + '<br>' +
        '<strong>Tutar:</strong> ' + formatPrice(price) + '<br>' +
        '<strong>Sipariş No:</strong> ' + orderId + '<br><br>' +
        (working ? '✅ Siparişiniz en geç 30 dk içinde iletilecektir.'
                 : '🌙 Mesai saati dışı — mesai saatlerinde işlenecektir.'),
        'Onayla', 'İptal'
    ).then(function(ok) {
        if (!ok) return;

        var newBalance = balance - price;

        db.collection('orders').doc(orderId).set({
            orderId:   orderId,
            type:      'vn',
            userId:    vnUser.uid,
            userEmail: vnUser.email,
            userName:  (vnUserData && vnUserData.name) ? vnUserData.name : '',
            platform:  platformMap[api],
            service:   serviceMap[service],
            price:     price,
            status:    'pending',
            note:      '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            return db.collection('users').doc(vnUser.uid).update({ balance: newBalance });
        }).then(function() {
            vnUserData.balance = newBalance;
            var balEl = document.querySelector('.balance-amount');
            if (balEl) balEl.textContent = formatPrice(newBalance);

            RoxyUI.toast('Siparişiniz alındı! No: ' + orderId, 'success', 5000);

            // Formu sıfırla
            document.getElementById('apiSelect').value    = '';
            document.getElementById('serviceSelect').value = '';
            document.getElementById('priceBox').style.display = 'none';
            document.getElementById('buyBtn').disabled = true;
        }).catch(function(e) {
            console.error(e);
            RoxyUI.alert('Hata', 'Sipariş oluşturulamadı: ' + e.message, 'error');
        });
    });
}

function isWorkingHours() {
    var now  = new Date();
    var day  = now.getDay();   // 0=Paz, 6=Cmt
    var hour = now.getHours();
    if (day === 0 || day === 6) return true;
    return hour >= 17 && hour < 24;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    var o = document.getElementById('overlay');
    if (o) o.classList.toggle('active');
}
