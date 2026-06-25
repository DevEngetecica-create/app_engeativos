// SegurancaDoTrabalho.styles.js
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  // ===== CONTAINER =====
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // fundo neutro consistente
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // ===== HEADER =====
  header: {
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A', // quase preto
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },

  // ===== ACTION BUTTONS =====
  actionsWrap: {
    marginTop: 8,
  },

  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',

    // sombra suave e borda sutil — mesmo padrão dos cards
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },

  // ===== ICON =====
  iconWrapper: {
    width: 60,
    height: 68,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconChecklist: {
    backgroundColor: '#EEF2FF', // azul claro
  },
  iconAction: {
    backgroundColor: '#FEF3C7', // amarelo claro
  },
  iconPlan: {
    backgroundColor: '#FEE2E2', // vermelho claro
  },

  // ===== TEXT CONTENT =====
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },

  // ===== CHEVRON (→) =====
  chevronWrapper: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevron: {
    fontSize: 24,
    color: '#94A3B8',
    fontWeight: '600',
  },

  // ===== UTILITIES =====
  fullWidth: {
    width: '100%',
  },
  

});
