#!/usr/bin/env node
/**
 * Prepara o app pra ser testado por outras pessoas.
 *
 * Lê a URL pública do ngrok (que já deve estar rodando apontando pro backend
 * na porta 3000), grava em EXPO_PUBLIC_API_URL no .env e sobe o Expo com
 * tunnel. Sem isso, o passo de copiar a URL na mão é o que mais quebra:
 * EXPO_PUBLIC_* é embutido no bundle na hora que o Expo inicia, então uma URL
 * errada/velha só aparece como "erro de conexão" no celular do testador.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = join(ROOT, ".env");
// O próprio Expo (--tunnel) sobe um agente ngrok e costuma tomar a 4040, o
// que empurra o SEU ngrok pra 4041+. Por isso varre um intervalo em vez de
// olhar só a 4040, e escolhe o túnel pelo destino (porta 3000), nunca pela
// ordem da lista.
const AGENT_PORTS = [4040, 4041, 4042, 4043, 4044];
const BACKEND_PORT = "3000";

/**
 * Porta do Metro/Expo. Configurável porque a 8081 costuma estar ocupada (por
 * outra instância do Expo, ou por qualquer coisa que use essa porta padrão).
 * O valor não serve só pra subir o Expo: é por ele que este script identifica
 * qual túnel é o do app na lista do ngrok — mudar a porta na mão, sem passar
 * por aqui, faria a página de status nunca sair de OFFLINE.
 *
 *   npm run share -- --port=8082
 *   EXPO_PORT=8082 npm run share
 */
const portArg = process.argv.find((a) => a.startsWith("--port="));
const EXPO_PORT = (portArg?.split("=")[1] ?? process.env.EXPO_PORT ?? "8081").trim();

if (!/^\d{2,5}$/.test(EXPO_PORT)) {
  console.error(`❌ Porta inválida: "${EXPO_PORT}". Use algo como --port=8082`);
  process.exit(1);
}

async function getNgrokUrl() {
  let anyAgentFound = false;

  for (const port of AGENT_PORTS) {
    let res;
    try {
      res = await fetch(`http://127.0.0.1:${port}/api/tunnels`, {
        signal: AbortSignal.timeout(2000),
      });
    } catch {
      continue; // nada escutando nessa porta
    }

    anyAgentFound = true;

    let tunnels;
    try {
      ({ tunnels } = await res.json());
    } catch {
      continue;
    }

    const match = (tunnels ?? []).find(
      (t) => t.public_url?.startsWith("https://") && String(t.config?.addr ?? "").includes(BACKEND_PORT)
    );

    if (match) return match.public_url;
  }

  console.error(
    anyAgentFound
      ? `
❌ Achei ngrok rodando, mas nenhum túnel apontando pra porta ${BACKEND_PORT} (o backend).

Abra OUTRO terminal e rode:

    ngrok http ${BACKEND_PORT}
`
      : `
❌ Não achei o ngrok rodando.

Abra OUTRO terminal e rode:

    ngrok http ${BACKEND_PORT}

Deixe ele aberto e rode este comando de novo.
`
  );
  process.exit(1);
}

async function checkBackend(url) {
  try {
    const res = await fetch(`${url}/health`, { headers: { "ngrok-skip-browser-warning": "1" } });
    const json = await res.json();
    return json?.data?.status === "ok";
  } catch {
    return false;
  }
}

function writeEnv(url) {
  const line = `EXPO_PUBLIC_API_URL=${url}`;
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";

  if (/^EXPO_PUBLIC_API_URL=.*$/m.test(content)) {
    content = content.replace(/^EXPO_PUBLIC_API_URL=.*$/m, line);
  } else {
    content += `${content.endsWith("\n") || content === "" ? "" : "\n"}${line}\n`;
  }

  writeFileSync(ENV_PATH, content);
}

/** Lê uma chave do .env sem depender de biblioteca. */
function readEnvValue(key) {
  if (!existsSync(ENV_PATH)) return null;
  const match = readFileSync(ENV_PATH, "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : null;
}

/**
 * Com o backend hospedado, não existe ngrok pra procurar — e insistir nele
 * sobrescreveria a URL de produção com um túnel local. Então: se já houver
 * uma API pública configurada (por --api=, por API_URL, ou pelo próprio .env
 * apontando pra algo que não é ngrok), usa ela e nem toca no túnel.
 *
 *   npm run share -- --api=https://downpipe-api.onrender.com
 */
async function resolveHostedApi() {
  const fromArg = process.argv.find((a) => a.startsWith("--api="))?.split("=")[1];
  const candidate = (fromArg ?? process.env.API_URL ?? readEnvValue("EXPO_PUBLIC_API_URL") ?? "")
    .trim()
    .replace(/\/$/, "");

  if (!candidate || candidate.includes("ngrok") || candidate.includes("localhost")) return null;
  if (!candidate.startsWith("https://")) return null;

  // Só aceita se estiver mesmo no ar: uma URL velha e fora do ar levaria o
  // testador ao mesmo "erro de conexão" que este script existe pra evitar.
  return (await checkBackend(candidate)) ? candidate : null;
}

/** Lê o segredo do .env sem depender de biblioteca. */
function readSecret() {
  if (!existsSync(ENV_PATH)) return null;
  const match = readFileSync(ENV_PATH, "utf8").match(/^STATUS_SECRET=(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * Descobre a URL pública do túnel do Expo pelo mesmo caminho usado pro
 * backend: o `expo start --tunnel` sobe o próprio agente ngrok, e o túnel
 * dele aponta pra porta do Metro. Como o Expo demora a subir, tenta por um
 * tempo antes de desistir.
 */
async function waitForExpoUrl(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const port of AGENT_PORTS) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/tunnels`, {
          signal: AbortSignal.timeout(2000),
        });
        const { tunnels } = await res.json();
        const match = (tunnels ?? []).find(
          (t) => t.public_url?.startsWith("https://") && String(t.config?.addr ?? "").includes(EXPO_PORT)
        );
        // Expo Go abre pelo esquema exp://, não https://.
        if (match) return match.public_url.replace(/^https:\/\//, "exp://");
      } catch {
        // porta sem agente ou ainda subindo — tenta de novo
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

async function publishSession(backendUrl, expoUrl, secret) {
  const res = await fetch(`${backendUrl}/status/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-status-secret": secret,
      "ngrok-skip-browser-warning": "1",
    },
    body: JSON.stringify({ expoUrl }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

const hosted = await resolveHostedApi();
const url = hosted ?? (await getNgrokUrl());

if (hosted) {
  console.log(`🔗 Backend hospedado: ${url}`);
  console.log("✅ Respondendo. Nada de ngrok — o backend não depende mais desta máquina.");
} else {
  console.log(`🔗 Backend público (ngrok): ${url}`);
  if (await checkBackend(url)) {
    console.log("✅ Backend respondendo pelo túnel.");
  } else {
    console.warn("⚠️  O túnel existe mas /health não respondeu. O backend (npm run dev) está rodando?");
  }
}

writeEnv(url);
console.log("✅ .env atualizado com essa URL.\n");
console.log(`Subindo o Expo na porta ${EXPO_PORT} com tunnel — os testadores escaneiam o QR pelo Expo Go.\n`);

// -c limpa o cache do Metro: sem isso ele pode servir um bundle com a URL
// antiga. Comando vai como string única (e não string + array de args) porque
// shell:true é obrigatório no Windows pra resolver o npx, e a combinação
// shell:true + array dispara um DeprecationWarning barulhento do Node.
const expo = spawn(`npx expo start --tunnel -c --port ${EXPO_PORT}`, {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

const secret = readSecret();
if (!secret) {
  console.warn("\n⚠️  STATUS_SECRET não está no .env — a página de status não vai marcar o app como online.\n");
} else {
  // Em paralelo ao Expo: assim que o túnel dele existir, avisa a página.
  waitForExpoUrl().then(async (expoUrl) => {
    if (!expoUrl) {
      console.warn("\n⚠️  Não consegui descobrir a URL do túnel do Expo; página de status seguirá offline.\n");
      return;
    }
    try {
      await publishSession(url, expoUrl, secret);
      console.log(`\n📡 Página de status atualizada: ${url}/status`);
      console.log(`   (é este link que você manda pros testadores)\n`);
    } catch (err) {
      console.warn(`\n⚠️  Falha ao publicar na página de status: ${err.message}\n`);
    }
  });
}

// Ao encerrar (Ctrl+C), marca o app como offline em vez de deixar a página
// mentindo até a sessão expirar sozinha.
const goOffline = async () => {
  if (secret) {
    try {
      await fetch(`${url}/status/session`, {
        method: "DELETE",
        headers: { "x-status-secret": secret, "ngrok-skip-browser-warning": "1" },
      });
    } catch {
      // backend já pode ter caído junto — a sessão expira sozinha de qualquer forma
    }
  }
  expo.kill();
  process.exit(0);
};
process.on("SIGINT", goOffline);
process.on("SIGTERM", goOffline);
