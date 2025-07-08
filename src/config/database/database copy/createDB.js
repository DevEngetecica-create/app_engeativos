const salvarLocalmente = (form, id_veiculo) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO diario_bordo (
          id_obra,
          id_veiculo,
          id_funcionario,
          data_cadastro,
          horario_inicial,
          horimetro_inicial,
          hodometro_inicial,
          horario_final,
          horimetro_final,
          hodometro_final,
          descricao_atividade,
          sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          form.id_obra,
          id_veiculo,
          form.id_funcionario,
          new Date().toISOString().slice(0, 10),
          form.horario_inicial,
          form.horimetro_inicial || '',
          form.hodometro_inicial || '',
          form.horario_final,
          form.horimetro_final || '',
          form.hodometro_final || '',
          form.descricao_atividade,
          0 // sync_status = 0 → não sincronizado
        ],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};