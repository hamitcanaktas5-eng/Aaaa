// social-media-script.js
// HTML elementleri: apiSelect, serviceSelect, amountGroup, amountInput, amountHint,
//                   amountInfo, linkGroup, linkInput, linkInfo, priceBox, priceTotal,
//                   scheduleCard, scheduleIcon, scheduleTitle, scheduleText, buyBtn

var smmUser     = null;
var smmUserData = null;

requireAuth(function(user) {
    smmUser = user;
    db.collection('users').doc(user.uid).get().then(function(snap) {
        smmUserData = snap.exists ? snap.data() : { balance: 0 };
        var name    = smmUserData.name || user.displayName || 'Kullanıcı';
        var balance = smmUserData.balance || 0;

        
        setShellUI({ name: name, email: user.email || '', balance: balance, verified: !!user.emailVerified });
var balEl = document.querySelector('.balance-amount, #userBalanceDisplay');
        if (balEl) balEl.textContent = formatPrice(balance);
        if (avatarSpan) avatarSpan.textContent = name;
    });
});

var SERVICES = {
    instagram: {
        takipci: { label:'Takipçi', pricePerK:100, min:200,  max:10000  },
        begeni:  { label:'Beğeni',  pricePerK:80,  min:500,  max:50000  },
        izlenme: { label:'İzlenme', pricePerK:50,  min:1000, max:100000 }
    },
    tiktok: {
        takipci: { label:'Takipçi', pricePerK:150, min:350,  max:35000  },
        begeni:  { label:'Beğeni',  pricePerK:80,  min:500,  max:100000 },
        izlenme: { label:'İzlenme', pricePerK:40,  min:1000, max:500000 }
    }
};

function onApiChange() {
    var api    = document.getElementById('apiSelect').value;
    var svcSel = document.getElementById('serviceSelect');

    svcSel.innerHTML = '<option value="">— Seçiniz —</option>';
    svcSel.disabled  = !api;

    hideAll();
    document.getElementById('buyBtn').disabled = true;

    if (!api || !SERVICES[api]) return;

    Object.keys(SERVICES[api]).forEach(function(key) {
        var s   = SERVICES[api][key];
        var opt = document.createElement('option');
        opt.value       = key;
        opt.textContent = s.label;
        svcSel.appendChild(opt);
    });
}

function onServiceChange() {
    var api = document.getElementById('apiSelect').value;
    var svc = document.getElementById('serviceSelect').value;

    hideAll();
    document.getElementById('amountInfo').textContent  = '';
    document.getElementById('amountInfo').style.color  = '';
    document.getElementById('buyBtn').disabled = true;
    document.getElementById('amountInput').value = '';

    if (!api || !svc) {
        document.getElementById('amountGroup').style.display = 'none';
        document.getElementById('linkGroup').style.display   = 'none';
        return;
    }

    var s = SERVICES[api][svc];
    document.getElementById('amountHint').textContent = 'Min ' + s.min.toLocaleString('tr-TR') + ' – Maks ' + s.max.toLocaleString('tr-TR');
    document.getElementById('amountInput').min = s.min;
    document.getElementById('amountInput').max = s.max;
    document.getElementById('amountGroup').style.display = 'flex';
    document.getElementById('linkGroup').style.display   = 'flex';
}

function onAmountChange() {
    var api    = document.getElementById('apiSelect').value;
    var svc    = document.getElementById('serviceSelect').value;
    var amount = parseInt(document.getElementById('amountInput').value) || 0;
    var infoEl = document.getElementById('amountInfo');

    hidePrice(); hideSched();
    document.getElementById('buyBtn').disabled = true;
    infoEl.textContent = '';

    if (!api || !svc || !amount) return;

    var s = SERVICES[api][svc];
    if (amount < s.min) {
        infoEl.style.color = '#FF6584';
        infoEl.textContent = '⚠ En az ' + s.min.toLocaleString('tr-TR') + ' girilmelidir.';
        return;
    }
    if (amount > s.max) {
        infoEl.style.color = '#FF6584';
        infoEl.textContent = '⚠ En fazla ' + s.max.toLocaleString('tr-TR') + ' girilebilir.';
        return;
    }

    infoEl.style.color = '#00FF88';
    infoEl.textContent = '✓ Geçerli miktar';

    var total = Math.round((amount / 1000) * s.pricePerK);
    var priceTotalEl = document.getElementById('priceTotal');
    if (priceTotalEl) priceTotalEl.textContent = formatPrice(total);
    document.getElementById('priceBox').style.display = 'flex';

    updateScheduleCard();
    checkBuyBtn();
}

function onLinkChange() {
    var linkEl  = document.getElementById('linkInput');
    var infoEl  = document.getElementById('linkInfo');
    var val     = linkEl.value.trim();

    if (val.length > 0 && !val.startsWith('http')) {
        infoEl.style.color = '#FFB347';
        infoEl.textContent = '⚠ Link "https://" ile başlamalıdır.';
    } else if (val.length > 5) {
        infoEl.style.color = '#00FF88';
        infoEl.textContent = '✓ Link girildi';
    } else {
        infoEl.textContent = '';
    }
    checkBuyBtn();
}

function checkBuyBtn() {
    var api    = document.getElementById('apiSelect').value;
    var svc    = document.getElementById('serviceSelect').value;
    var amount = parseInt(document.getElementById('amountInput').value) || 0;
    var link   = document.getElementById('linkInput').value.trim();
    var s      = api && svc ? SERVICES[api][svc] : null;

    var valid = s && amount >= s.min && amount <= s.max && link.length > 5;
    document.getElementById('buyBtn').disabled = !valid;
}

function hideAll()   { hidePrice(); hideSched(); }
function hidePrice() { document.getElementById('priceBox').style.display    = 'none'; }
function hideSched() { document.getElementById('scheduleCard').className     = 'schedule-card'; }

function updateScheduleCard() {
    var working = isWorkingHours();
    var card = document.getElementById('scheduleCard');
    card.className = 'schedule-card show ' + (working ? 'mesai-ici' : 'mesai-disi');
    document.getElementById('scheduleIcon').innerHTML  = working ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-moon"></i>';
    document.getElementById('scheduleTitle').textContent = working ? 'Mesai Saatlerindeyiz ✓' : 'Mesai Saati Dışı';
    document.getElementById('scheduleText').innerHTML  = working
        ? 'Siparişiniz en geç 30 dakika içinde başlayacaktır.'
        : 'Siparişiniz alınacak ve mesai saatlerinde başlayacaktır.<br><strong>Hafta içi:</strong> 17:00–00:00 &nbsp; <strong>Hafta sonu:</strong> 7/24';
}

function handleOrder() {
    var api    = document.getElementById('apiSelect').value;
    var svc    = document.getElementById('serviceSelect').value;
    var amount = parseInt(document.getElementById('amountInput').value) || 0;
    var link   = document.getElementById('linkInput').value.trim();
    if (!api || !svc || !amount || !link) return;

    var s       = SERVICES[api][svc];
    var total   = Math.round((amount / 1000) * s.pricePerK);
    var balance = smmUserData ? (smmUserData.balance || 0) : 0;

    if (balance < total) {
        RoxyUI.alert('Yetersiz Bakiye',
            'Gerekli: <strong>' + formatPrice(total) + '</strong><br>Bakiyeniz: <strong>' + formatPrice(balance) + '</strong>',
            'warning').then(function() { window.location.href = 'balance.html'; });
        return;
    }

    var platName = api === 'instagram' ? 'Instagram' : 'TikTok';
    var orderId  = generateSMMId();

    RoxyUI.confirm(
        'Sipariş Özeti',
        '<strong>Platform:</strong> ' + platName + '<br>' +
        '<strong>Servis:</strong> ' + s.label + '<br>' +
        '<strong>Miktar:</strong> ' + amount.toLocaleString('tr-TR') + '<br>' +
        '<strong>Link:</strong> ' + link.substring(0, 40) + (link.length > 40 ? '...' : '') + '<br>' +
        '<strong>Tutar:</strong> ' + formatPrice(total) + '<br>' +
        '<strong>Sipariş No:</strong> ' + orderId,
        'Onayla', 'İptal'
    ).then(function(ok) {
        if (!ok) return;

        var newBalance = balance - total;

        db.collection('orders').doc(orderId).set({
            orderId:   orderId,
            type:      'smm',
            userId:    smmUser.uid,
            userEmail: smmUser.email,
            userName:  (smmUserData && smmUserData.name) ? smmUserData.name : '',
            platform:  platName,
            service:   s.label,
            amount:    amount,
            link:      link,
            price:     total,
            status:    'pending',
            note:      '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(function() {
            return db.collection('users').doc(smmUser.uid).update({ balance: newBalance });
        }).then(function() {
            smmUserData.balance = newBalance;
            var balEl = document.querySelector('.balance-amount, #userBalanceDisplay');
            if (balEl) balEl.textContent = formatPrice(newBalance);

            RoxyUI.toast('Siparişiniz alındı! No: ' + orderId, 'success', 5000);

            // Formu sıfırla
            document.getElementById('apiSelect').value      = '';
            document.getElementById('serviceSelect').value  = '';
            document.getElementById('serviceSelect').disabled = true;
            document.getElementById('serviceSelect').innerHTML = '<option value="">— Önce API seçin —</option>';
            document.getElementById('amountInput').value    = '';
            document.getElementById('linkInput').value      = '';
            document.getElementById('amountInfo').textContent = '';
            document.getElementById('linkInfo').textContent   = '';
            document.getElementById('amountGroup').style.display = 'none';
            document.getElementById('linkGroup').style.display   = 'none';
            hideAll();
            document.getElementById('buyBtn').disabled = true;
        }).catch(function(e) {
            console.error(e);
            RoxyUI.alert('Hata', 'Sipariş oluşturulamadı: ' + e.message, 'error');
        });
    });
}

function isWorkingHours() {
    var now  = new Date();
    var day  = now.getDay();
    var hour = now.getHours();
    if (day === 0 || day === 6) return true;
    return hour >= 17 && hour < 24;
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    var o = document.getElementById('overlay');
    if (o) o.classList.toggle('active');
}
