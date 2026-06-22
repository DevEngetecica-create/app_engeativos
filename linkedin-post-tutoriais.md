# Post LinkedIn — Lançamento dos Tutoriais do Engeativos

> **Visuais disponíveis** (escolha um para anexar ao post):
> - `linkedin-post-tutoriais.svg` — **quadrado 1080×1080** (universal, funciona em qualquer feed)
> - `linkedin-post-tutoriais-vertical.svg` — **vertical 1080×1350** ⭐ (formato que o LinkedIn mais amplifica no feed)
>
> Ambos mostram **4 mockups** do app lado a lado:
> 1. 🔐 **LOGIN** (azul) — card de login com biometria e modo offline
> 2. 🏠 **HOME** (verde) — saudação com o novo botão "📖 Tutorial"
> 3. 🔄 **SINCRONIZAÇÃO** (laranja) — redesign com status de sinal, pendentes e botões grandes
> 4. 📋 **TUTORIAL ANIMADO** (azul) — checklist com dedo apontando para "📷 Foto" + badge PASSO 4/7
>
> Como o LinkedIn não aceita SVG no upload, veja a seção **"Converter SVG → PNG"** no final deste arquivo.

---

## 📝 Texto do post (versão recomendada — celebrar entrega)

> Copie do bloco abaixo (entre as linhas) e cole no LinkedIn.

```
Acabamos de liberar uma feature que vinha me incomodando há tempos no Engeativos:

Toda vez que entra um operador novo na frota, alguém tem que parar tudo e explicar passo a passo onde clicar, como ler o QR, o que faz cada botão. Multiplique por 30, 40 operadores em campo — e o telefone da TI não para.

Agora cada tela do app tem um tutorial visual, animado, acessível direto pelo navegador. Sem vídeo, sem áudio, sem instalar nada:

📲 sga-engeativos.com.br/tutorial

São 6 fluxos cobertos, cada um com 6 a 9 passos animados em loop:

🔐 Login (online, offline, biometria)
📷 Localizar veículo (scanner QR ou prefixo)
📋 Checklist da frota (abertura + encerramento)
⛽ Abastecimento (cupom + horímetro)
📒 Diário de bordo (turno completo)
🔄 Sincronização (Upload + Download com regra de sinal)

A interface dos tutoriais espelha o app real — quando o motorista clica num botão na animação, é exatamente o mesmo botão que ele vai ver no celular. Sem aproximação, sem ilustração genérica.

Detalhe técnico que me deixou orgulhoso: tudo em HTML + CSS + SVG + JavaScript puro, sem nenhuma biblioteca de animação. Roda em qualquer navegador, abre em menos de 1 segundo, pode ser gravado como vídeo se a empresa quiser distribuir por WhatsApp.

Próximo passo é integrar o link no menu do sistema web e medir a queda em chamados de suporte nas próximas 4 semanas.

Se você gerencia frota, manutenção ou ativos e quer ver como ficou, dá uma olhada → sga-engeativos.com.br/tutorial

#GestãoDeAtivos #Frota #ProdutoDigital #DesenvolvimentoMobile #UX #ReactNative #Laravel #Engetecnica #Engeativos
```

---

## 📝 Versão curta (para reaproveitar em comentários ou Stories)

```
Cansei de operador novo travar nos primeiros dias usando o app.

Liberamos hoje 6 tutoriais animados no Engeativos — um para cada fluxo crítico (login, scanner, checklist, abastecimento, diário, sync). Roda direto no navegador, sem vídeo, sem áudio.

→ sga-engeativos.com.br/tutorial

#GestãoDeAtivos #Frota #Engeativos
```

---

## 📝 Versão para grupo técnico (se for repostar em comunidades de dev)

```
Lancei hoje uma feature que tava na minha cabeça há meses:

Tutoriais animados de uso do app, em HTML + CSS + SVG + JS puro. Sem React, sem Framer Motion, sem GSAP. Zero dependências de animação.

Cada tutorial:
- Renderiza um mockup pixel-perfect da tela real do app
- Roda em loop sem áudio
- Pode ser gravado com Win+G ou OBS pra virar vídeo
- Ocupa ~25kb por tutorial
- Abre em <500ms

Por que sem libs? Porque os usuários abrem do celular em campo, muitos com 3G ruim. Bundle de 10MB não passa.

A correção mais interessante foi o bug clássico do "botão Repetir" — sleep() não cancelável faz N run() rodarem em paralelo a cada clique. Resolvi com generation token: cada sleep amarra um gen no momento que foi criado e rejeita se o gen mudou. Loop pega no catch e recomeça com gen novo.

Stack do projeto: React Native + Expo no app, Laravel 10 no backend, SQLite local com sync offline-first.

→ sga-engeativos.com.br/tutorial

#JavaScript #FrontendDev #UX #ReactNative #Laravel
```

---

## 🎨 Como converter o SVG para PNG (LinkedIn só aceita PNG/JPG/MP4)

O LinkedIn **não aceita SVG no upload**. Você precisa converter primeiro.

### Opção 1 — Mais rápido (navegador)
1. Abra `linkedin-post-tutoriais.svg` no Chrome / Edge (arrasta o arquivo pra aba do navegador).
2. **Print Screen** ou use a ferramenta de captura do Windows (`Win + Shift + S`).
3. Cole no Paint ou Photoshop, salve como PNG.

### Opção 2 — Mais preciso (linha de comando, ImageMagick)
Se você tem ImageMagick instalado:
```powershell
magick convert -background none -density 300 linkedin-post-tutoriais.svg linkedin-post-tutoriais.png
```

### Opção 3 — Online (sem instalar nada)
- https://cloudconvert.com/svg-to-png — upload do SVG, escolhe tamanho 1080×1080, baixa PNG.
- Ou https://svgtopng.com — mais simples ainda.

### Opção 4 — Via Inkscape (melhor qualidade)
1. Abra `linkedin-post-tutoriais.svg` no [Inkscape](https://inkscape.org/) (grátis).
2. **Arquivo → Exportar → PNG**.
3. Escolha 1080×1080, **DPI 96**, exporta.

### Opção 5 — Direto no navegador (Chrome DevTools)
1. Abra o SVG no Chrome.
2. **F12 → Console**, cola:
```js
const svg = document.querySelector('svg');
const xml = new XMLSerializer().serializeToString(svg);
const blob = new Blob([xml], {type:'image/svg+xml'});
const url = URL.createObjectURL(blob);
const img = new Image();
img.onload = () => {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1080;
  c.getContext('2d').drawImage(img, 0, 0, 1080, 1080);
  c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'linkedin.png'; a.click(); }, 'image/png');
};
img.src = url;
```
3. Baixa automaticamente o PNG.

---

## 📐 Dicas para o post performar bem

- **Horário ideal LinkedIn (Brasil)**: terça a quinta, entre 8h-10h ou 12h-14h.
- **Primeiro parágrafo é crítico**: o LinkedIn corta com "...ver mais" depois de ~3 linhas. Garanta que o hook esteja no começo.
- **Mencione pessoas**: marque colegas, equipe Engetecnica, clientes que usam o sistema. Cada @ vira notificação e potencializa alcance.
- **Comentários nas primeiras 2h**: peça pra 2-3 colegas comentarem cedo. O algoritmo amplifica posts com tração rápida.
- **Não use mais de 5 hashtags**: o LinkedIn penaliza posts com excesso.
- **Resposta aos comentários**: cada resposta sua reativa o post no feed.

---

## 🔁 Variações de visual (caso queira testar A/B)

Se quiser regerar o SVG com outra composição (mais minimalista, com 1 só celular grande, com fundo claro, etc.), me avisa qual direção e eu adapto.

Direções possíveis:
- **1 celular grande centralizado** — mais focado, menos "marketing", boa pra um post mais sóbrio.
- **Fundo branco com sombra** — alinha com identidade visual corporativa mais clean.
- **Animação real (GIF)** — gravo um dos tutoriais em vídeo e converto pra GIF de até 8MB (limite LinkedIn).
- **Carrossel de 4 slides** — capa + 3 telas, cada uma com explicação curta. Maior engajamento mas mais trabalho.
