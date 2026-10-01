import { auth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, FirebaseUser } from '../lib/firebase';
import { Turma, ComponenteDaTurma, Turno, DiaSemana } from '../types/rios';

export const GOOGLE_CLASSROOM_SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.announcements',
];

export interface ClassroomUserProfile {
  id: string;
  name: {
    fullName: string;
    givenName?: string;
    familyName?: string;
  };
  emailAddress?: string;
  photoUrl?: string;
}

export interface ClassroomTeacher {
  courseId: string;
  userId: string;
  profile?: ClassroomUserProfile;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  creationTime?: string;
  updateTime?: string;
  enrollmentCode?: string;
  courseState?: 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED' | 'DECLINED' | 'SUSPENDED';
  alternateLink?: string;
  teachers?: ClassroomTeacher[];
}

export interface ClassroomAnnouncement {
  id?: string;
  courseId: string;
  text: string;
  state?: 'PUBLISHED' | 'DRAFT';
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
}

// In-memory token cache (nunca armazenado em localStorage por segurança e conformidade de escopos)
let cachedAccessToken: string | null = null;
let cachedGoogleUser: FirebaseUser | null = null;
let isSigningIn = false;

// Inicializa provedor com os escopos autorizados do Google Classroom
const classroomProvider = new GoogleAuthProvider();
GOOGLE_CLASSROOM_SCOPES.forEach((scope) => {
  classroomProvider.addScope(scope);
});

/**
 * Obtém o token de acesso Google em cache de memória
 */
export function getClassroomAccessToken(): string | null {
  return cachedAccessToken;
}

export function getClassroomUser(): FirebaseUser | null {
  return cachedGoogleUser;
}

/**
 * Observador de estado de autenticação para sincronizar token e usuário
 */
export function initClassroomAuth(
  onSuccess?: (user: FirebaseUser, token: string) => void,
  onFailure?: () => void
) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      cachedGoogleUser = user;
      if (cachedAccessToken) {
        if (onSuccess) onSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onFailure) onFailure();
      }
    } else {
      cachedAccessToken = null;
      cachedGoogleUser = null;
      if (onFailure) onFailure();
    }
  });
}

/**
 * Autentica com conta Google solicitando acesso ao Google Classroom
 */
export async function signInWithGoogleClassroom(): Promise<{ user: FirebaseUser; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, classroomProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de autorização do Google Classroom.');
    }

    cachedAccessToken = credential.accessToken;
    cachedGoogleUser = result.user;

    return {
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (error: any) {
    console.error('[Google Classroom] Erro de autenticação:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Desconecta a sessão do Google Classroom
 */
export async function disconnectGoogleClassroom(): Promise<void> {
  try {
    cachedAccessToken = null;
    cachedGoogleUser = null;
  } catch (err) {
    console.warn('[Google Classroom] Erro ao desconectar:', err);
  }
}

/**
 * Lista as turmas / cursos ativos do Google Classroom
 */
export async function fetchClassroomCourses(token?: string): Promise<ClassroomCourse[]> {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) {
    throw new Error('Não autenticado com o Google Classroom. Faça login com o Google primeiro.');
  }

  const response = await fetch(
    'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&pageSize=50',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Classroom] Erro ao buscar cursos:', response.status, errorText);
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sessão expirada. Por favor, conecte-se novamente ao Google Classroom.');
    }
    throw new Error(`Erro ao consultar Google Classroom (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.courses || []) as ClassroomCourse[];
}

/**
 * Busca os professores vinculados a uma turma específica no Google Classroom
 */
export async function fetchCourseTeachers(courseId: string, token?: string): Promise<ClassroomTeacher[]> {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) {
    throw new Error('Não autenticado com o Google Classroom.');
  }

  const response = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/teachers`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    console.warn(`[Google Classroom] Não foi possível obter professores do curso ${courseId}:`, response.status);
    return [];
  }

  const data = await response.json();
  return (data.teachers || []) as ClassroomTeacher[];
}

/**
 * Publica um comunicado no mural da turma no Google Classroom
 * (Operação com mutação: deve sempre ser precedida de confirmação explícita na UI)
 */
export async function postCourseAnnouncement(
  courseId: string,
  text: string,
  token?: string
): Promise<ClassroomAnnouncement> {
  const accessToken = token || cachedAccessToken;
  if (!accessToken) {
    throw new Error('Não autenticado com o Google Classroom.');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('O texto do comunicado não pode ser vazio.');
  }

  const response = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/announcements`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        state: 'PUBLISHED',
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Google Classroom] Falha ao publicar aviso:', response.status, errorText);
    throw new Error(`Falha ao publicar comunicado no Classroom (${response.status}): ${errorText}`);
  }

  return await response.json();
}

/**
 * Converte um Curso do Google Classroom em uma Turma válida do sistema RIOS
 */
export function convertClassroomCourseToTurma(
  course: ClassroomCourse,
  escolaNomePadrao: string = 'Unidade Principal',
  turnoPadrao: Turno = 'NOITE'
): Turma {
  // Gera código único e limpo baseado na seção ou nome
  const codigoLimpo = course.section
    ? course.section.trim().toUpperCase()
    : course.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 4)
        .toUpperCase() + '-' + course.id.slice(-2);

  // Determina turno pelo texto do nome/seção se houver pistas
  let turnoDetectado: Turno = turnoPadrao;
  const textoGeral = `${course.name} ${course.section || ''} ${course.room || ''}`.toUpperCase();
  if (textoGeral.includes('MANHÃ') || textoGeral.includes('MATUTINO')) turnoDetectado = 'MANHÃ';
  else if (textoGeral.includes('TARDE') || textoGeral.includes('VESPERTINO')) turnoDetectado = 'TARDE';
  else if (textoGeral.includes('NOITE') || textoGeral.includes('NOTURNO')) turnoDetectado = 'NOITE';

  // Componente curricular inicial correspondente ao curso do Classroom
  const componenteInicial: ComponenteDaTurma = {
    id: `comp-gc-${course.id}-1`,
    nome: course.name,
    cargaHoraria: 60,
    status: 'EM ANDAMENTO',
  };

  const turmaRios: Turma = {
    id: `turma-gc-${course.id}`,
    codigo: codigoLimpo || `GC-${course.id.slice(-4)}`,
    curso: course.name,
    escola: escolaNomePadrao,
    sala: course.room || 'Sala Virtual Google Classroom',
    turno: turnoDetectado,
    diaSemana: 'Segunda-feira',
    horario: turnoDetectado === 'NOITE' ? '18:30 – 22:30' : turnoDetectado === 'MANHÃ' ? '07:30 – 11:30' : '13:30 – 17:30',
    componentes: [componenteInicial],
    googleClassroomId: course.id,
    googleClassroomLink: course.alternateLink || `https://classroom.google.com/c/${course.id}`,
    googleClassroomCode: course.enrollmentCode,
  };

  return turmaRios;
}
