# Engeativos — App Mobile (React Native + Expo)

Aplicativo móvel da Engetécnica para gestão de ativos em campo, com foco
em **operação offline-first**: o app continua funcionando em áreas remotas
sem internet e sincroniza com o backend Laravel quando há sinal.

## Stack

- **React Native 0.74** + **Expo SDK 51**
- **React Navigation v6** (native-stack + drawer)
- **Axios** para HTTP, com interceptor de Sanctum
- **expo-secure-store** (token, credenciais biométricas) + **expo-sqlite** (cache offline)
- **expo-local-authentication** (biometria), **react-native-vision-camera** (OCR/QR)
- **styled-components** + tema central em [src/styles/theme.js](src/styles/theme.js)
- Backend: Laravel 10/11 (`engeativos2-main`) com autenticação Sanctum

## Pré-requisitos

- **Node.js 20+**
- **Expo CLI** (`npm install -g expo-cli` — opcional, `npx expo` funciona sem)
- **EAS CLI** para builds (`npm install -g eas-cli`)

## Configuração por ambiente

A baseURL e o `usesCleartextTraffic` são derivados em [app.config.js](app.config.js) a
partir de variáveis de ambiente:

| Variável        | Default                                    | Quando setar                                |
|-----------------|--------------------------------------------|---------------------------------------------|
| `APP_ENV`       | `development`                              | EAS define automaticamente conforme perfil  |
| `APP_API_URL`   | dev: `http://192.168.3.227:8000/api/`<br/>release: `https://sga-engeativos.com.br/api/` | sobrescrever URL local em dev               |

```powershell
# Apontar API local em dev (Windows PowerShell)
$env:APP_API_URL = "http://192.168.0.50:8000/api/"
npx expo start --dev-client --clear
```

Em builds **release** (preview/production), o EAS injeta `APP_ENV` e
`APP_API_URL` automaticamente via [eas.json](eas.json) — sem editar código.

## Desenvolvimento

```powershell
# 1. Instalar dependências
npm install

# 2. Iniciar Metro com o dev-client (necessário pelas libs nativas)
npx expo start --dev-client --clear
```

Use o **build de desenvolvimento** (não o Expo Go) — o app depende de
módulos nativos (`vision-camera`, `secure-store`, `local-authentication`,
`sqlite`). Gere a build dev uma vez com:

```powershell
eas build --profile development --platform android
```

## Build release

```powershell
# Preview interno (APK)
eas build --profile preview --platform android

# Produção (AAB para Play Store)
eas build --profile production --platform android

# iOS produção
eas build --profile production --platform ios
```

## Estrutura de pastas

```
src/
├── components/       # ErrorBoundary, NetworkBanner, Paginate, etc.
├── config/
│   ├── api.js        # axios + baseURL via expo-constants
│   ├── database/     # expo-sqlite + sync service
│   ├── hooks/        # useConnectionMode, useDebounce
│   └── net/          # snapshot de qualidade de rede
├── contexts/         # AuthProvider, NetworkProvider
├── pages/            # telas (Login, Home, Veículos, SMS, etc.)
├── routes/           # navegação (stack principal + SMS sub-stack)
├── services/         # (legado — refatorado)
├── styles/           # theme central + estilos legados
└── utils/            # crypto, credentialsStore, fileUpload, logger, toast
```

## Segurança e offline-first

- **Token de sessão**: gravado em `SecureStore` (criptografado pelo SO).
- **Credenciais para biometria**: gravadas em `SecureStore` ([src/utils/credentialsStore.js](src/utils/credentialsStore.js)).
- **Senha local (para login offline)**: derivada com PBKDF2-like + salt
  por usuário ([src/utils/crypto.js](src/utils/crypto.js)). Migração transparente
  a partir do hash SHA-256 legado.
- **Upload de arquivos**: multipart/form-data com resize automático
  (2400×2400, JPEG q85) — backend coexiste com fluxo JSON antigo.
- **HTTP cleartext**: liberado apenas em builds de **dev** via
  [app.config.js](app.config.js); release **força HTTPS**.

## Sincronização

O app trabalha em dois modos selecionáveis pelo usuário (banner superior
ou checkbox no login):

- **Online**: chamadas diretas ao backend Laravel.
- **Offline**: leitura/escrita do cache local SQLite, com fila de
  pendentes (`sync_status = 0`).

Quando volta online, o usuário pode disparar **Upload** (envia pendentes)
e **Download** (atualiza catálogos: veículos, obras, checklists, etc.).

## Comandos úteis

```powershell
# Limpar cache do Metro
npx expo start --dev-client --clear

# Verificar dependências/peer-deps
npm ls

# Limpar build Android local
cd android && ./gradlew clean
```

## Backend

O backend Laravel vive em `C:\wamp64\www\engeativos2-main` (em dev local
WAMP). As rotas consumidas pelo app estão em
`routes/api.php` sob o middleware `auth:sanctum`:

- `POST /api/app_login`
- `POST /api/logout`
- `POST /api/upload/{tabela}`   (aceita JSON base64 OU multipart/form-data)
- `GET  /api/download/{tabela}`
- `POST /api/sincronizacoes`
- `PUT  /api/users-password/{id}`

## Licença

Proprietária — Engetécnica. Ver [LICENSE.txt](LICENSE.txt).
