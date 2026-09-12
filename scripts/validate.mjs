import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'privacy.html', 'support.html', 'terms.html'];

for (const page of pages) {
  const source = fs.readFileSync(path.join(root, page), 'utf8');

  assert.match(source, /<!DOCTYPE html>/i, `${page}: missing HTML5 doctype`);
  assert.match(source, /<html lang="en">/i, `${page}: missing language`);
  assert.match(source, /<meta charset="UTF-8">/i, `${page}: missing UTF-8`);
  assert.match(source, /name="viewport"/i, `${page}: missing viewport`);
  assert.equal(
    (source.match(/<title>/gi) ?? []).length,
    1,
    `${page}: expected one title`,
  );

  for (const attribute of source.matchAll(/\b(?:href|src)="([^"]+)"/gi)) {
    const value = attribute[1];
    assert.doesNotMatch(
      value,
      /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i,
      `${page}: unescaped ampersand in URL attribute`,
    );

    const decoded = value.replaceAll('&amp;', '&');
    if (/^(?:https?:|mailto:|tel:|#)/i.test(decoded)) continue;
    const target = decoded.split(/[?#]/, 1)[0];
    assert.ok(
      fs.existsSync(path.resolve(root, target)),
      `${page}: missing local link target ${target}`,
    );
  }

  for (const link of source.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
    assert.match(
      link[0],
      /rel="[^"]*noopener[^"]*"/i,
      `${page}: external tab is missing rel=noopener`,
    );
  }
}

const combined = pages
  .map((page) => fs.readFileSync(path.join(root, page), 'utf8'))
  .join('\n');
const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
const support = fs.readFileSync(path.join(root, 'support.html'), 'utf8');

assert.doesNotMatch(combined, /fully GDPR\/?CCPA compliant/i);
assert.doesNotMatch(combined, /minimum age requirement \(17\+\)/i);
assert.match(privacy, /minimum age requirement \(18\+\)/i);
assert.match(privacy, /Anthropic/i);
assert.match(privacy, /Cloudflare/i);
assert.match(privacy, /Settings &rarr; Export My Data/i);
assert.match(privacy, /Settings &rarr; Delete Account/i);
assert.match(support, /Do not email a password, one-time code, government/i);

console.log(`Validated ${pages.length} Sippers legal pages.`);
