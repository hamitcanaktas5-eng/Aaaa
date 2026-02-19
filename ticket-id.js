// ─── BİLET NUMARASI SİSTEMİ ───

// Tarih formatı: DDMMYYYY
function getDateStr() {
    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + mm + yyyy;
}

// 4 haneli alfanümerik rastgele (harfler + rakamlar)
function randAlphaNum(len) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var result = '';
    for (var i = 0; i < len; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// VN-01032026-3G7K
function generateVNId() {
    return 'VN-' + getDateStr() + '-' + randAlphaNum(4);
}

// SMM-04022026-8K9F
function generateSMMId() {
    return 'SMM-' + getDateStr() + '-' + randAlphaNum(4);
}

// TKT-04012026-0001 (sıralı numara)
function generateTKTId(count) {
    var n = String(count).padStart(4, '0');
    return 'TKT-' + getDateStr() + '-' + n;
}
