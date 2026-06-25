#!/usr/bin/env node
/**
 * scripts/verify-build.js
 *
 * Roda todos os checks possiveis LOCALMENTE antes de disparar um eas build.
 * Cada build EAS leva 15-30 minutos e consome creditos — vale a pena
 * filtrar o que da pra detectar sem subir nada.
 *
 * Uso:
 *   node scripts/verify-build.js
 *   node scripts/verify-build.js --platform ios
 *   node scripts/verify-build.js --skip-prebuild   (mais rapido, pula simulacao prebuild)
 *
 * Saida 0 = tudo OK -> pode rodar `eas build`.
 * Saida != 0 = problemas encontrados -> corrigir antes do build.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const platformArg = (() => {
  const idx = args.indexOf('--platform');
  return idx !== -1 ? args[idx + 1] : 'ios';
})();
const skipPrebuild = args.includes('--skip-prebuild');

const RESULTS = [];
let HAS_FATAL = false;

const ICON = { ok: '✓', warn: '!', fail: 'X' };

function record(level, name, detail) {
  RESULTS.push({ level, name, detail });
  if (level === 'fail') HAS_FATAL = true;
  const prefix = level === 'ok' ? `[${ICON.ok}]` : level === 'warn' ? `[${ICON.warn}]` : `[${ICON.fail}]`;
  console.log(`${prefix} ${name}${detail ? ' — ' + detail : ''}`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function tryExec(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { cwd: ROOT, stdio: 'pipe', ...opts });
    return { ok: true, out: out.toString() };
  } catch (e) {
    return { ok: false, out: (e.stdout?.toString() || '') + (e.stderr?.toString() || ''), error: e };
  }
}

// ====================================================================
console.log('\n=== Pre-build checks para ' + platformArg.toUpperCase() + ' ===\n');

// 1) app.json existe e tem campos basicos
function checkAppJson() {
  if (!fileExists('app.json')) {
    record('fail', 'app.json existe', 'arquivo nao encontrado');
    return;
  }
  let cfg;
  try { cfg = readJson('app.json'); }
  catch (e) { record('fail', 'app.json valido (JSON parse)', e.message); return; }

  const expo = cfg.expo || {};
  const reqd = ['name', 'slug', 'version', 'icon', 'splash', 'ios', 'android'];
  const missing = reqd.filter(k => !expo[k]);
  if (missing.length) record('fail', 'app.json campos obrigatorios', 'faltam: ' + missing.join(', '));
  else record('ok', 'app.json campos obrigatorios');

  if (!expo.ios?.bundleIdentifier) record('fail', 'app.json ios.bundleIdentifier');
  else record('ok', 'app.json ios.bundleIdentifier = ' + expo.ios.bundleIdentifier);

  if (!expo.android?.package) record('fail', 'app.json android.package');
  else record('ok', 'app.json android.package = ' + expo.android.package);

  if (!expo.ios?.buildNumber) record('warn', 'app.json ios.buildNumber ausente');
  else record('ok', 'app.json ios.buildNumber = ' + expo.ios.buildNumber);

  if (!expo.android?.versionCode) record('warn', 'app.json android.versionCode ausente');
  else record('ok', 'app.json android.versionCode = ' + expo.android.versionCode);

  // runtime/updates: se um existe, o outro tambem precisa
  if (expo.updates?.url && !expo.runtimeVersion) {
    record('fail', 'app.json runtimeVersion (exigido com updates.url)');
  } else if (expo.runtimeVersion && !expo.updates?.url) {
    record('warn', 'app.json updates.url ausente (mas runtimeVersion presente)');
  } else if (expo.updates?.url && expo.runtimeVersion) {
    record('ok', 'app.json runtimeVersion + updates.url');
  } else {
    record('warn', 'app.json sem EAS Update (ok se nao for usar OTA)');
  }
}

// 2) eas.json tem channel em cada perfil que casa com updates.url
function checkEasJson() {
  if (!fileExists('eas.json')) { record('fail', 'eas.json existe'); return; }
  let eas;
  try { eas = readJson('eas.json'); }
  catch (e) { record('fail', 'eas.json valido (JSON parse)', e.message); return; }

  const profiles = eas.build || {};
  const hasUpdatesUrl = !!readJson('app.json').expo?.updates?.url;

  for (const name of Object.keys(profiles)) {
    if (hasUpdatesUrl && !profiles[name].channel) {
      record('fail', `eas.json profile "${name}" channel`, 'updates.url no app.json exige channel aqui');
    } else {
      record('ok', `eas.json profile "${name}"${profiles[name].channel ? ' channel=' + profiles[name].channel : ''}`);
    }
  }
}

// 3) Pastas nativas — modo CNG: nao devem existir comitadas
function checkNativeFolders() {
  const hasAndroid = fileExists('android');
  const hasIos = fileExists('ios');
  if (!hasAndroid && !hasIos) {
    record('ok', 'modo CNG (sem android/ios commitados)');
    return;
  }
  // se existir, .gitignore precisa cobrir
  const gi = fileExists('.gitignore') ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
  const giHasAndroid = /^\/?android\/?$/m.test(gi);
  const giHasIos = /^\/?ios\/?$/m.test(gi);

  if (hasAndroid) {
    record(giHasAndroid ? 'warn' : 'fail',
      'pasta android/ existe localmente',
      giHasAndroid ? 'ignorada no git, ok' : 'conflita com app.json (modo CNG) — apagar ou commitar e remover configs nativas do app.json'
    );
  }
  if (hasIos) {
    record(giHasIos ? 'warn' : 'fail', 'pasta ios/ existe localmente',
      giHasIos ? 'ignorada no git, ok' : 'conflita com app.json (modo CNG)');
  }
}

// 4) node_modules consistente
function checkNodeModules() {
  if (!fileExists('node_modules')) { record('fail', 'node_modules existe', 'rode `npm install`'); return; }
  if (!fileExists('package-lock.json')) record('warn', 'package-lock.json ausente');
  else record('ok', 'package-lock.json presente');

  // detecta RN duplicado dentro de si (causou crash no passado)
  if (fileExists('node_modules/react-native/node_modules/react-native')) {
    record('fail', 'react-native duplicado em node_modules', 'reinstale: rm -rf node_modules package-lock.json && npm install');
  } else {
    record('ok', 'react-native sem duplicacao em node_modules');
  }

  // axios precisa estar numa versao com layout legacy (1.7.x)
  try {
    const axios = readJson('node_modules/axios/package.json');
    const v = axios.version || '0.0.0';
    if (/^1\.7\./.test(v)) record('ok', 'axios versao = ' + v + ' (compativel com Metro)');
    else record('fail', 'axios versao = ' + v, 'use 1.7.x — `npm install axios@1.7.9 --save-exact`');
  } catch { record('warn', 'axios nao encontrado em node_modules'); }
}

// Helper: remove pastas nativas geradas (que estao no .gitignore) para
// nao enganar o expo-doctor. Pastas commitadas (NAO ignoradas) sao preservadas.
function limparPastasNativasGeradas(motivo) {
  const gi = fileExists('.gitignore') ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
  const giHasAndroid = /^\/?android\/?$/m.test(gi);
  const giHasIos = /^\/?ios\/?$/m.test(gi);

  if (fileExists('android') && giHasAndroid) {
    console.log(`  Limpando android/ (gerada por prebuild simulado, ${motivo})`);
    tryExec('rm -rf android');
  }
  if (fileExists('ios') && giHasIos) {
    console.log(`  Limpando ios/ (gerada por prebuild simulado, ${motivo})`);
    tryExec('rm -rf ios');
  }
}

// 5) expo-doctor (oficial)
function checkExpoDoctor() {
  // Garante que pastas nativas geradas em runs anteriores nao estao presentes
  limparPastasNativasGeradas('pre-doctor');

  console.log('\n  Rodando expo-doctor (pode levar 30s)...');
  const r = tryExec('npx --yes expo-doctor');
  if (r.ok) {
    record('ok', 'expo-doctor 16/16');
  } else {
    record('fail', 'expo-doctor falhou', '\n' + r.out.split('\n').slice(-15).join('\n'));
  }
}

// 6) simulacao de prebuild (gera android/ios temporario e descarta).
//    No Windows nao da pra gerar projeto iOS (precisa de macOS/Linux),
//    entao se o alvo for iOS rodamos prebuild de ANDROID — isso ja valida
//    a maioria dos problemas (config plugins, app.json invalido, etc).
function checkPrebuild() {
  if (skipPrebuild) {
    record('warn', 'prebuild simulado pulado (--skip-prebuild)');
    return;
  }

  const isWindows = process.platform === 'win32';
  let runPlatform = platformArg;

  if (isWindows && platformArg === 'ios') {
    console.log('\n  Windows nao gera projeto iOS local. Simulando ANDROID para validar config plugins.');
    runPlatform = 'android';
  }

  console.log(`\n  Rodando expo prebuild --platform ${runPlatform} --no-install --clean (1-2min)...`);
  const r = tryExec(`npx --yes expo prebuild --platform ${runPlatform} --no-install --clean`);

  // Limpa qualquer pasta gerada (--clean nem sempre eh 100% efetivo no Windows)
  limparPastasNativasGeradas('pos-prebuild');

  if (r.ok) {
    const label = (isWindows && platformArg === 'ios')
      ? `expo prebuild ANDROID simulado (proxy para iOS no Windows)`
      : `expo prebuild ${runPlatform} simulado`;
    record('ok', label);
  } else {
    record('fail', `expo prebuild ${runPlatform} simulado`,
      '\n' + r.out.split('\n').slice(-20).join('\n'));
  }
}

// 7) Confere se os links legais estao presentes (LGPD)
function checkLegalLinks() {
  const loginFile = 'src/pages/Login/index.js';
  if (!fileExists(loginFile)) {
    record('warn', 'Login screen', 'arquivo nao encontrado');
    return;
  }
  const content = fs.readFileSync(path.join(ROOT, loginFile), 'utf8');
  const hasPrivacy = /sga-engeativos\.com\.br\/privacidade/.test(content);
  const hasSuporte = /sga-engeativos\.com\.br\/suporte/.test(content);
  if (hasPrivacy && hasSuporte) record('ok', 'links de Privacidade/Suporte no Login');
  else record('warn', 'links legais', `Privacidade=${hasPrivacy} Suporte=${hasSuporte}`);
}

// ====================================================================
checkAppJson();
checkEasJson();
checkNativeFolders();
checkNodeModules();
checkLegalLinks();
checkExpoDoctor();
checkPrebuild();

// ====================================================================
console.log('\n=== Resumo ===');
const okCount = RESULTS.filter(r => r.level === 'ok').length;
const warnCount = RESULTS.filter(r => r.level === 'warn').length;
const failCount = RESULTS.filter(r => r.level === 'fail').length;
console.log(`OK: ${okCount}   Avisos: ${warnCount}   Falhas: ${failCount}\n`);

if (HAS_FATAL) {
  console.log('Corrija as falhas acima antes de rodar `eas build`.\n');
  process.exit(1);
} else if (warnCount > 0) {
  console.log('Pronto para `eas build` (avisos nao bloqueiam, mas revise).\n');
  process.exit(0);
} else {
  console.log('Tudo verde. Pode rodar:');
  console.log(`  eas build -p ${platformArg} --profile production\n`);
  process.exit(0);
}
