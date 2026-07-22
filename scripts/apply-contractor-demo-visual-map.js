const fs = require('fs');
const path = 'assets/js/h38-contractor-demo-data.js';
let text = fs.readFileSync(path, 'utf8');
const replacements = {
  'assets/approved-website-images/01-landscape-before.jpg': 'assets/contractor-demo/flower-before.svg',
  'assets/approved-website-images/03-yard-improvement-after.jpg': 'assets/contractor-demo/flower-after.svg',
  'assets/approved-website-images/02-landscape-construction.jpg': 'assets/contractor-demo/driveway-before.svg',
  'assets/approved-website-images/11-exterior-shop-building.jpg': 'assets/contractor-demo/driveway-after.svg'
};
for (const [from, to] of Object.entries(replacements)) text = text.replace(from, to);
text = text.replace('"12YDZ4GVNUnF0gRWuBqVxTAgzG8tiY6z3": "assets/contractor-demo/flower-before.svg"', '"12YDZ4GVNUnF0gRWuBqVxTAgzG8tiY6z3": "assets/contractor-demo/pond-before.svg"');
text = text.replace('"18d2FE5VGjM_q62KKTq12w6rsQ0otdUfk": "assets/contractor-demo/flower-after.svg"', '"18d2FE5VGjM_q62KKTq12w6rsQ0otdUfk": "assets/contractor-demo/pond-after.svg"');
text = text.replace('"1DZ55aulS2fzUrJsy1BsibrzzwaiZ_lv5": "assets/contractor-demo/flower-before.svg"', '"1DZ55aulS2fzUrJsy1BsibrzzwaiZ_lv5": "assets/contractor-demo/lot-before.svg"');
text = text.replace('"1JU1RbFotwLziQJ5SJsEWgwE2lterUSh9": "assets/contractor-demo/driveway-before.svg"', '"1JU1RbFotwLziQJ5SJsEWgwE2lterUSh9": "assets/contractor-demo/lot-after.svg"');
text = text.replace('version: "2026.07.22.2"', 'version: "2026.07.22.3"');
fs.writeFileSync(path, text);
