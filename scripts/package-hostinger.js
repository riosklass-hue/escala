import { execSync } from 'child_process';
import path from 'path';

try {
  const pyScript = path.resolve(process.cwd(), 'scripts/package-hostinger.py');
  execSync(`python3 "${pyScript}"`, { stdio: 'inherit' });
  
  const pySourceScript = path.resolve(process.cwd(), 'scripts/package-source.py');
  execSync(`python3 "${pySourceScript}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('[Packager] Falha ao gerar pacotes zip:', err);
  process.exitCode = 1;
}

