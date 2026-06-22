# Post LinkedIn — Offline-first + Assíncrono (Engeativos)

> **Foco**: defender a arquitetura offline-first + processo assíncrono usando o cenário real de obra remota. Argumentar por que sistema síncrono perde dados.
> **Visual sugerido**: reaproveitar `linkedin-post-tutoriais-vertical.svg` — o phone 3 (SINCRONIZAÇÃO) já ilustra o tema (badge "3 pendentes" + status de sinal + lista com `sync_status` colorido).

---

## 📝 Versão recomendada (storytelling + arquitetura — ~330 palavras)

> Copie tudo entre as linhas e cole no LinkedIn.

```
Imagine um motorista em obra no interior do Pará, 80km da cidade mais próxima, sem barra de sinal no celular. Ele acabou de fazer o checklist do caminhão: 27 perguntas, 4 fotos do pneu, observações sobre o vazamento de óleo no eixo traseiro. Doze minutos de trabalho.

Aperta "ENVIAR". Sem rede → timeout → tudo perdido.

Essa cena foi o que travou uma decisão de arquitetura no Engeativos no primeiro mês: nós não temos o direito de depender de internet para o operador trabalhar.

A arquitetura síncrona tradicional (formulário → envia direto pro servidor → espera confirmação) é simples de implementar, mas frágil em campo. Em obra remota ela quebra por causas tolas:

❌ Sinal cai no meio do upload de uma foto de 4MB
❌ Servidor demora 30s pra responder e o app dispara timeout
❌ Operador troca de tela achando que já enviou
❌ Bateria acaba durante a transmissão

Em qualquer um desses cenários, o trabalho desaparece. E ninguém vai refazer.

Optamos por offline-first + assíncrono. A regra é simples:

→ Tudo que o operador faz é gravado primeiro no SQLite local do celular
→ Cada registro nasce com sync_status = 0 (pendente)
→ Quando o app detecta sinal estável, sobe para o servidor em background
→ Se falha, mantém na fila e tenta de novo
→ O operador nunca trava esperando o servidor — ele continua trabalhando

Resultado prático: o motorista faz 8 horas de turno sem barra alguma, volta ao acampamento à noite, conecta no Wi-Fi e tudo sobe automaticamente. Zero perda de dados.

A única coisa que precisa de internet é o primeiro login. Depois disso, internet é um detalhe — não um requisito.

A tela de Sincronização do app mostra esse modelo de forma transparente: pendentes ficam ali, com badge laranja, esperando o sinal. Dois toques quando chega o Wi-Fi e o servidor recebe tudo.

Pra quem desenvolve aplicativo de campo: se a sua arquitetura assume "vai ter internet", você já perdeu. A pergunta certa é "o que o usuário faz quando não tem".

→ sga-engeativos.com.br/tutorial/sincronizacao

#OfflineFirst #Sincronização #SQLite #ArquiteturaDeSoftware #FrotaPesada #GestãoDeAtivos #DesenvolvimentoMobile #Engetecnica #Engeativos
```

---

## 📝 Versão curta (3 parágrafos — ~110 palavras)

> Pra Stories, comentário ou repost depois.

```
Motorista em obra no Pará, sem sinal, preenche checklist por 12 minutos, aperta "ENVIAR". Timeout. Tudo perdido.

A arquitetura síncrona tradicional não serve para obra remota — ela assume internet estável que simplesmente não existe. Adotamos offline-first no Engeativos: tudo grava local primeiro (SQLite no celular), sobe pro servidor depois, em background, quando o sinal volta. O operador nunca trava esperando o servidor.

Resultado: 8 horas de turno sem barra de sinal, volta ao acampamento, conecta no Wi-Fi, tudo sobe automático. Zero perda de dados.

→ sga-engeativos.com.br/tutorial/sincronizacao

#OfflineFirst #Engeativos
```

---

## 📝 Versão técnica (para grupos de devs / engenharia)

```
Por que escolhemos offline-first no Engeativos (app de gestão de frota em obras remotas):

A maior parte dos clientes opera em mineração, agronegócio e construção pesada — locais onde 4G é exceção, não regra. Síncrono não cabe nesse contexto.

Como funciona o write path:

1) Operador cria um registro (checklist, abastecimento, diário de bordo) → INSERT no SQLite local com sync_status = 0
2) Quando há sinal e operador toca "Enviar", iteramos sobre todos os sync_status = 0 e tentamos POST multipart pro Laravel
3) Sucesso → UPDATE para sync_status = 1 (enviado)
4) Falha após N tentativas → sync_status = 99 (abandonado, requer ação manual)

Como funciona o read path:

1) Catálogos (veículos, obras, itens de checklist) baixam via full-refresh: DELETE * WHERE sync_status = 1 + INSERT atualizado
2) Schema do SQLite local é reconciliado contra o backend a cada login (ALTER ADD COLUMN auto)
3) Tabelas com registros pendentes do operador são PRESERVADAS no download — nunca sobrescrevemos pendências

Stack:
- React Native + Expo (Android, sem necessidade de OTA contínuo)
- expo-sqlite (legacy + async API)
- Laravel 10 + Sanctum + multipart aditivo
- FileUploadHelper enviando fotos para OneDrive via Microsoft Graph
- Senhas com PBKDF2-like iterado (1000 rounds, SHA-256) armazenado local pra login offline

A maior dor que essa arquitetura resolve não é técnica — é humana. Operador no campo confia no app porque ele NUNCA perde o que foi feito. Quando perde uma vez, perde a confiança pra sempre.

→ sga-engeativos.com.br/tutorial/sincronizacao

#OfflineFirst #ReactNative #Laravel #SQLite #ArquiteturaDeSoftware #Engetecnica
```

---

## 🎯 Estratégia de publicação

### Hook (primeira frase)
A 1ª frase é a única que aparece no feed antes do "...ver mais". As 3 versões acima começam com cena concreta (motorista no Pará / Motorista no Pará / "Por que escolhemos") — o leitor precisa **parar de rolar** ali, ou perde o post.

### Hashtags (use no MÁXIMO 5 por publicação)
Versão recomendada para este post:
- `#OfflineFirst` — termo técnico que filtra audiência certa (devs / arquitetos)
- `#GestãoDeAtivos` — termo de mercado, atrai cliente potencial
- `#FrotaPesada` — nicho específico, alto match-rate
- `#Engetecnica` — branded
- `#Engeativos` — branded produto

### Horário ideal
- Terça a quinta-feira
- **8h–10h** (pega gestores no café) ou **12h–14h** (almoço) — Brasil
- Evite sexta tarde e segunda manhã

### Engagement primário (primeiras 2h)
- Avise 2-3 colegas pra comentar **dentro de 1h** após postar — o algoritmo amplifica posts com tração inicial
- Responda **todos** os comentários relevantes no mesmo dia — cada resposta sua reativa o post no feed
- Convide pessoas estratégicas (gestor de frota de cliente, dev sênior de empresa que admira) a darem sua opinião

### Visual sugerido
- **Mesmo visual** do post anterior: `linkedin-post-tutoriais-vertical.svg`
  - O 3º phone (SINCRONIZAÇÃO) já ilustra perfeitamente o tema (pendentes, status de sinal, sync_status colorido)
- Se quiser visual exclusivo para este post, me avise — posso criar um SVG dedicado mostrando o write path (operador → SQLite → fila → servidor)

---

## 🔁 Possíveis perguntas que podem aparecer nos comentários

Antecipar as perguntas é metade do engajamento. Algumas que provavelmente vão surgir:

| Pergunta | Como responder |
|---|---|
| "E conflito de versão? Se 2 operadores editarem o mesmo veículo offline?" | Não há edição concorrente no nosso domínio — cada operador é dono dos próprios registros (checklist, diário, abastecimento). Catálogos (veículos, obras) são read-only no app. |
| "Quanto cresce o SQLite local?" | ~3–5MB após 30 dias de uso intenso. Fotos vão pro OneDrive direto, não pesam no banco. |
| "Por que não usar PouchDB / WatermelonDB?" | Expo-sqlite cobre 100% da necessidade sem dependência extra. Cada lib é uma supply chain a manter. |
| "PBKDF2-like?" | Hash iterado SHA-256 com salt, 1000 rounds — equivalente prático ao PBKDF2 mas implementado sem libs nativas (compatível com Expo Go). Não substitui Argon2 em servidor, mas é seguro para hash offline. |
| "E o token Sanctum expira?" | Refresh é tentado em background sempre que o app volta online. Se falha (token muito antigo), pede login novamente. |

---

## 📌 Próximos passos

1. **Ler em voz alta** a versão recomendada — se travar em alguma frase, ajuste.
2. **Trocar "Pará"** pelo estado/cidade onde sua empresa opera, se for mais reconhecível pelo seu público.
3. **Anexar visual**: converter `linkedin-post-tutoriais-vertical.svg` → PNG (instruções em `linkedin-post-tutoriais.md`).
4. **Postar** entre terça-quinta, 8h-10h.
5. **Mandar mensagem** para 2-3 contatos pedindo comentário/curtida nas primeiras 2h.

Se quiser variações de tom (mais polêmico, mais neutro, mais comercial) ou um visual exclusivo para este post, me fala.
