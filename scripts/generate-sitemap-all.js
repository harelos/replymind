const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const toolsRoot = path.join(root, 'email-tools');
const sitemapFile = path.join(root, 'sitemap.xml');

const urls = [
  'https://www.replymind.xyz/',
  'https://www.replymind.xyz/email-tools/',
  'https://www.replymind.xyz/email-tools/audiences/',
  'https://www.replymind.xyz/email-tools/audiences/executives-and-founders/',
  'https://www.replymind.xyz/email-tools/audiences/sales-and-account-executives/',
  'https://www.replymind.xyz/email-tools/audiences/engineering-and-product-leads/',
  'https://www.replymind.xyz/email-tools/audiences/freelancers-and-agency-owners/',
  'https://www.replymind.xyz/email-tools/audiences/customer-success-managers/',
];

// English Tools
const englishDirs = fs.readdirSync(toolsRoot, { withFileTypes: true })
  .filter(d => d.isDirectory() && !['assets', 'data', 'audiences', 'de', 'fr', 'es', 'nl', 'it', 'pt'].includes(d.name));

for (const d of englishDirs) {
  urls.push(`https://www.replymind.xyz/email-tools/${d.name}/`);
}

// Multi-language Tools
for (const lang of ['de', 'fr', 'es', 'nl', 'it', 'pt']) {
  const langRoot = path.join(toolsRoot, lang);
  if (fs.existsSync(langRoot)) {
    urls.push(`https://www.replymind.xyz/email-tools/${lang}/`);
    const langDirs = fs.readdirSync(langRoot, { withFileTypes: true }).filter(d => d.isDirectory());
    for (const d of langDirs) {
      urls.push(`https://www.replymind.xyz/email-tools/${lang}/${d.name}/`);
    }
  }
}

// Legal & Core pages
urls.push('https://www.replymind.xyz/privacy.html');
urls.push('https://www.replymind.xyz/terms.html');
urls.push('https://www.replymind.xyz/support.html');
urls.push('https://www.replymind.xyz/refund.html');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc><lastmod>2026-08-07</lastmod></url>`).join('\n')}
</urlset>`;

fs.writeFileSync(sitemapFile, xml, 'utf8');
console.log(`Generated sitemap.xml with ${urls.length} URLs.`);
