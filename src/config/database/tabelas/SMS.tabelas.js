export default function SMSTabelas() {
  return [
    `CREATE TABLE IF NOT EXISTS sms_checklist (
        id INTEGER ,
        id_obra INTERGER,
        nome_checklist TEXT,
        nome_empresa TEXT,
        data_criacao_checklist TEXT,
        codigo_checklist TEXT,
        numero_revisao_checklist TEXT,
        descricao_checklist TEXT,
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
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_itens (
        id INTEGER,
        checklist_id INTEGER,
        campos TEXT,
        ativo INTEGER,
        obrigatorio INTEGER,
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
        created_at TEXT,
        updated_at TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_preenchido_imagens (
        id INTEGER,
        id_local TEXT,
        preenchido_id TEXT,
        arquivo_app TEXT,
        user_create TEXT,
        user_edit TEXT,
        created_at TEXT,
        updated_at TEXT,
        sync_status INTEGER DEFAULT 0,
        data_sincronizacao TEXT

    );`,

    `CREATE TABLE IF NOT EXISTS sms_checklist_preenchido_assinaturas (
        id INTEGER,
        realizado_id TEXT,
        arquivo_app TEXT,
        cpf TEXT,
        nome TEXT,
        trabalhador_externo INTERGER,
        user_create TEXT,
        user_edit TEXT,
        created_at TEXT,
        updated_at TEXT,
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
        data_sincronizacao TEXT
    );`,

  ];

}