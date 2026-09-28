const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let checked = 0;
for (const directory of ['js', 'apps-script']) {
  for (const file of fs.readdirSync(path.join(root, directory)).filter(file => file.endsWith('.js'))) {
    new vm.Script(fs.readFileSync(path.join(root, directory, file), 'utf8'), { filename: file });
    checked++;
  }
}
const pages = [...fs.readdirSync(root).filter(file => file.endsWith('.html')), 'tutorial/tutorial.html'];
for (const page of pages) {
  const filename = path.join(root, page);
  const html = fs.readFileSync(filename, 'utf8');
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1], { filename: page });
    checked++;
  }
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(https?:|#|data:)/.test(match[1])) continue;
    if (!fs.existsSync(path.resolve(path.dirname(filename), match[1]))) throw Error('Missing file: ' + page + ' → ' + match[1]);
  }
}
console.log(checked + ' script blocks parsed; local HTML links and assets resolve.');
