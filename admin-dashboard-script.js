// ─── GÜVENLİK KONTROLÜ ───
(function() {
    if (sessionStorage.getItem('roxy_admin') !== 'true') {
        window.location.href = 'admin-hamit.html';
    }
    var email = sessionStorage.getItem('roxy_admin_email') || 'Admin';
    var name  = email.split('@')[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
    var el = document.getElementById('adminNameDisplay');
    if (el) el.textContent = name;
})();

// ─── SAAT ───
function updateClock() {
    var el = document.getElementById('topbarTime');
    if (!el) return;
    var now = new Date();
    el.textContent = now.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ─── SECTION YÖNETİMİ ───
var sectionTitles = {
    'overview':   'Genel Bakış',
    'vn-orders':  'Sanal Numara Siparişleri',
    'smm-orders': 'Sosyal Medya Siparişleri',
    'balance':    'Bakiye Onayları',
    'tickets':    'Destek Talepleri',
    'reviews':    'Değerlendirmeler',
    'users':      'Kullanıcılar'
};

function showSection(name) {
    // Tüm section'ları gizle
    document.querySelectorAll('.section').forEach(function(s) {
        s.classList.add('hidden');
    });

    // İlgili section'ı göster
    var target = document.getElementById('sec-' + name);
    if (target) target.classList.remove('hidden');

    // Nav aktif
    document.querySelectorAll('.nav-item').forEach(function(n) {
        n.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    // Başlık güncelle
    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = sectionTitles[name] || name;

    // Mobilde sidebar kapat
    closeSidebar();
}

// ─── SİDEBAR (MOBİL) ───
function toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('open');
    document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
    document.getElementById('adminSidebar').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

// ─── ÇIKIŞ ───
function adminLogout() {
    if (!confirm('Admin panelden çıkış yapmak istiyor musunuz?')) return;
    sessionStorage.removeItem('roxy_admin');
    sessionStorage.removeItem('roxy_admin_email');
    window.location.href = 'admin-hamit.html';
}

// ─── FİLTRELER (Firebase gelince aktif edilecek) ───
function filterOrders(status, type) {
    console.log('Filter:', type, status);
    // TODO: Firebase'den filtrelenmiş siparişleri çek
}
function filterTickets(status) {
    console.log('Filter tickets:', status);
    // TODO: Firebase'den filtrelenmiş talepleri çek
}
function filterReviews(status) {
    console.log('Filter reviews:', status);
    // TODO: Firebase'den filtrelenmiş yorumları çek
}

// ─── BADGE GÜNCELLE (Firebase gelince doldurulacak) ───
function updateBadges(data) {
    var badges = {
        'badge-vn':      data.vnPending      || 0,
        'badge-smm':     data.smmPending     || 0,
        'badge-balance': data.balancePending || 0,
        'badge-tickets': data.ticketsOpen    || 0,
        'badge-reviews': data.reviewsPending || 0,
    };
    for (var id in badges) {
        var el = document.getElementById(id);
        if (el) el.textContent = badges[id];
    }
}

// ─── YARDIMCI: DURUM BADGE HTML ───
function statusBadge(status) {
    var map = {
        'pending':    ['badge-pending',    'Beklemede'],
        'processing': ['badge-processing', 'İşleniyor'],
        'completed':  ['badge-completed',  'Tamamlandı'],
        'cancelled':  ['badge-cancelled',  'İptal'],
        'open':       ['badge-open',       'Açık'],
        'closed':     ['badge-closed',     'Kapalı'],
        'approved':   ['badge-approved',   'Onaylandı'],
        'rejected':   ['badge-rejected',   'Reddedildi'],
        'replied':    ['badge-replied',    'Yanıtlandı'],
    };
    var info = map[status] || ['badge-pending', status];
    return '<span class="badge ' + info[0] + '">' + info[1] + '</span>';
}

// ─── YARDIMCI: TARİH FORMAT ───
function fmtDate(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric' })
        + ' ' + d.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
}

// ─── TODO: Firebase onSnapshot ile gerçek zamanlı veri ───
/*
import { db } from './firebase.js';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

// Örnek:
onSnapshot(collection(db, 'orders'), (snap) => {
    var vnRows = '', smmRows = '';
    snap.forEach(doc => {
        var d = doc.data();
        if (d.type === 'vn') {
            vnRows += `<tr>
                <td>${d.orderId}</td>
                <td>${d.userEmail}</td>
                <td>${d.platform}</td>
                <td>${formatPrice(d.price)}</td>
                <td>${fmtDate(d.createdAt)}</td>
                <td>${statusBadge(d.status)}</td>
                <td>...</td>
            </tr>`;
        }
    });
    document.getElementById('vnOrdersBody').innerHTML = vnRows || '<tr><td colspan="7" class="empty-row">...</td></tr>';
});
*/

document.addEventListener('DOMContentLoaded', function() {
    // Badge'leri sıfır ile başlat (Firebase gelince gerçek data gelecek)
    updateBadges({});
});
