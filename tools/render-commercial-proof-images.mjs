import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const fixture = pathToFileURL(path.join(root, 'tests/fixtures/commercial-proof-generator.html')).href;
const outputs = [
  ['P001', 'assets/rick-review-problem-snapshot-v1.png'],
  ['P002', 'assets/rick-review-basic-layout-v1.png'],
  ['P003', 'assets/rick-review-project-packet-v1.png'],
  ['P004', 'assets/rick-review-shop-flow-v1.png'],
  ['P005', 'assets/rick-review-business-cleanup-v1.png'],
  ['P006', 'assets/rick-review-cleanup-rescue-v1.png'],
  ['P007', 'assets/rick-review-workflow-opportunity-v1.png'],
  ['P010', 'assets/product-proof/automation-opportunity-snapshot.png'],
  ['P013', 'assets/product-proof/fixture-jig-concept-review.png'],
  ['P015', 'assets/product-proof/robot-tending-concept-pack.png']
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
for (const [id, relativePath] of outputs) {
  const outputPath = path.join(root, relativePath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await page.goto(`${fixture}?id=${id}`, { waitUntil: 'load' });
  await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
  console.log(`Rendered ${id} -> ${relativePath}`);
}
await browser.close();
