// src/pages/Configuracoes/SchemaTool.js
import React, { useState } from 'react';
import { View, Text, TextInput, Alert, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { ensureTableColumns } from '../../utils/schemaMigrator';

export default function SchemaTool() {
  const [table, setTable] = useState('');
  const [migrationName, setMigrationName] = useState(''); // opcional
  const [rows, setRows] = useState([
    { name: '', type: 'INTEGER', notNull: false, defaultValue: '', createIndex: false }
  ]);
  const [log, setLog] = useState([]);

  const addRow = () => {
    setRows(prev => [...prev, { name: '', type: 'INTEGER', notNull: false, defaultValue: '', createIndex: false }]);
  };

  const removeRow = (i) => {
    setRows(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateRow = (i, patch) => {
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const apply = async () => {
    try {
      if (!table.trim()) {
        Alert.alert('Atenção', 'Informe o nome da tabela.');
        return;
      }
      const cols = rows
        .map(r => {
          const c = { name: r.name.trim() };
          if (!c.name) return null;
          if (r.type?.trim()) c.type = r.type.trim();
          if (r.notNull) c.notNull = true;
          if (r.createIndex) c.createIndex = true;

          // defaultValue: vazio = ignora; numérico = número; string = usa aspas
          if (r.defaultValue !== '') {
            const num = Number(r.defaultValue);
            c.defaultValue = isNaN(num) ? r.defaultValue : num;
          }
          return c;
        })
        .filter(Boolean);

      if (!cols.length) {
        Alert.alert('Atenção', 'Adicione ao menos uma coluna válida.');
        return;
      }

      await ensureTableColumns(table.trim(), cols, {
        migrationName: migrationName.trim() || undefined,
      });

      setLog(prev => [`✅ Migração aplicada na tabela ${table}`, ...prev]);
      Alert.alert('Sucesso', 'Alterações aplicadas com sucesso.');
    } catch (e) {
      console.error(e);
      setLog(prev => [`❌ ${e.message}`, ...prev]);
      Alert.alert('Erro', e.message);
    }
  };

  const loadPresetServicosFKs = () => {
    setTable('veiculo_checklist_itens_servicos');
    setMigrationName('2025-11-13-add-servicos-medicoes-fks');
    setRows([
      { name: 'id_horimetro',     type: 'INTEGER', notNull: false, defaultValue: '', createIndex: true },
      { name: 'id_quilometragem', type: 'INTEGER', notNull: false, defaultValue: '', createIndex: true },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <Text style={styles.title}>Ferramenta de Migração (SQLite)</Text>

      <View style={styles.block}>
        <Text style={styles.label}>Nome da tabela</Text>
        <TextInput
          value={table}
          onChangeText={setTable}
          placeholder="ex.: veiculo_checklist_itens_servicos"
          style={styles.input}
        />

        <Text style={styles.label}>Nome da migração (opcional)</Text>
        <TextInput
          value={migrationName}
          onChangeText={setMigrationName}
          placeholder="ex.: 2025-11-13-add-servicos-medicoes-fks"
          style={styles.input}
        />

        <TouchableOpacity style={[styles.btn, styles.presetBtn]} onPress={loadPresetServicosFKs}>
          <Text style={styles.btnText}>Carregar PRESET: Servicos FKs</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.block}>
        <Text style={styles.subTitle}>Colunas</Text>

        {rows.map((r, i) => (
          <View key={i} style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="nome (ex.: id_horimetro)"
              value={r.name}
              onChangeText={(t) => updateRow(i, { name: t })}
            />
            <TextInput
              style={[styles.input, { width: 120, marginLeft: 8 }]}
              placeholder="tipo (INTEGER/TEXT/...)"
              value={r.type}
              onChangeText={(t) => updateRow(i, { type: t })}
            />
            <TextInput
              style={[styles.input, { width: 120, marginLeft: 8 }]}
              placeholder="DEFAULT (opcional)"
              value={r.defaultValue}
              onChangeText={(t) => updateRow(i, { defaultValue: t })}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
              <TouchableOpacity
                onPress={() => updateRow(i, { notNull: !r.notNull })}
                style={[styles.badge, r.notNull ? styles.badgeOn : styles.badgeOff]}
              >
                <Text style={styles.badgeText}>NOT NULL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateRow(i, { createIndex: !r.createIndex })}
                style={[styles.badge, r.createIndex ? styles.badgeOn : styles.badgeOff, { marginLeft: 6 }]}
              >
                <Text style={styles.badgeText}>INDEX</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => removeRow(i)} style={[styles.btn, styles.rmBtn]}>
              <Text style={styles.btnText}>Remover</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity onPress={addRow} style={[styles.btn, styles.addBtn]}>
          <Text style={styles.btnText}>+ Adicionar coluna</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={apply} style={[styles.btn, styles.applyBtn]}>
          <Text style={styles.btnText}>Aplicar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.block}>
        <Text style={styles.subTitle}>Log</Text>
        {log.map((l, idx) => (
          <Text key={idx} style={styles.logLine}>{l}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  subTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  block: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 14, elevation: 2 },
  label: { fontWeight: '600', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 10, height: 42, marginBottom: 8 },
  btn: { backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, marginTop: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  addBtn: { backgroundColor: '#3498db' },
  applyBtn: { backgroundColor: '#27ae60' },
  rmBtn: { backgroundColor: '#e74c3c', marginLeft: 8, marginTop: 0 },
  presetBtn: { backgroundColor: '#8e44ad', marginTop: 12 },
  row: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeOn: { backgroundColor: '#2ecc71' },
  badgeOff: { backgroundColor: '#bdc3c7' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  logLine: { fontFamily: 'monospace', marginTop: 2 },
});
