import 'dotenv/config';
import { seedIfEmpty } from '../db.js';

const r = seedIfEmpty();
console.log(r.seeded ? '✅ Seeded demo data' : 'ℹ️ DB not empty — seed skipped');
process.exit(0);
