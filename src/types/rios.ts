export type Turno = 'MANHÃ' | 'TARDE' | 'NOITE';

export type PerfilUsuario = 'ADMIN' | 'GESTOR' | 'COORDENADOR' | 'PROFESSOR';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
  cargo?: string;
  avatar?: string;
  telefone?: string;
  escola?: string;
  professorId?: string;
  ativo: boolean;
  dataCriacao: string;
  ultimoAcesso?: string;
}

export type DiaSemana = 
  | 'Segunda-feira' 
  | 'Terça-feira' 
  | 'Quarta-feira' 
  | 'Quinta-feira' 
  | 'Sexta-feira' 
  | 'Sábado';

export type StatusDocente = 'EM AULA' | 'LIVRE' | 'INDISPONÍVEL' | 'EM OUTRA ESCOLA';

export type StatusComponente = 'CONCLUÍDO' | 'EM ANDAMENTO' | 'A MINISTRAR';

export interface Sala {
  id: string;
  nome: string;
  bloco?: string;
}

export interface Escola {
  id: string;
  nome: string;
  regiao: string;
  salas: Sala[];
}

export const VALOR_HORA_PADRAO = 32;

export interface Professor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  competencias: string[];
  cargaHorariaMaxima: number;
  valorHora: number;
  escolasHabituais: string[];
}

export interface ComponenteDaTurma {
  id: string;
  nome: string;
  cargaHoraria: number; // ex: 20h, 40h, 60h
  status: StatusComponente;
  professorId?: string;
  professorNome?: string;
  dataInicio?: string; // Data de Início do componente (Ex: 10/09/2026)
  dataFim?: string; // Data de Término / Previsão de Fim (Ex: 24/09/2026)
  dataConclusao?: string;
  escolaConclusao?: string;
  salaConclusao?: string;
}

export interface ConflitoHorarioProfessor {
  temConflito: boolean;
  tipo: 'CHOQUE_DIRETO' | 'SOBREPOSICAO_PERIODO' | 'TURNO_DIFERENTE_MESMO_DIA';
  turmaConflitante?: Turma;
  componenteConflitante?: ComponenteDaTurma;
  mensagem: string;
  detalhes?: {
    professorNome: string;
    turmaCodigo: string;
    turmaCurso: string;
    escola: string;
    sala: string;
    diaSemana: string;
    turno: string;
    horario: string;
    componenteNome: string;
    dataInicio?: string;
    dataFim?: string;
  };
}

export interface Turma {
  id: string;
  codigo: string; // Ex: RH-01, ADM-01, LOG-01
  curso: string; // Ex: Técnico em Recursos Humanos
  escola: string; // Ex: Unidade Centro (FIXO)
  sala: string; // Ex: Sala 04 (FIXO)
  turno: Turno; // Ex: NOITE (FIXO)
  diaSemana: DiaSemana; // Ex: Segunda-feira (FIXO)
  horario: string; // Ex: 18:30 – 22:30 (FIXO)
  componentes: ComponenteDaTurma[]; // Matriz Curricular (FIXO)
  googleClassroomId?: string; // ID da Turma no Google Classroom
  googleClassroomLink?: string; // Link direto para a sala no Google Classroom
  googleClassroomCode?: string; // Código de inscrição do Classroom
}

export interface HistoricoSubstituicao {
  id: string;
  turmaCodigo: string;
  componenteNome: string;
  escola: string;
  sala: string;
  horario: string;
  professorAnteriorId: string;
  professorAnteriorNome: string;
  professorNovoId: string;
  professorNovoNome: string;
  dataAlteracao: string;
  motivo: string;
}

export interface CompatibilidadeSubstituto {
  professor: Professor;
  score: number; // 0 a 100%
  temCompetencia: boolean;
  horarioLivre: boolean;
  semConflitoEscola: boolean;
  dentroCargaHoraria: boolean;
  justificativa: string;
}

export interface EscalaAtivaItem {
  id: string;
  professorId: string;
  professorNome: string;
  turmaCodigo: string;
  curso: string;
  escola: string;
  sala: string;
  turno: Turno;
  diaSemana: DiaSemana;
  horario: string;
  componenteNome: string;
  statusAula: 'AGENDADA' | 'EM AULA' | 'FINALIZADA';
}

export interface AulaMinistradaRecord {
  id: string;
  data: string; // Ex: '10/09/2026' ou '2026-09-10'
  horario: string; // Ex: '18:30 – 22:30'
  turno: Turno;
  diaSemana: DiaSemana;
  turmaCodigo: string; // Ex: 'RH-01'
  curso: string; // Ex: 'Técnico em Recursos Humanos'
  componenteNome: string; // Ex: 'Teoria das Relações Humanas'
  horasMinistradas: number; // Ex: 4 horas daquela aula específica
  professorId: string;
  professorNome: string;
  escola: string; // Ex: 'Unidade Centro'
  sala: string; // Ex: 'Sala 04'
  conteudoMinistrado?: string; // Tópico trabalhado
  observacoes?: string;
  status: 'MINISTRADA' | 'CONFIRMADA' | 'SUBSTITUÍDA';
  registradoPor: string;
  timestampRegistro: string;
}

export type CategoriaLogAuditoria =
  | 'TURMAS'
  | 'PERMISSOES'
  | 'PROFESSORES'
  | 'ESCOLAS'
  | 'AUTENTICACAO'
  | 'SISTEMA';

export interface LogAuditoria {
  id: string;
  acao: string;
  categoria: CategoriaLogAuditoria;
  detalhes: string;
  usuarioId: string;
  usuarioNome: string;
  usuarioEmail: string;
  usuarioPerfil: PerfilUsuario;
  timestamp: string;
  dataHoraFormatada: string;
  targetId?: string;
  targetNome?: string;
}
