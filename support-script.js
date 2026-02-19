// support-script.js (support.html ile uyumlu)
// Amaç: Talep oluştur, listele, aç, mesaj gönder.

var suppUser = null;
var suppUserData = null;
var currentTicketDocId = null;
var currentTicketStatus = 'open';
var msgUnsub = null;

requireAuth(function(user){
    suppUser = user;

    db.collection('users').doc(user.uid).get().then(function(snap){
        suppUserData = snap.exists ? snap.data() : {};
        var name = suppUserData.name || user.displayName || 'Kullanıcı';
        var bal  = suppUserData.balance || 0;

        
        setShellUI({ name: name, email: user.email || '', balance: bal, verified: !!user.emailVerified });
// Üst bar
        var balEls = document.querySelectorAll('.balance-amount');
        balEls.forEach(function(el){ el.textContent = formatPrice(bal); });
        if (avatarSpan) avatarSpan.textContent = name;

        // Liste
        loadTickets();
    });
});

function toggleSidebar(){
    var s = document.getElementById('sidebar');
    var o = document.getElementById('overlay');
    if (s) s.classList.toggle('open');
    if (o) o.classList.toggle('active');
}

// ── Görünümler ──
function showNewTicket(){
    document.getElementById('mainView').style.display = 'none';
    document.getElementById('newTicketView').style.display = 'block';
    document.getElementById('chatView').style.display = 'none';
    var f = document.getElementById('mainFooter'); if (f) f.style.display='none';
    updateCounts();
}
function showMain(){
    document.getElementById('mainView').style.display = 'block';
    document.getElementById('newTicketView').style.display = 'none';
    document.getElementById('chatView').style.display = 'none';
    var f = document.getElementById('mainFooter'); if (f) f.style.display='block';

    // chat listener kapat
    if (msgUnsub) { msgUnsub(); msgUnsub = null; }
    currentTicketDocId = null;
    currentTicketStatus = 'open';

    loadTickets();
}

// ── Form kontrol ──
function checkTicketForm(){
    var t = (document.getElementById('ticketTitle').value || '').trim();
    var c = (document.getElementById('ticketContent').value || '').trim();
    var btn = document.getElementById('btnSubmitTicket');

    var tc = document.getElementById('titleCount');
    var cc = document.getElementById('contentCount');
    if (tc) tc.textContent = (t.length) + '/100';
    if (cc) cc.textContent = (c.length) + '/1000';

    if (btn) btn.disabled = !(t.length >= 5 && c.length >= 10);
}

function updateCounts(){
    checkTicketForm();
}

// ── Ticket liste ──
function loadTickets(){
    var list = document.getElementById('ticketsList');
    var countEl = document.getElementById('ticketCount');
    if (!list) return;

    list.innerHTML = '<div style="text-align:center;padding:20px;color:#A0A0B8">Yükleniyor...</div>';

    db.collection('tickets')
      .where('userId','==',suppUser.uid)
      .orderBy('updatedAt','desc')
      .get()
      .then(function(snap){
        if (countEl) countEl.textContent = snap.size + ' talep';
        if (snap.empty){
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#A0A0B8"><i class="fas fa-headset" style="font-size:36px;opacity:.25;display:block;margin-bottom:12px"></i><p>Henüz destek talebi yok</p></div>';
            return;
        }

        var html = '';
        snap.forEach(function(doc){
            var t = doc.data() || {};
            var isOpen = (t.status || 'open') === 'open';
            html += '<div class="ticket-item" style="cursor:pointer" onclick="openChat(\'' + doc.id + '\')">'
                 +   '<div class="ticket-top">'
                 +     '<span class="ticket-id">' + (t.ticketId || doc.id) + '</span>'
                 +     '<span class="ticket-badge ' + (isOpen ? 'badge-open' : 'badge-closed') + '">'
                 +        '<span class="dot ' + (isOpen ? 'dot-open' : 'dot-closed') + '"></span>'
                 +        (isOpen ? 'Açık' : 'Kapalı')
                 +     '</span>'
                 +   '</div>'
                 +   '<div class="ticket-title">' + escapeHtml(t.title || '—') + '</div>'
                 +   '<div class="ticket-date">' + fmtDate(t.updatedAt || t.createdAt) + '</div>'
                 + '</div>';
        });
        list.innerHTML = html;
      })
      .catch(function(e){
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#FF6584">Liste yüklenemedi: ' + (e.message||'') + '</div>';
      });
}

// ── Ticket oluştur ──
function submitTicket(){
    var title = (document.getElementById('ticketTitle').value || '').trim();
    var content = (document.getElementById('ticketContent').value || '').trim();

    if (title.length < 5 || content.length < 10){
        RoxyUI.toast('Lütfen başlık ve içeriği doldurun.', 'warning', 3500);
        return;
    }

    var btn = document.getElementById('btnSubmitTicket');
    if (btn) { btn.disabled = true; btn.textContent = 'Gönderiliyor...'; }

    // Kullanıcı ticket sayısı -> sıralı id
    db.collection('tickets')
      .where('userId','==',suppUser.uid)
      .get()
      .then(function(snap){
          var ticketId = generateTKTId(snap.size + 1);
          // docId olarak random kullanıp ticketId'yi field'a yazıyoruz
          return db.collection('tickets').add({
              ticketId: ticketId,
              userId: suppUser.uid,
              userEmail: suppUser.email,
              userName: (suppUserData && suppUserData.name) ? suppUserData.name : '',
              title: title,
              status: 'open',
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).then(function(docRef){
              // İlk mesajı messages alt koleksiyonuna yaz
              return db.collection('tickets').doc(docRef.id).collection('messages').add({
                  sender: 'user',
                  text: content,
                  createdAt: firebase.firestore.FieldValue.serverTimestamp()
              }).then(function(){
                  return docRef.id;
              });
          });
      })
      .then(function(docId){
          // form temizle
          document.getElementById('ticketTitle').value = '';
          document.getElementById('ticketContent').value = '';
          checkTicketForm();

          RoxyUI.toast('Talebiniz alınmıştır. Mesai saatlerinde yanıtlanacaktır.', 'success', 4500);

          if (btn) { btn.textContent = 'Talebi Gönder'; }

          // chat'e geç
          openChat(docId);
      })
      .catch(function(e){
          if (btn) { btn.disabled = false; btn.textContent = 'Talebi Gönder'; }
          RoxyUI.alert('Hata', 'Talep oluşturulamadı: ' + (e.message||''), 'error');
      });
}

// ── Chat ──
function openChat(docId){
    currentTicketDocId = docId;

    document.getElementById('mainView').style.display = 'none';
    document.getElementById('newTicketView').style.display = 'none';
    document.getElementById('chatView').style.display = 'block';
    var f = document.getElementById('mainFooter'); if (f) f.style.display='none';

    // Ticket bilgisi
    db.collection('tickets').doc(docId).get().then(function(snap){
        var t = snap.data() || {};
        currentTicketStatus = t.status || 'open';
    var notice = document.getElementById('chatClosedNotice');
    var wrap = document.getElementById('chatInputWrap');
    if (notice) notice.style.display = (currentTicketStatus === 'closed') ? 'block' : 'none';
    if (wrap) wrap.style.display = (currentTicketStatus === 'closed') ? 'none' : 'flex';

        document.getElementById('chatTitle').textContent = t.title || 'Destek Talebi';
        document.getElementById('chatTicketId').textContent = t.ticketId || docId;

        var badge = document.getElementById('chatStatusBadge');
        if (badge){
            var isOpen = currentTicketStatus === 'open';
            badge.textContent = isOpen ? 'Açık' : 'Kapalı';
            badge.classList.toggle('open', isOpen);
            badge.classList.toggle('closed', !isOpen);
        }

        applyChatStatusUI(currentTicketStatus);

        // Mesajları dinle
        if (msgUnsub) { msgUnsub(); msgUnsub = null; }
        msgUnsub = db.collection('tickets').doc(docId).collection('messages')
            .orderBy('createdAt','asc')
            .onSnapshot(function(qs){
                renderMessages(qs);
            });

    }).catch(function(e){
        RoxyUI.alert('Hata', 'Talep açılamadı: ' + (e.message||''), 'error');
        showMain();
    });
}

function applyChatStatusUI(status){
    var wrap = document.getElementById('chatInputWrap');
    var notice = document.getElementById('chatClosedNotice');
    var input = document.getElementById('chatInput');
    var btn = document.getElementById('chatSendBtn');

    var isOpen = status === 'open';
    if (wrap) wrap.style.display = isOpen ? 'flex' : 'none';
    if (notice) notice.style.display = isOpen ? 'none' : 'block';
    if (input) input.disabled = !isOpen;
    if (btn) btn.disabled = !isOpen;
}

function sendMessage(){
    if (!currentTicketDocId) return;
    if (currentTicketStatus !== 'open') return;

    var input = document.getElementById('chatInput');
    var text = (input.value || '').trim();
    if (!text) return;

    // basit rate limit (spam engeli)
    if (window.__roxy_last_msg && (Date.now() - window.__roxy_last_msg) < 1200){
        RoxyUI.toast('Çok hızlısın. 1-2 saniye bekle.', 'warning', 2200);
        return;
    }
    window.__roxy_last_msg = Date.now();

    input.value = '';
    autoResize(input);

    var msg = {
        sender: 'user',
        text: text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    var tRef = db.collection('tickets').doc(currentTicketDocId);

    tRef.collection('messages').add(msg).then(function(){
        return tRef.update({ updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    }).catch(function(e){
        RoxyUI.toast('Mesaj gönderilemedi: ' + (e.message||''), 'error', 3500);
    });
}

function renderMessages(qs){
    var container = document.getElementById('chatMessages');
    if (!container) return;

    if (qs.empty){
        container.innerHTML = '<div style="text-align:center;color:#A0A0B8;padding:18px">Mesaj yok</div>';
        return;
    }

    var html = '';
    qs.forEach(function(doc){
        var m = doc.data() || {};
        var isUser = m.sender === 'user';
        var time = '';
        if (m.createdAt && m.createdAt.toDate){
            var d = m.createdAt.toDate();
            time = d.toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'});
        }

        html += '<div class="msg ' + (isUser ? 'msg-user' : 'msg-admin') + '">'
             +    '<div class="msg-bubble">' + escapeHtml(m.text || '') + '</div>'
             +    '<div class="msg-time">' + time + '</div>'
             +  '</div>';
    });

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

function autoResize(el){
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(ch){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
}
