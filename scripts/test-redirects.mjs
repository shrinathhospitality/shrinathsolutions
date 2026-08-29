#!/usr/bin/env node
// Server-level redirect/status tests for the rules in .htaccess and api/spa-router.php.
// These only exercise real Apache + PHP behaviour, so this script is only meaningful against
// a deployed environment (`npm run test:redirects -- https://shrinathsolutions.com`) — it
// cannot be run against the Vite dev server or `vite preview`, neither of which apply
// .htaccess. Not run automatically as part of any build step.
//
// Usage: node scripts/test-redirects.mjs [baseUrl]

const base = (process.argv[2] || 'https://shrinathsolutions.com').replace(/\/$/, '');

const cases = [
  { name: 'www -> apex + https', path: '/', host: 'www.shrinathsolutions.com', expectStatus: 301, expectLocationIncludes: 'https://shrinathsolutions.com/' },
  { name: 'trailing slash stripped', path: '/about/', expectStatus: 301, expectLocationIncludes: '/about' },
  { name: 'root trailing slash kept', path: '/', expectStatus: 200 },
  { name: 'index.html collapses to /', path: '/index.html', expectStatus: 301, expectLocationIncludes: base + '/' },
  { name: 'wp-admin gone', path: '/wp-admin/', expectStatus: 410 },
  { name: 'wp-login gone', path: '/wp-login.php', expectStatus: 410 },
  { name: 'xmlrpc gone', path: '/xmlrpc.php', expectStatus: 410 },
  { name: 'feed gone', path: '/feed/', expectStatus: 410 },
  { name: 'post feed gone', path: '/some-old-post/feed/', expectStatus: 410 },
  { name: 'category archive gone (not redirected)', path: '/category/hotels/', expectStatus: 410 },
  { name: 'tag archive gone (not redirected)', path: '/tag/seo/', expectStatus: 410 },
  { name: 'author archive gone (not redirected)', path: '/author/admin/', expectStatus: 410 },
  { name: 'blog-list redirects to /blog', path: '/blog-list/', expectStatus: 301, expectLocationIncludes: '/blog' },
  { name: 'sitemap.xml served', path: '/sitemap.xml', expectStatus: 200 },
  { name: 'known static route 200', path: '/our-ventures', expectStatus: 200 },
  { name: 'unknown path is a true 404', path: '/this-path-does-not-exist-xyz', expectStatus: 404 },
  { name: 'unknown blog slug is a true 404', path: '/blog/this-slug-does-not-exist-xyz', expectStatus: 404 },
  { name: 'unknown api route returns JSON 404', path: '/api/public/does-not-exist', expectStatus: 404 },
];

async function run(c) {
  const url = `https://${c.host || new URL(base).host}${c.path}`;
  try {
    const res = await fetch(url, { redirect: 'manual', headers: c.host ? { Host: c.host } : {} });
    const location = res.headers.get('location') || '';
    const statusOk = res.status === c.expectStatus;
    const locationOk = !c.expectLocationIncludes || location.includes(c.expectLocationIncludes);
    const pass = statusOk && locationOk;
    console.log(
      `${pass ? 'PASS' : 'FAIL'}  ${c.name}\n` +
      `  input:    ${url}\n` +
      `  expected: ${c.expectStatus}${c.expectLocationIncludes ? ' -> ' + c.expectLocationIncludes : ''}\n` +
      `  actual:   ${res.status}${location ? ' -> ' + location : ''}`
    );
    return pass;
  } catch (e) {
    console.log(`FAIL  ${c.name}\n  input: ${url}\n  error: ${e.message}`);
    return false;
  }
}

const results = [];
for (const c of cases) results.push(await run(c));
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
