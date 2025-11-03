import fs from 'node:fs';
import path from 'node:path';

import { buildOpenApiDocument } from './openapi.js';

function main() {
    const document = buildOpenApiDocument();
    const outputPath = path.resolve(process.cwd(), 'openapi.json');
    fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`OpenAPI spec written to ${outputPath}`);
}

main();
