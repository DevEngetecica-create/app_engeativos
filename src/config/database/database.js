// src/config/database/database.js
import * as SQLite from 'expo-sqlite/legacy';
import uuid from 'react-native-uuid';
import veiculosTabelas from './tabelas/veiculos.tabelas';
import SMSTabelas from './tabelas/SMS.tabelas';
import baseTabelas from './tabelas/base.tabelas';

export const db = SQLite.openDatabase('app.db', '1.0');

// Tabelas que aceitam upload e portanto precisam de sync_error/sync_attempts
export const TABELAS_UPLOAD_SMS = [
  'sms_checklist_realizado_vinculo',
  'sms_checklist_informacoes_preenchidos',
  'sms_checklist_itens_preenchidos',
  'sms_checklist_preenchido_imagens',
  'sms_checklist_preenchido_assinaturas',
];

export const TABELAS_UPLOAD_VEICULOS = [
  'veiculo_horimetro',
  'veiculo_quilometragems',
  'veiculo_abastecimentos',
  'veiculos_diario_bordo',
  'veiculo_checklist_itens_servicos',
  'veiculo_checklist_itens_realizados',
  'veiculo_checklist_evidencias',
];

export function initDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      console.error('❌ DB não inicializado!');
      return reject(new Error('DB not opened'));
    }

    db.transaction(
      tx => {

        var queries = [
          ...baseTabelas(),
          ...veiculosTabelas(),
          ...SMSTabelas(),
        ];

        queries.forEach(q => tx.executeSql(q));

        // Verificação dinâmica e adição de colunas para "veiculos"
        tx.executeSql(`PRAGMA table_info(veiculos);`, [], (_, { rows }) => {
          let hasTipoKm = false, hasTipoHr = false, hasObraId = false, hasModelo = false;
          for (let i = 0; i < rows.length; i++) {
            if (rows.item(i).name === 'tipo_km') hasTipoKm = true;
            if (rows.item(i).name === 'tipo_hr') hasTipoHr = true;
            if (rows.item(i).name === 'obra_id') hasObraId = true;
            if (rows.item(i).name === 'modelo') hasModelo = true;
          }
          if (!hasObraId) tx.executeSql(`ALTER TABLE veiculos ADD COLUMN obra_id INTEGER;`);
          if (!hasModelo) tx.executeSql(`ALTER TABLE veiculos ADD COLUMN modelo TEXT;`);
          if (!hasTipoKm) tx.executeSql(`ALTER TABLE veiculos ADD COLUMN tipo_km INTEGER;`);
          if (!hasTipoHr) tx.executeSql(`ALTER TABLE veiculos ADD COLUMN tipo_hr INTEGER;`);
        });

        // Verificação dinâmica para "veiculo_checklist_itens_servicos"
        tx.executeSql(`PRAGMA table_info(veiculo_checklist_itens_servicos);`, [], (_, { rows }) => {
          let hasIdHor = false, hasIdKm = false;
          for (let i = 0; i < rows.length; i++) {
            if (rows.item(i).name === 'id_horimetro') hasIdHor = true;
            if (rows.item(i).name === 'id_quilometragem') hasIdKm = true;
          }
          if (!hasIdHor) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_servicos ADD COLUMN id_horimetro INTEGER;`);
          if (!hasIdKm) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_servicos ADD COLUMN id_quilometragem INTEGER;`);
        });

        // Verificação dinâmica para "veiculo_checklist_itens_realizados"
        tx.executeSql(`PRAGMA table_info(veiculo_checklist_itens_realizados);`, [], (_, { rows }) => {
          let hasIdChecklistRealizado = false, hasArquivoServidor = false;
          for (let i = 0; i < rows.length; i++) {
            if (rows.item(i).name === 'id_checklist_realizado') hasIdChecklistRealizado = true;
            if (rows.item(i).name === 'arquivo_servidor') hasArquivoServidor = true;
          }
          if (!hasIdChecklistRealizado) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_realizados ADD COLUMN id_checklist_realizado TEXT;`);
          if (!hasArquivoServidor) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_realizados ADD COLUMN arquivo_servidor TEXT;`);
        });

        tx.executeSql(`PRAGMA table_info(veiculos_diario_bordo);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('hr_anterior')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN hr_anterior TEXT;`);
          if (!cols.includes('km_anterior')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN km_anterior TEXT;`);
          if (!cols.includes('hr_atual')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN hr_atual TEXT;`);
          if (!cols.includes('km_atual')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN km_atual TEXT;`);
          if (!cols.includes('arquivo_servidor')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN arquivo_servidor TEXT;`);
          if (!cols.includes('id_local')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN id_local TEXT;`);
          if (!cols.includes('ciclo_status')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN ciclo_status TEXT DEFAULT 'ABERTO';`);
          if (!cols.includes('horas_trabalhadas_minutos')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN horas_trabalhadas_minutos INTEGER DEFAULT 0;`);
          if (!cols.includes('descricao_encerramento')) tx.executeSql(`ALTER TABLE veiculos_diario_bordo ADD COLUMN descricao_encerramento TEXT;`);
          tx.executeSql(`
            UPDATE veiculos_diario_bordo
            SET hr_anterior = COALESCE(hr_anterior, horimetro_inicial),
                km_anterior = COALESCE(km_anterior, hodometro_inicial),
                hr_atual = COALESCE(hr_atual, horimetro_final),
                km_atual = COALESCE(km_atual, hodometro_final)
            WHERE sync_status = 0;
          `);
          tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_veiculos_diario_bordo_veiculo_user_ciclo ON veiculos_diario_bordo(id_veiculo, user_create, ciclo_status);`);
        });

        tx.executeSql(`PRAGMA table_info(veiculo_checklist_itens_servicos);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('id_checklist')) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_servicos ADD COLUMN id_checklist INTEGER;`);
          if (!cols.includes('tipo_checklist')) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_servicos ADD COLUMN tipo_checklist TEXT DEFAULT 'ABERTURA';`);
          if (!cols.includes('id_abertura_vinculada')) tx.executeSql(`ALTER TABLE veiculo_checklist_itens_servicos ADD COLUMN id_abertura_vinculada TEXT;`);
        });

        tx.executeSql(`PRAGMA table_info(veiculo_abastecimentos);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('arquivo_servidor')) tx.executeSql(`ALTER TABLE veiculo_abastecimentos ADD COLUMN arquivo_servidor TEXT;`);
          if (!cols.includes('id_local')) tx.executeSql(`ALTER TABLE veiculo_abastecimentos ADD COLUMN id_local TEXT;`);
        });

        // id_local em tabelas de medicao (idempotente) — habilita UPSERT no backend
        tx.executeSql(`PRAGMA table_info(veiculo_horimetro);`, [], (_, { rows }) => {
          const cols = rows._array.map(c => c.name);
          if (!cols.includes('id_local')) tx.executeSql(`ALTER TABLE veiculo_horimetro ADD COLUMN id_local TEXT;`);
        });
        tx.executeSql(`PRAGMA table_info(veiculo_quilometragems);`, [], (_, { rows }) => {
          const cols = rows._array.map(c => c.name);
          if (!cols.includes('id_local')) tx.executeSql(`ALTER TABLE veiculo_quilometragems ADD COLUMN id_local TEXT;`);
        });

        tx.executeSql(`PRAGMA table_info(veiculo_checklist_evidencias);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('arquivo_local')) tx.executeSql(`ALTER TABLE veiculo_checklist_evidencias ADD COLUMN arquivo_local TEXT;`);
          if (!cols.includes('arquivo_servidor')) tx.executeSql(`ALTER TABLE veiculo_checklist_evidencias ADD COLUMN arquivo_servidor TEXT;`);
          if (!cols.includes('sync_error')) tx.executeSql(`ALTER TABLE veiculo_checklist_evidencias ADD COLUMN sync_error TEXT;`);
          if (!cols.includes('sync_attempts')) tx.executeSql(`ALTER TABLE veiculo_checklist_evidencias ADD COLUMN sync_attempts INTEGER DEFAULT 0;`);
          if (!cols.includes('synced_at')) tx.executeSql(`ALTER TABLE veiculo_checklist_evidencias ADD COLUMN synced_at TEXT;`);
          tx.executeSql(`UPDATE veiculo_checklist_evidencias SET arquivo_local = COALESCE(arquivo_local, arquivo_app) WHERE arquivo_local IS NULL;`);
        });

        tx.executeSql(`PRAGMA table_info(sms_checklist_preenchido_assinaturas);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('id_local')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_assinaturas ADD COLUMN id_local TEXT;`);
          if (!cols.includes('arquivo_local')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_assinaturas ADD COLUMN arquivo_local TEXT;`);
          if (!cols.includes('arquivo_servidor')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_assinaturas ADD COLUMN arquivo_servidor TEXT;`);
          if (!cols.includes('synced_at')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_assinaturas ADD COLUMN synced_at TEXT;`);
          tx.executeSql(`UPDATE sms_checklist_preenchido_assinaturas SET arquivo_local = COALESCE(arquivo_local, arquivo_app) WHERE arquivo_local IS NULL;`);
        });

        tx.executeSql(`PRAGMA table_info(sms_checklist_preenchido_imagens);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('arquivo_local')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_imagens ADD COLUMN arquivo_local TEXT;`);
          if (!cols.includes('arquivo_servidor')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_imagens ADD COLUMN arquivo_servidor TEXT;`);
          if (!cols.includes('user_edit')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_imagens ADD COLUMN user_edit TEXT;`);
          if (!cols.includes('synced_at')) tx.executeSql(`ALTER TABLE sms_checklist_preenchido_imagens ADD COLUMN synced_at TEXT;`);
          tx.executeSql(`UPDATE sms_checklist_preenchido_imagens SET arquivo_local = COALESCE(arquivo_local, arquivo_app) WHERE arquivo_local IS NULL;`);
        });

        tx.executeSql(`PRAGMA table_info(sms_checklist_realizado_vinculo);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('user_create')) tx.executeSql(`ALTER TABLE sms_checklist_realizado_vinculo ADD COLUMN user_create TEXT;`);
          if (!cols.includes('user_edit')) tx.executeSql(`ALTER TABLE sms_checklist_realizado_vinculo ADD COLUMN user_edit TEXT;`);
          if (!cols.includes('deleted_at')) tx.executeSql(`ALTER TABLE sms_checklist_realizado_vinculo ADD COLUMN deleted_at TEXT;`);
        });

        tx.executeSql(`PRAGMA table_info(sms_checklist_informacoes_preenchidos);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('user_edit')) tx.executeSql(`ALTER TABLE sms_checklist_informacoes_preenchidos ADD COLUMN user_edit TEXT;`);
        });

        // Indices nao-unicos (sao idempotentes e seguros).
        // Indices UNIQUE em id_local sao criados em aplicarHardeningSync(), apos saneamento de duplicatas.
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_realizado_vinculo_sync ON sms_checklist_realizado_vinculo(sync_status);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_info_preenchidos_realizado ON sms_checklist_informacoes_preenchidos(realizado_id);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_info_preenchidos_sync ON sms_checklist_informacoes_preenchidos(sync_status);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_itens_preenchidos_realizado ON sms_checklist_itens_preenchidos(realizado_id);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_itens_preenchidos_sync ON sms_checklist_itens_preenchidos(sync_status);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_imagens_preenchido ON sms_checklist_preenchido_imagens(preenchido_id);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_imagens_sync ON sms_checklist_preenchido_imagens(sync_status);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_assinaturas_realizado ON sms_checklist_preenchido_assinaturas(realizado_id);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_sms_assinaturas_sync ON sms_checklist_preenchido_assinaturas(sync_status);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_veiculo_evidencias_parent ON veiculo_checklist_evidencias(parent_tabela, parent_id_local);`);
        tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_veiculo_evidencias_sync ON veiculo_checklist_evidencias(sync_status);`);

        // Adiciona sync_error / sync_attempts / synced_at nas tabelas de upload.
        // Idempotente: usa PRAGMA para checar antes; alem disso, errors
        // "duplicate column" sao tolerados (podem ocorrer se initDatabase rodar
        // mais de uma vez na mesma sessao — loadUser + signIn — pois callbacks
        // PRAGMA sao assincronos e o snapshot pode ficar desatualizado).
        const onAlterError = (tab, coluna) => (_t, e) => {
          const msg = e?.message || '';
          if (!/duplicate column/i.test(msg)) {
            console.warn(`Aviso ALTER ${tab}.${coluna}: ${msg}`);
          }
          return false; // nao faz rollback
        };

        const tabelasUpload = [...TABELAS_UPLOAD_SMS, ...TABELAS_UPLOAD_VEICULOS];
        for (const tab of tabelasUpload) {
          tx.executeSql(`PRAGMA table_info(${tab});`, [], (_, { rows }) => {
            const cols = rows._array.map(c => c.name);
            if (!cols.includes('sync_error')) {
              tx.executeSql(`ALTER TABLE ${tab} ADD COLUMN sync_error TEXT;`, [], null, onAlterError(tab, 'sync_error'));
            }
            if (!cols.includes('sync_attempts')) {
              tx.executeSql(`ALTER TABLE ${tab} ADD COLUMN sync_attempts INTEGER DEFAULT 0;`, [], null, onAlterError(tab, 'sync_attempts'));
            }
            if (!cols.includes('synced_at')) {
              tx.executeSql(`ALTER TABLE ${tab} ADD COLUMN synced_at TEXT;`, [], null, onAlterError(tab, 'synced_at'));
            }
          });
        }

        tx.executeSql(`PRAGMA table_info(users);`, [], (_, { rows }) => {
          const cols = rows._array.map(col => col.name);
          if (!cols.includes('perfil_offline')) tx.executeSql(`ALTER TABLE users ADD COLUMN perfil_offline TEXT;`);
          // P1.2 (security-port): colunas para hash PBKDF2-like + salt
          if (!cols.includes('password_salt')) tx.executeSql(`ALTER TABLE users ADD COLUMN password_salt TEXT;`);
          if (!cols.includes('password_algo')) tx.executeSql(`ALTER TABLE users ADD COLUMN password_algo TEXT;`);
        });

      },
      err => reject(err),
      () => resolve()
    );
  });
}

// ===================================================================
// Etapa 4 — Hardening pos-init
// ===================================================================

function execAsync(sql, params = []) {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(sql, params,
        (_, res) => resolve(res?.rows?._array ?? []),
        (_, err) => { console.warn(`SQL falhou: ${sql.split('\n')[0]} → ${err?.message}`); resolve([]); return false; }
      );
    });
  });
}

/**
 * Reverte registros que ficaram com sync_status=2 (sincronizando) por queda do app
 * durante uma sincronizacao. Volta para 0 (pendente) para nova tentativa segura.
 */
export async function reverterRegistrosOrfaos() {
  const tabelas = [...TABELAS_UPLOAD_SMS, ...TABELAS_UPLOAD_VEICULOS];
  for (const tab of tabelas) {
    await execAsync(`UPDATE ${tab} SET sync_status = 0 WHERE sync_status = 2;`);
  }
}

/**
 * Saneia id_local duplicados em uma tabela.
 * Criterio de "vencedor" (registro que mantem o id_local original):
 *  1. sync_status = 1 (sincronizado com servidor) — id_local nao pode mudar pois ja existe no MySQL
 *  2. updated_at mais recente (preserva a edicao mais nova do usuario)
 *  3. created_at mais recente (fallback)
 *  4. rowid menor (estavel/deterministico)
 * Os perdedores recebem novo UUID e voltam para sync_status=0.
 */
async function sanearIdLocaisDuplicados(tabela) {
  const dups = await execAsync(
    `SELECT id_local, COUNT(*) as cnt FROM ${tabela}
     WHERE id_local IS NOT NULL AND id_local != ''
     GROUP BY id_local HAVING cnt > 1;`
  );

  if (dups.length === 0) return;

  // Descobre quais colunas de timestamp existem
  const cols = await execAsync(`PRAGMA table_info(${tabela});`);
  const colNames = cols.map(c => c.name);
  const hasUpdatedAt = colNames.includes('updated_at');
  const hasCreatedAt = colNames.includes('created_at');

  const orderBy = [
    `(CASE WHEN sync_status = 1 THEN 0 ELSE 1 END) ASC`,
    hasUpdatedAt ? `COALESCE(updated_at, '') DESC` : null,
    hasCreatedAt ? `COALESCE(created_at, '') DESC` : null,
    `rowid ASC`,
  ].filter(Boolean).join(', ');

  for (const dup of dups) {
    const registros = await execAsync(
      `SELECT rowid AS __rowid, sync_status FROM ${tabela}
       WHERE id_local = ?
       ORDER BY ${orderBy};`,
      [dup.id_local]
    );

    // Mantem o primeiro (vencedor); regenera o id_local dos demais
    for (let i = 1; i < registros.length; i++) {
      const novoUuid = uuid.v4();
      await execAsync(
        `UPDATE ${tabela} SET id_local = ?, sync_status = 0 WHERE rowid = ?;`,
        [novoUuid, registros[i].__rowid]
      );
    }
  }
}

/**
 * Preenche id_local em registros que nasceram sem ele (banco antigo).
 *  - sync_status=1 (ja sincronizado): apenas atribui id_local NOVO e NAO altera sync_status.
 *    O backend nao tem esse id_local; a vinculacao SQLite<->MySQL para esses registros
 *    legados fica pelo `id` (server-side) ja existente. Re-sync nao deve ocorrer.
 *  - demais (0/2/3/99): atribui id_local e mantem o sync_status atual (sera reenviado se 0/3).
 */
async function preencherIdLocalAusente(tabela) {
  const rows = await execAsync(
    `SELECT rowid AS __rowid, sync_status FROM ${tabela}
      WHERE id_local IS NULL OR id_local = '';`
  );

  for (const row of rows) {
    const novoUuid = uuid.v4();
    await execAsync(
      `UPDATE ${tabela} SET id_local = ? WHERE rowid = ?;`,
      [novoUuid, row.__rowid]
    );
  }
}

/**
 * Tenta criar UNIQUE INDEX, mas nao falha se houver duplicatas residuais
 * (apenas avisa — sera tentado novamente no proximo boot).
 */
async function criarIndiceUnicoSeguro(tabela, indice, coluna) {
  try {
    await new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `CREATE UNIQUE INDEX IF NOT EXISTS ${indice} ON ${tabela}(${coluna});`,
          [],
          () => resolve(),
          (_t, err) => { reject(err); return false; }
        );
      });
    });
  } catch (err) {
    console.warn(`Nao foi possivel criar ${indice}: ${err?.message}. Saneamento sera tentado no proximo boot.`);
  }
}

/**
 * Hardening de sincronizacao — chamar apos initDatabase resolver.
 *  1) Limpa lock persistente orfao (app morto durante sync anterior)
 *  2) Reverte registros orfaos com sync_status=2 (interrupcao em voo)
 *  3) Saneia id_local duplicados em tabelas SMS de upload
 *  4) Cria UNIQUE INDEX em id_local de forma segura
 */
export async function aplicarHardeningSync() {
  // Importacao tardia para evitar ciclo de modulo (syncService.js -> database.js)
  try {
    const { limparLockOrfao } = require('./syncService');
    await limparLockOrfao();
  } catch (e) { console.warn('limparLockOrfao indisponivel:', e?.message); }

  await reverterRegistrosOrfaos();

  const tabelasComIdLocal = [
    { tab: 'veiculo_checklist_itens_servicos', idx: 'idx_veiculo_servicos_id_local' },
    { tab: 'veiculo_checklist_itens_realizados', idx: 'idx_veiculo_itens_realizados_id_local' },
    { tab: 'veiculo_checklist_evidencias', idx: 'idx_veiculo_evidencias_id_local' },
    { tab: 'sms_checklist_realizado_vinculo', idx: 'idx_sms_realizado_vinculo_id_local' },
    { tab: 'sms_checklist_informacoes_preenchidos', idx: 'idx_sms_info_preenchidos_id_local' },
    { tab: 'sms_checklist_itens_preenchidos', idx: 'idx_sms_itens_preenchidos_id_local' },
    { tab: 'sms_checklist_preenchido_imagens', idx: 'idx_sms_imagens_id_local' },
    { tab: 'sms_checklist_preenchido_assinaturas', idx: 'idx_sms_assinaturas_id_local' },
    { tab: 'veiculos_diario_bordo', idx: 'idx_veiculos_diario_bordo_id_local' },
    // Medicoes / abastecimentos — ganham idempotencia via UPSERT no backend
    { tab: 'veiculo_horimetro', idx: 'idx_veiculo_horimetro_id_local' },
    { tab: 'veiculo_quilometragems', idx: 'idx_veiculo_quilometragems_id_local' },
    { tab: 'veiculo_abastecimentos', idx: 'idx_veiculo_abastecimentos_id_local' },
  ];

  for (const { tab, idx } of tabelasComIdLocal) {
    await preencherIdLocalAusente(tab);
    await sanearIdLocaisDuplicados(tab);
    await criarIndiceUnicoSeguro(tab, idx, 'id_local');
  }
}

export function hasAnyUser() {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) AS qtd FROM users;',
        [],
        (_, { rows }) => resolve((rows.item(0)?.qtd || 0) > 0),
        () => resolve(false)
      );
    });
  });
}

export function findUserByEmailAndPassHash(email, passHash) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? AND password_app = ? LIMIT 1;',
        [email, passHash],
        (_, { rows }) => resolve(rows.length ? rows.item(0) : null),
        () => resolve(null)
      );
    });
  });
}

/**
 * Busca usuario apenas pelo email (sem checar senha).
 * Usado para detectar se o usuario que esta fazendo login
 * e diferente do(s) ja cadastrado(s) localmente.
 */
export function findUserByEmail(email) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? LIMIT 1;',
        [email],
        (_, { rows }) => resolve(rows.length ? rows.item(0) : null),
        () => resolve(null)
      );
    });
  });
}

/**
 * Atualiza o trio (hash, salt, algo) de um usuario existente.
 * Usado pela migracao transparente em auth.js (SHA-256 -> PBKDF2-like)
 * e pela troca de senha (DadosAcesso). P1.2 security-port.
 */
export function updateUserPasswordHash(userId, hash, salt, algo) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE users
            SET password_app  = ?,
                password_salt = ?,
                password_algo = ?
          WHERE id = ?;`,
        [hash, salt, algo, userId],
        () => resolve(true),
        () => resolve(false)
      );
    });
  });
}

// P1.2 security-port: salt/algo acrescentados ao FINAL da assinatura para
// manter retrocompatibilidade — chamadas antigas (user, passHash, perfil)
// seguem funcionando com salt/algo = null (tratados como SHA-256 legado).
export function upsertUserFromOnline(user, passHash, perfilOfflineStr = null, salt = null, algo = null) {
  return new Promise(resolve => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT OR REPLACE INTO users
         (id, name, email, password_app, password_salt, password_algo, biometria, geolocalizacao, sync_status, perfil_offline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);`,
        [
          user.id,
          user.name ?? '',
          user.email ?? '',
          passHash,
          salt,
          algo,
          user.biometria ? 1 : 0,
          user.geolocalizacao ? 1 : 0,
          perfilOfflineStr
        ],
        () => resolve(true),
        () => resolve(false)
      );
    });
  });
}


export function executeSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        sql,
        params,
        (_, { rows }) => resolve(rows._array),
        (_, err) => reject(err)
      );
    });
  });
}
