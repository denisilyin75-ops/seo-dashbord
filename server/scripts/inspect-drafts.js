// Quick draft inspector — pulls metadata from /tmp/draft-{id}.json files
import fs from 'node:fs';

const ids = [54, 55, 56, 57, 58];

function inspect(id) {
  const j = JSON.parse(fs.readFileSync(process.env.TMP_DIR + '/draft-' + id + '.json', 'utf8'));
  const html = j.content.raw || '';
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const count = pattern => (html.match(new RegExp(pattern, 'gi')) || []).length;
  return {
    id,
    title: j.title.raw,
    word_count: text.split(/\s+/).length,
    h1: count('<h1[^>]*>'),
    h2: count('<h2[^>]*>'),
    h3: count('<h3[^>]*>'),
    h4: count('<h4[^>]*>'),
    tables: count('<table[^>]*>'),
    images_in_body: count('<img[^>]*>'),
    buttons: count('wp-block-button|wpsm-button|rehub_main_btn'),
    rehub_shortcodes: count('\\[wpsm_|\\[rehub_'),
    pros_cons: /плюс|минус|wp-block-pullquote|wpsm-pros|wpsm-cons/i.test(html) ? 'yes' : 'no',
    internal_links: (html.match(/href="https?:\/\/popolkam\.ru[^"]*/g) || []).length,
    external_links: (html.match(/href="https?:\/\/(?!popolkam\.ru)[^"]*/g) || []).length,
    affiliate_links: count('rel="sponsored"|rel="nofollow sponsored"|rel="noopener nofollow sponsored"'),
    faq: /faq|часто задаваем|q&|вопросы/i.test(html) ? 'yes' : 'no',
    price_block: /\d{1,3}[  ]?\d{3}[  ]?(₽|руб)/i.test(html) ? 'yes' : 'no',
    raw_size: html.length,
  };
}

const results = ids.map(inspect);

const cols = ['id', 'words', 'h1', 'h2', 'h3', 'h4', 'tbl', 'img', 'btn', 'rh-sc', 'intl', 'extl', 'aff'];
console.log('\n' + cols.map(c => c.padEnd(6)).join('') + 'title');
for (const r of results) {
  const row = [
    String(r.id).padEnd(6),
    String(r.word_count).padEnd(6),
    String(r.h1).padEnd(6),
    String(r.h2).padEnd(6),
    String(r.h3).padEnd(6),
    String(r.h4).padEnd(6),
    String(r.tables).padEnd(6),
    String(r.images_in_body).padEnd(6),
    String(r.buttons).padEnd(6),
    String(r.rehub_shortcodes).padEnd(6),
    String(r.internal_links).padEnd(6),
    String(r.external_links).padEnd(6),
    String(r.affiliate_links).padEnd(6),
    r.title.slice(0, 70),
  ];
  console.log(row.join(''));
}
console.log();
console.log('Indicators (pros/cons | faq | price | h1-extra-in-body):');
for (const r of results) {
  console.log(`  id=${r.id}: pros-cons=${r.pros_cons} | faq=${r.faq} | price=${r.price_block} | h1=${r.h1 > 0 ? 'YES (problem)' : 'no (ok)'}`);
}
