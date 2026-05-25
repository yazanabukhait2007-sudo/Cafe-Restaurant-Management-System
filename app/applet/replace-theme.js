const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('./frontend/src');

const replacements = [
  { p: /\bbg-zinc-950\b/g, r: 'bg-orange-50/50' },
  { p: /\bbg-zinc-900\b/g, r: 'bg-orange-100/50' },
  { p: /\bbg-zinc-800\b/g, r: 'bg-orange-200/50' },
  { p: /\bborder-zinc-900\b/g, r: 'border-orange-200' },
  { p: /\bborder-zinc-800\b/g, r: 'border-orange-300' },
  { p: /\bbg-zinc-700\b/g, r: 'bg-orange-300/50' },
  { p: /\bborder-zinc-700\b/g, r: 'border-orange-400' },
  
  { p: /\btext-zinc-100\b/g, r: 'text-stone-900' },
  { p: /\btext-zinc-200\b/g, r: 'text-stone-800' },
  { p: /\btext-zinc-300\b/g, r: 'text-stone-700' },
  { p: /\btext-zinc-400\b/g, r: 'text-stone-600' },
  { p: /\btext-zinc-500\b/g, r: 'text-stone-500' },
  
  { p: /bg-\[\#050505\]/g, r: 'bg-[#FDFBF7]' }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(({p, r}) => {
    content = content.replace(p, r);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
