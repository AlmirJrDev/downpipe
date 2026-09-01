/**
 * Publica o PWA dentro do backend.
 *
 * O backend serve a landing e o app na mesma origem (é o que elimina o CORS
 * e deixa tudo atrás de uma URL só). Como os dois projetos moram em pastas
 * separadas, o export precisa ser copiado pra dentro do repositório do
 * backend, que é o que vai pro Render.
 *
 * A pasta de destino se chama "web" de propósito: "dist" está no .gitignore
 * do backend e o build nunca chegaria ao servidor.
 *
 * Uso:  npm run build:web
 * O destino vem de BACKEND_WEB_DIR (no .env, que é local e não versionado).
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Lê BACKEND_WEB_DIR do .env sem depender de pacote de dotenv. */
function destino() {
  if (process.env.BACKEND_WEB_DIR) return process.env.BACKEND_WEB_DIR;
  const env = join(raiz, '.env');
  if (existsSync(env)) {
    for (const linha of readFileSync(env, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*BACKEND_WEB_DIR\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const alvo = destino();
if (!alvo) {
  console.error(
    'Falta BACKEND_WEB_DIR.\n\n' +
      'Aponte para a pasta "web" dentro do repositório do backend, no .env deste projeto:\n' +
      '  BACKEND_WEB_DIR=C:/caminho/para/gearhead-backend-completo/web\n'
  );
  process.exit(1);
}

console.log('1/3  exportando o PWA...');
execSync('npx expo export --platform web --clear', { cwd: raiz, stdio: 'inherit' });

const origem = join(raiz, 'dist');
if (!existsSync(origem)) {
  console.error('O export não gerou a pasta dist.');
  process.exit(1);
}

console.log('2/3  limpando o destino...');
// Apaga antes de copiar: os bundles têm hash no nome, e sem limpar o
// repositório do backend acumularia um arquivo de 4 MB por deploy.
rmSync(alvo, { recursive: true, force: true });
mkdirSync(alvo, { recursive: true });

console.log('3/3  copiando para ' + alvo);

/**
 * Cópia manual em vez de cpSync.
 *
 * O cpSync recursivo devolve sucesso e não copia nada quando o destino fica
 * dentro do OneDrive (caminho com espaços e acento). copyFileSync no mesmo
 * caminho funciona — então a recursão é feita à mão, e no fim o número de
 * arquivos é conferido.
 */
function copiar(de, para) {
  mkdirSync(para, { recursive: true });
  let n = 0;
  for (const item of readdirSync(de, { withFileTypes: true })) {
    const origemItem = join(de, item.name);
    const destinoItem = join(para, item.name);
    if (item.isDirectory()) n += copiar(origemItem, destinoItem);
    else { copyFileSync(origemItem, destinoItem); n++; }
  }
  return n;
}

function contar(dir) {
  let n = 0;
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    n += item.isDirectory() ? contar(join(dir, item.name)) : 1;
  }
  return n;
}

const copiados = copiar(origem, alvo);
const esperados = contar(origem);
if (copiados !== esperados) {
  console.error(`FALHOU: copiou ${copiados} de ${esperados} arquivos.`);
  process.exit(1);
}
console.log(`     ${copiados} arquivos copiados`);

console.log('\nPronto. Agora, no repositório do backend:');
console.log('  git add web && git commit -m "Atualiza o PWA" && git push');
