// Sanitasi HTML pengumuman sebelum dirender lewat dangerouslySetInnerHTML.
//
// PILIHAN (fitur pengumuman kaya, Okt 2026): sanitizer minimal ini,
// BUKAN DOMPurify. Alasannya:
//  - DOMPurify belum ada di package.json; menambah dependensi baru =
//    risiko build APK yang ditanggung king saat rebuild (versi,
//    resolusi npm, ukuran bundle) untuk manfaat yang di sini kecil.
//  - Sumber HTML adalah field Html Odoo yang hanya bisa diisi admin
//    dari backend (bukan input publik / input user app), jadi model
//    ancamannya adalah HTML admin yang ceroboh/tertempel, bukan XSS
//    aktif dari penyerang — allowlist tag + buang event handler dan
//    URL berbahaya sudah menutup vektor itu.
//  - Bila suatu hari isi pengumuman boleh datang dari pihak tak
//    tepercaya (mis. input user), ganti fungsi ini dengan DOMPurify
//    (satu-satunya pemakaian dangerouslySetInnerHTML untuk pengumuman
//    ada di PengumumanView dan selalu lewat fungsi ini).
//
// ATURAN:
//  - Tag berbahaya dibuang BESERTA isinya: script, style, iframe,
//    object, embed, form, svg, dan kawan-kawan (svg bisa membawa
//    <script> dan event handler).
//  - Tag tak dikenal dibuang tapi isinya dipertahankan (unwrap), agar
//    teks pengumuman tidak hilang gara-gara satu tag asing.
//  - Atribut: hanya allowlist per tag. SEMUA atribut on* dibuang
//    (case-insensitive, termasuk OnClick). Atribut style hanya lolos
//    sesudah url(...)/expression/javascript: dibersihkan.
//  - URL: <a> hanya http/https/mailto/tel/relatif/# (data: DITOLAK,
//    jadi data:text/html tak bisa jadi link phishing). <img> boleh
//    ditambah data:image raster (png/jpeg/gif/webp) — inilah bentuk
//    gambar ter-embed dari endpoint detail baru; data:image/svg+xml
//    DITOLAK karena SVG bisa membawa script.
//  - Fungsi ini PURE (DOMParser runtime browser/WebView saja, tidak
//    dipanggil di level modul) sehingga vite build tidak menyentuhnya.

const DROP_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'title',
  'textarea', 'noscript', 'template', 'svg', 'math', 'link', 'meta',
  'base', 'frame', 'frameset', 'applet', 'audio', 'video', 'source',
  'button', 'input', 'select', 'option',
]);

const ALLOWED = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span',
  'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'a', 'img', 'table', 'thead', 'tbody',
  'tfoot', 'tr', 'th', 'td', 'hr', 'sub', 'sup', 'small', 'mark',
]);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

function isSafeUrl(url, allowDataImage) {
  const u = String(url || '').trim();
  if (!u) return false;
  // Data URI gambar raster (embed dari endpoint detail).
  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp);/i.test(u)) return true;
  // Skema apa pun selain yang diizinkan di bawah = tolak (termasuk
  // javascript:, vbscript:, data:text/html, dan file:).
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) {
    return /^(https?:|mailto:|tel:)/i.test(u);
  }
  // Tanpa skema = relatif atau anchor (#...) -> aman.
  return true;
}

function scrubStyle(value) {
  return String(value || '')
    .replace(/url\s*\([^)]*\)/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/behaviour/gi, '')
    .replace(/-moz-binding/gi, '')
    .trim();
}

function cleanNode(node) {
  const children = Array.from(node.childNodes);
  for (const child of children) {
    if (child.nodeType === 3) continue; // teks: pertahankan apa adanya
    if (child.nodeType !== 1) {
      child.remove(); // komentar dan node non-elemen lainnya
      continue;
    }
    const tag = child.tagName.toLowerCase();
    if (DROP_CONTENT.has(tag)) {
      child.remove();
      continue;
    }
    if (!ALLOWED.has(tag)) {
      // Bersihkan dulu isi tag asing, lalu unwrap (teksnya tetap ada).
      cleanNode(child);
      while (child.firstChild) node.insertBefore(child.firstChild, child);
      child.remove();
      continue;
    }
    // Tag diizinkan: saring atributnya.
    const allowed = ALLOWED_ATTRS[tag] || new Set();
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        child.removeAttribute(attr.name);
        continue;
      }
      if (name === 'style') {
        const cleaned = scrubStyle(attr.value);
        if (cleaned && !cleaned.includes('<')) child.setAttribute('style', cleaned);
        else child.removeAttribute(attr.name);
        continue;
      }
      if (name === 'target' && tag === 'a' && attr.value === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer');
        continue;
      }
      if (!allowed.has(name)) {
        child.removeAttribute(attr.name);
        continue;
      }
      if ((name === 'href' || name === 'src')
        && !isSafeUrl(attr.value, tag === 'img')) {
        child.removeAttribute(attr.name);
      }
    }
    cleanNode(child);
  }
}

export function sanitizeHtml(html) {
  const raw = String(html || '').trim();
  if (!raw) return '';
  let doc;
  try {
    doc = new DOMParser().parseFromString(raw, 'text/html');
  } catch {
    return '';
  }
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

export default sanitizeHtml;
