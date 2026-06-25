export default function SMSTabelas() {
  return [
    `CREATE TABLE IF NOT EXISTS sms_checklist (
        id INTEGER ,
        id_obra INTEGER,
        id_setor INTEGER,
        nome_checklist TEXT,
        nome_empresa TEXT,
        data_criacao_checklist TEXT,
        data_revisao_checklist TEXT,
        codigo_checklist TEXT,
        numero_revisao_checklist TEXT,
        descricao_checklist TEXT,
        user_create TEXT,
        user_edit TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS sms_obras_permitidas (
         id INTEGER PRIMARY KEY,
         id_empresa INTEGER,
         nome_fantasia TEXT,
         razao_social TEXT,
         cnpj TEXT,
         codigo_obra TEXT,
         sync_status INTEGER DEFAULT 0,
         data_sincronizacao TEXT
    );`,


    `CREATE TABLE IF NOT EXISTS sms_checklist_informacoes (
        id INTEGER,
        checklist_id INTEGER,
        informacao TEXT,
        ativo INTEGER,
        obrigatorio INTEGER,
        sync_status INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_informacoes_preenchidos (
        id INTEGER,
        id_local TEXT,
        realizado_id TEXT,
        informacao_id INTEGER,
        resposta TEXT,
        created_at TEXT,
        updated_at TEXT,
        user_create TEXT,
        user_edit TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_itens (
        id INTEGER,
        checklist_id INTEGER,
        nome TEXT,
        campos TEXT,
        ativo INTEGER,
        obrigatorio INTEGER,
        user_create TEXT,
        user_edit TEXT,
        sync_status INTEGER DEFAULT 0
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_itens_preenchidos (
        id INTEGER ,
        id_local TEXT,
        realizado_id TEXT,
        item_id INTEGER,
        conforme INTEGER,
        descricao TEXT,
        acao_sugestao TEXT,
        responsavel_acao TEXT,
        created_at TEXT,
        updated_at TEXT,
        user_create TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_realizado_vinculo (
        id INTEGER,
        id_local TEXT,
        id_obra INTEGER,
        checklist_id INTEGER,
        responsavel_inspecao TEXT,
        observacoes TEXT,
        user_create TEXT,
        user_edit TEXT,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_preenchido_imagens (
        id INTEGER,
        id_local TEXT,
        preenchido_id TEXT,
        arquivo_local TEXT,
        arquivo_app TEXT,
        arquivo_servidor TEXT,
        user_create TEXT,
        user_edit TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_error TEXT,
        synced_at TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_preenchido_assinaturas (
        id INTEGER,
        id_local TEXT,
        realizado_id TEXT,
        arquivo_local TEXT,
        arquivo_app TEXT,
        arquivo_servidor TEXT,
        cpf TEXT,
        nome TEXT,
        trabalhador_externo INTEGER,
        user_create TEXT,
        user_edit TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_error TEXT,
        synced_at TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_funcionarios (
        id INTEGER,
        nome TEXT,
        assinatura TEXT,
        cpf TEXT,
        matricula TEXT,
        data_nascimento TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT,
        created_at TEXT,
        updated_at TEXT,
        deleted_at TEXT
    );`,

    // Indices nao-unicos (idempotentes). UNIQUE INDEX em id_local e criado em
    // aplicarHardeningSync(database.js), apos saneamento de duplicatas.
    `CREATE INDEX IF NOT EXISTS idx_sms_realizado_vinculo_sync ON sms_checklist_realizado_vinculo(sync_status);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_info_preenchidos_realizado ON sms_checklist_informacoes_preenchidos(realizado_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_info_preenchidos_sync ON sms_checklist_informacoes_preenchidos(sync_status);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_itens_preenchidos_realizado ON sms_checklist_itens_preenchidos(realizado_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_itens_preenchidos_sync ON sms_checklist_itens_preenchidos(sync_status);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_imagens_preenchido ON sms_checklist_preenchido_imagens(preenchido_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_imagens_sync ON sms_checklist_preenchido_imagens(sync_status);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_assinaturas_realizado ON sms_checklist_preenchido_assinaturas(realizado_id);`,
    `CREATE INDEX IF NOT EXISTS idx_sms_assinaturas_sync ON sms_checklist_preenchido_assinaturas(sync_status);`,
  ];

}
