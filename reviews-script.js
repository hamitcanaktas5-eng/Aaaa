// reviews-script.js
var revUser      = null;
var revUserData  = null;
var currentRating = 0;

requireAuth(function(user) {
    revUser = user;
    db.collection('users').doc(user.uid).get().then(function(snap) {
        revUserData = snap.exists ? snap.data() : { balance: 0 };
        var name    = revUserData.name || user.displayName || 'Kullanıcı';

        var balEl = document.querySelector('.balance-amount, #userBalanceDisplay');
        if (balEl) balEl.textContent = formatPrice(revUserData.balance || 0);

        loadApprovedReviews();
    });
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    var o = document.getElementById('overlay');
    if (o) o.classList.toggle('active');
}

// ── YILDIZ ──
function setRating(val) {
    currentRating = val;
    document.querySelectorAll('.star').forEach(function(s, i) {
        s.classList.toggle('active', i < val);
    });
    checkReviewForm();
}

function checkReviewForm() {
    var text  = (document.getElementById('reviewText').value || '').trim();
    var btn   = document.getElementById('btnSubmitReview');
    if (btn) btn.disabled = !(text.length >= 10 && currentRating > 0);
}

// ── YORUM GÖNDER ──
function submitReview() {
    var text = (document.getElementById('reviewText').value || '').trim();
    if (!text || !currentRating || !revUser) return;

    var btn = document.getElementById('btnSubmitReview');
    if (btn) btn.disabled = true;

    db.collection('reviews').add({
        userId:    revUser.uid,
        userEmail: revUser.email,
        userName:  (revUserData && revUserData.name) ? revUserData.name : 'Anonim',
        rating:    currentRating,
        text:      text,
        status:    'pending',
        reply:     null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        document.getElementById('reviewText').value = '';
        currentRating = 0;
        document.querySelectorAll('.star').forEach(function(s) { s.classList.remove('active'); });
        if (btn) btn.disabled = true;
        RoxyUI.toast('Yorumunuz alındı! İncelendikten sonra yayınlanacaktır.', 'success', 5000);
    }).catch(function(e) {
        if (btn) btn.disabled = false;
        RoxyUI.alert('Hata', 'Yorum gönderilemedi: ' + e.message, 'error');
    });
}

// ── ONAYLANAN YORUMLAR ──
function loadApprovedReviews() {
    var container = document.getElementById('latestReviews');
    if (!container) return;

    db.collection('reviews')
        .where('status', 'in', ['approved','replied'])
        .limit(5)
        .get().then(function(snap) {
            if (snap.empty) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#A0A0B8"><i class="fas fa-star" style="font-size:28px;opacity:.25;display:block;margin-bottom:10px"></i>Henüz yorum yok</div>';
                return;
            }
            var html = '';
            snap.forEach(function(doc) { html += buildCard(doc.data()); });
            container.innerHTML = html;
        }).catch(function(e) { console.log(e); });
}

function buildCard(r) {
    var stars = '';
    for (var i = 1; i <= 5; i++) {
        stars += '<i class="fas fa-star' + (i <= r.rating ? '' : ' empty') + '" style="color:' + (i <= r.rating ? '#FFB347' : 'rgba(255,255,255,0.2)') + '"></i> ';
    }
    var replyHtml = r.reply ? '<div class="review-reply"><div class="reply-badge"><i class="fas fa-shield-alt"></i> Roxy Store</div><p>' + r.reply + '</p></div>' : '';
    return '<div class="review-card">'
        + '<div class="review-header"><div class="reviewer-name">' + (r.userName||'Anonim') + '</div>'
        + '<div class="review-stars">' + stars + '</div></div>'
        + '<p class="review-text">' + r.text + '</p>'
        + replyHtml + '</div>';
}

// ── SORGULA ──
function checkQueryForm() {
    var email = (document.getElementById('queryEmail').value || '').trim();
    var btn   = document.getElementById('btnQuery');
    if (btn) btn.disabled = !email.includes('@');
}

function queryReviews() {
    var email = (document.getElementById('queryEmail').value || '').trim().toLowerCase();
    var box   = document.getElementById('queryResults');
    var list  = document.getElementById('myReviewsList');
    var cnt   = document.getElementById('resultsCount');

    if (!email || !box || !list) return;

    box.style.display = 'block';
    if (cnt) cnt.textContent = '';
    list.innerHTML = '<div style="text-align:center;padding:18px;color:#A0A0B8">Aranıyor...</div>';

    db.collection('reviews')
      .where('userEmail', '==', email)
      .get()
      .then(function(snap) {
          if (snap.empty) {
              list.innerHTML = '<div style="text-align:center;padding:20px;color:#A0A0B8"><i class="fas fa-search" style="display:block;font-size:24px;opacity:.3;margin-bottom:8px"></i>Bu e-posta ile değerlendirme bulunamadı.</div>';
              if (cnt) cnt.textContent = '0';
              // İSTEDİĞİN UYARI (toast)
              RoxyUI.toast('Bu e-posta ile değerlendirme bulunamadı.', 'warning', 3500);
              return;
          }

          if (cnt) cnt.textContent = String(snap.size);

          var html = '';
          snap.forEach(function(doc) {
              var r = doc.data() || {};
              var sm = {
                  pending:  '⏳ Onay bekliyor',
                  approved: '✅ Onaylandı',
                  replied:  '💬 Yanıtlandı',
                  rejected: '❌ Reddedildi'
              };

              var stars = '';
              for (var i = 1; i <= 5; i++) {
                  stars += '<i class="fas fa-star" style="color:' + (i <= (r.rating||0) ? '#FFB347' : 'rgba(255,255,255,0.2)') + '"></i> ';
              }

              html += '<div class="review-card" style="margin-bottom:12px;">'
                  + '<div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px;align-items:center">'
                  + '<div>' + stars + '</div>'
                  + '<span style="font-size:12px;color:#A0A0B8;white-space:nowrap">' + (sm[r.status] || r.status || '—') + '</span>'
                  + '</div>'
                  + '<p style="font-size:13px;color:#A0A0B8">' + (r.text || '') + '</p>'
                  + (r.reply ? '<div class="review-reply"><div class="reply-badge"><i class="fas fa-shield-alt"></i> Roxy Store</div><p>' + r.reply + '</p></div>' : '')
                  + '</div>';
          });

          list.innerHTML = html;
      })
      .catch(function(e) {
          list.innerHTML = '<div style="text-align:center;padding:18px;color:#FF6584">Sorgu başarısız: ' + (e.message || '') + '</div>';
      });
}

 // ── GÖRÜNÜM ──
function showMyReviews() {
    document.getElementById('mainView').style.display       = 'none';
    document.getElementById('myReviewsView').style.display  = 'block';
    if (document.getElementById('allReviewsView')) document.getElementById('allReviewsView').style.display = 'none';
}
function showAllReviews() {
    document.getElementById('mainView').style.display       = 'none';
    if (document.getElementById('myReviewsView'))  document.getElementById('myReviewsView').style.display  = 'none';
    document.getElementById('allReviewsView').style.display = 'block';
    loadAllReviews();
}
function showMain() {
    document.getElementById('mainView').style.display       = 'block';
    if (document.getElementById('myReviewsView'))  document.getElementById('myReviewsView').style.display  = 'none';
    if (document.getElementById('allReviewsView')) document.getElementById('allReviewsView').style.display = 'none';
}
function loadAllReviews() {
    var container = document.getElementById('allReviewsList');
    if (!container) return;
    db.collection('reviews').where('status','in',['approved','replied']).limit(50).get()
        .then(function(snap) {
            if (snap.empty) { container.innerHTML='<div style="text-align:center;padding:30px;color:#A0A0B8">Henüz yorum yok</div>'; return; }
            var html=''; snap.forEach(function(doc){html+=buildCard(doc.data());}); container.innerHTML=html;
        }).catch(function(e){console.log(e);});
}
