// ─── ROXY ALERTS.JS ───
// Tüm sayfalarda kullanılacak site içi uyarı sistemi

const RoxyUI = {

    // Toast mesajı
    toast(message, type = 'success', duration = 3000) {
        let container = document.getElementById('roxyToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'roxyToastContainer';
            container.className = 'roxy-toast-container';
            document.body.appendChild(container);
        }

        const icons = {
            success: 'fa-check-circle',
            error:   'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info:    'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `roxy-toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type] || icons.success}"></i> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.4s, transform 0.4s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    },

    // Basit bilgi modalı (alert yerine)
    alert(title, message, type = 'info') {
        return new Promise(resolve => {
            const icons = {
                success: 'fa-check-circle',
                error:   'fa-times-circle',
                warning: 'fa-exclamation-triangle',
                info:    'fa-info-circle'
            };
            const overlay = document.createElement('div');
            overlay.className = 'roxy-modal-overlay';
            overlay.innerHTML = `
                <div class="roxy-modal">
                    <div class="roxy-modal-icon ${type}">
                        <i class="fas ${icons[type] || icons.info}"></i>
                    </div>
                    <div class="roxy-modal-title">${title}</div>
                    <div class="roxy-modal-message">${message}</div>
                    <div class="roxy-modal-buttons">
                        <button class="roxy-modal-btn primary" id="roxyAlertOk">Tamam</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('#roxyAlertOk').onclick = () => {
                overlay.remove(); resolve();
            };
            overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); resolve(); } };
        });
    },

    // Onay modalı (confirm yerine)
    confirm(title, message, okLabel = 'Onayla', cancelLabel = 'İptal', dangerous = false) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'roxy-modal-overlay';
            overlay.innerHTML = `
                <div class="roxy-modal">
                    <div class="roxy-modal-icon confirm">
                        <i class="fas fa-question-circle"></i>
                    </div>
                    <div class="roxy-modal-title">${title}</div>
                    <div class="roxy-modal-message">${message}</div>
                    <div class="roxy-modal-buttons">
                        <button class="roxy-modal-btn secondary" id="roxyCancel">${cancelLabel}</button>
                        <button class="roxy-modal-btn ${dangerous ? 'danger' : 'primary'}" id="roxyOk">${okLabel}</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);
            overlay.querySelector('#roxyOk').onclick     = () => { overlay.remove(); resolve(true);  };
            overlay.querySelector('#roxyCancel').onclick = () => { overlay.remove(); resolve(false); };
        });
    }
};
