// app.config.js
//
// Estende o app.json com configuração dinâmica por ambiente.
// - APP_ENV controla cleartextTraffic (apenas dev permite HTTP).
// - APP_API_URL permite override pontual da baseURL sem editar código.
//
// O app.json continua sendo a fonte estática de identidade do app
// (nome, ícones, permissões, bundleIdentifier). Mudanças incrementais
// aqui não exigem rebuild se a propriedade for apenas de runtime (extra),
// mas plugins/Android requerem `expo prebuild` ou build EAS.

const base = require("./app.json").expo;

const APP_ENV = process.env.APP_ENV || "development";
const isDev = APP_ENV === "development";

// DEV: usa localhost porque o device acessa o Laravel via tunel USB:
//        adb reverse tcp:8000 tcp:8000
//      (fura Wi-Fi corporativo isolado e firewall — vai pelo cabo).
//      Sem o adb reverse, localhost NAO funciona; rode-o antes.
//      Para apontar para um IP de LAN ou producao, use APP_API_URL=...
// RELEASE: producao HTTPS.
const apiBaseUrl =
  process.env.APP_API_URL ||
  (isDev
    ? "http://127.0.0.1:8000/api/"
    : "https://sga-engeativos.com.br/api/");

// Reconstrói os plugins ajustando expo-build-properties:
// usesCleartextTraffic só fica true em DEV.
const plugins = (base.plugins || []).map((entry) => {
  if (Array.isArray(entry) && entry[0] === "expo-build-properties") {
    const opts = entry[1] || {};
    return [
      "expo-build-properties",
      {
        ...opts,
        android: {
          ...(opts.android || {}),
          usesCleartextTraffic: isDev,
        },
      },
    ];
  }
  return entry;
});

module.exports = {
  expo: {
    ...base,
    plugins,
    extra: {
      ...(base.extra || {}),
      apiBaseUrl,
      appEnv: APP_ENV,
    },
  },
};
