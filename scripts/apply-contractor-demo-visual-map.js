const fs = require('fs');
const path = 'assets/js/h38-contractor-demo-data.js';
let text = fs.readFileSync(path, 'utf8');
const replacements = [
  ['"12YDZ4GVNUnF0gRWuBqVxTAgzG8tiY6z3": "assets/approved-website-images/01-landscape-before.jpg"', '"12YDZ4GVNUnF0gRWuBqVxTAgzG8tiY6z3": "assets/contractor-demo/pond-before.svg"'],
  ['"18d2FE5VGjM_q62KKTq12w6rsQ0otdUfk": "assets/approved-website-images/03-yard-improvement-after.jpg"', '"18d2FE5VGjM_q62KKTq12w6rsQ0otdUfk": "assets/contractor-demo/pond-after.svg"'],
  ['"1DZ55aulS2fzUrJsy1BsibrzzwaiZ_lv5": "assets/approved-website-images/01-landscape-before.jpg"', '"1DZ55aulS2fzUrJsy1BsibrzzwaiZ_lv5": "assets/contractor-demo/lot-before.svg"'],
  ['"1JU1RbFotwLziQJ5SJsEWgwE2lterUSh9": "assets/approved-website-images/02-landscape-construction.jpg"', '"1JU1RbFotwLziQJ5SJsEWgwE2lterUSh9": "assets/contractor-demo/lot-after.svg"']
];
for (const [from, to] of replacements) text = text.replace(from, to);
fs.writeFileSync(path, text);
