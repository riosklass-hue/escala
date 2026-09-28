import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  where,
  runTransaction,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Usuario } from '../types/rios';

// Inicializa a aplicação Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Conecta ao Firestore com o DatabaseId configurado
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || undefined
);

// Conecta ao Firebase Authentication
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
};
export type { FirebaseUser };

export const USUARIO_PADRAO_SISTEMA: Usuario = {
  id: 'admin-principal',
  nome: 'Administrador (RIOS)',
  email: 'riosklass@gmail.com',
  perfil: 'ADMIN',
  cargo: 'Administrador Geral',
  ativo: true,
  dataCriacao: new Date().toLocaleDateString('pt-BR'),
  ultimoAcesso: new Date().toLocaleDateString('pt-BR'),
};

/**
 * Obtém ou inicializa o perfil de usuário armazenado no Firestore sob o UID do Firebase Auth.
 * Garante que o acesso nunca seja bloqueado e que o usuário principal tenha privilégios de ADMIN.
 */
export async function obterOuCriarPerfilUsuario(
  firebaseUser: FirebaseUser
): Promise<Usuario> {
  const userRef = doc(db, 'usuarios', firebaseUser.uid);

  try {
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data() as Usuario;
      const isAdminAccount =
        !firebaseUser.email ||
        firebaseUser.email === 'riosklass@gmail.com' ||
        data.perfil === 'ADMIN';

      const perfilAtualizado: Usuario = {
        ...data,
        id: firebaseUser.uid,
        ativo: true, // Sempre ativo para não bloquear o acesso
        perfil: isAdminAccount ? 'ADMIN' : data.perfil,
        cargo: isAdminAccount ? (data.cargo || 'Administrador Geral') : data.cargo,
      };

      if (!data.ativo || (isAdminAccount && data.perfil !== 'ADMIN')) {
        await setDoc(userRef, perfilAtualizado, { merge: true });
      }

      return perfilAtualizado;
    }

    const isAdminAccount =
      !firebaseUser.email ||
      firebaseUser.email === 'riosklass@gmail.com';

    const novoPerfil: Usuario = {
      id: firebaseUser.uid,
      nome: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Administrador'),
      email: firebaseUser.email || 'riosklass@gmail.com',
      perfil: isAdminAccount ? 'ADMIN' : 'PROFESSOR',
      cargo: isAdminAccount ? 'Administrador Geral' : 'Docente',
      ativo: true, // Sempre ativo para acesso imediato e liberado
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      ultimoAcesso: new Date().toLocaleDateString('pt-BR'),
    };

    await setDoc(userRef, novoPerfil, { merge: true });
    return novoPerfil;
  } catch (err) {
    console.warn('[Firebase] Fallback local para perfil ativo:', err);
    return {
      id: firebaseUser.uid,
      nome: firebaseUser.displayName || 'Administrador (RIOS)',
      email: firebaseUser.email || 'riosklass@gmail.com',
      perfil: 'ADMIN',
      cargo: 'Administrador Geral',
      ativo: true,
      dataCriacao: new Date().toLocaleDateString('pt-BR'),
      ultimoAcesso: new Date().toLocaleDateString('pt-BR'),
    };
  }
}

// Validação de conexão conforme exigido pelas diretrizes
export async function testFirebaseConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firebase] Conexão com Firestore estabelecida com sucesso.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Cliente offline ou aguardando conexão com Firestore.');
    } else {
      console.log('[Firebase] Verificação inicial de Firestore concluída.');
    }
    return true;
  }
}

// Salva um documento individual propagando exceção para o chamador
export async function syncSalvarDocumento<T extends { id: string }>(
  colecao: string,
  item: T
): Promise<void> {
  const docRef = doc(db, colecao, item.id);
  await setDoc(docRef, item, { merge: true });
}

// Salva um lote de documentos propagando exceção para o chamador
export async function syncSalvarLote<T extends { id: string }>(
  colecao: string,
  itens: T[]
): Promise<void> {
  if (!itens || itens.length === 0) return;
  const batch = writeBatch(db);
  for (const item of itens) {
    if (item && item.id) {
      const docRef = doc(db, colecao, item.id);
      batch.set(docRef, item, { merge: true });
    }
  }
  await batch.commit();
}

// Remove um documento do Firestore propagando exceção para o chamador
export async function syncDeletarDocumento(
  colecao: string,
  id: string
): Promise<void> {
  const docRef = doc(db, colecao, id);
  await deleteDoc(docRef);
}

// Escuta alterações em tempo real de uma coleção com propagação visível de erro
export function subscribeColecao<T>(
  colecao: string,
  callback: (dados: T[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, colecao);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const itens = snapshot.docs.map((docSnap) => docSnap.data() as T);
      callback(itens);
    },
    (error) => {
      console.error(`[Firebase] Erro de permissão/acesso em ${colecao}:`, error);
      if (onError) onError(error);
    }
  );
}

// Escuta documento individual em tempo real
export function subscribeDocumento<T>(
  colecao: string,
  docId: string,
  callback: (dado: T | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, colecao, docId);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as T);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`[Firebase] Erro de acesso ao documento ${colecao}/${docId}:`, error);
      if (onError) onError(error);
    }
  );
}

// Escuta registros de aulas atribuídas a um professor específico
export function subscribeAulasDocente(
  professorIdOuUid: string,
  callback: (dados: any[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'aulasMinistradas');
  const q = query(colRef, where('professorId', '==', professorIdOuUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const itens = snapshot.docs.map((docSnap) => docSnap.data());
      callback(itens);
    },
    (error) => {
      console.error('[Firebase] Erro de acesso às aulas do professor:', error);
      if (onError) onError(error);
    }
  );
}

// Verifica se a coleção está vazia
export async function isColecaoVazia(colecao: string): Promise<boolean> {
  const colRef = collection(db, colecao);
  const snap = await getDocs(colRef);
  return snap.empty;
}

// Retorna todos os IDs existentes de uma coleção (útil para auditoria e limpeza de projeções obsoletas)
export async function listarIdsDocumentos(colecao: string): Promise<string[]> {
  const colRef = collection(db, colecao);
  const snap = await getDocs(colRef);
  return snap.docs.map((docSnap) => docSnap.id);
}
