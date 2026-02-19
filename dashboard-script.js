// dashboard-script.js
requireAuth(function(user) {
    loadDashboard(user);
});

function loadDashboard(user) {
    // Kullanıcı verisini Firestore'dan çek
    db.collection('users').doc(user.uid).get().then(function(snap) {
        var data = snap.exists ? snap.data() : {};
        var name    = data.name || user.displayName || 'Kullanıcı';
        var balance = data.balance || 0;

        
        setShellUI({ name: name, email: user.email || '', balance: balance, verified: !!user.emailVerified });
// Bakiye güncelle
        document.querySelectorAll('.balance-amount, .stat-value').forEach(function(el, i) {
            if (el.closest('.balance-card') || el.classList.contains('balance-amount')) {
                el.textContent = formatPrice(balance);
            }
        });
        // Bakiye card'ı
        var balCard = document.querySelector('.balance-card .stat-value');
        if (balCard) balCard.textContent = formatPrice(balance);

        // İsim
        var profileSpan = document.querySelector('.user-profile span');
        if (profileSpan) profileSpan.textContent = name;

        // Avatar

        // Hoş geldin
        var welcome = document.querySelector('.welcome-section h1');
        if (welcome) welcome.textContent = 'Hoş Geldin, ' + name.split(' ')[0] + '! 👋';

        // Son siparişleri çek
        loadRecentOrders(user.uid, balance);
    }).catch(function(e) { console.error('Kullanıcı verisi alınamadı:', e); });
}

function loadRecentOrders(uid, balance) {
    db.collection('orders')
        .where('userId', '==', uid)
        .get()
        .then(function(snap) {
            var container = document.querySelector('.orders-table');
            if (!container) return;

            // İstatistik kartları
            var total     = snap.size;
            var pending   = 0;
            var completed = 0;
            snap.forEach(function(d) {
                var s = d.data().status;
                if (s === 'pending' || s === 'processing') pending++;
                if (s === 'completed') completed++;
            });

            var statCards = document.querySelectorAll('.stat-card:not(.balance-card) .stat-value');
            if (statCards[0]) statCards[0].textContent = total;
            if (statCards[1]) statCards[1].textContent = pending;
            if (statCards[2]) statCards[2].textContent = completed;

            if (snap.empty) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><h3>Henüz sipariş yok</h3><p>Hizmetlerimizden yararlanmak için sipariş verebilirsiniz</p></div>';
                return;
            }

            var html = '';
            snap.forEach(function(doc) {
                var o = doc.data();
                var statusMap = {
                    pending:    ['⏳', 'Beklemede',  '#FFB347'],
                    processing: ['⚙️', 'İşleniyor',  '#00D9FF'],
                    completed:  ['✅', 'Tamamlandı', '#00FF88'],
                    cancelled:  ['❌', 'İptal',      '#FF6584']
                };
                var st = statusMap[o.status] || ['⏳','Beklemede','#FFB347'];
                html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,0.05);">'
                    + '<div><div style="font-size:13px;font-weight:600;color:#00D9FF">' + (o.orderId||'—') + '</div>'
                    + '<div style="font-size:12px;color:#A0A0B8;margin-top:2px">' + (o.platform||'') + (o.service?' · '+o.service:'') + '</div></div>'
                    + '<div style="text-align:right"><div style="font-weight:700">' + formatPrice(o.price||0) + '</div>'
                    + '<div style="font-size:12px;color:'+st[2]+';margin-top:2px">' + st[0]+' '+st[1] + '</div></div>'
                    + '</div>';
            });
            container.innerHTML = '<div style="border-radius:12px;border:1px solid rgba(0,217,255,0.12);overflow:hidden">' + html + '</div>';
        })
        .catch(function(e) { console.error('Siparişler alınamadı:', e); });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.toggle('active');
}

function handleLogout() {
    RoxyUI.confirm('Çıkış Yap', 'Hesabınızdan çıkış yapmak istiyor musunuz?', 'Çıkış Yap', 'İptal', true)
        .then(function(ok) {
            if (ok) auth.signOut().then(function() { window.location.href = 'auth.html'; });
        });
}
