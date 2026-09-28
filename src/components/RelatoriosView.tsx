import React, { useState, useMemo } from 'react';
import { Turma, Professor, ComponenteDaTurma } from '../types/rios';
import {
  calcularMetricasTurma,
  calcularHorasAtuaisProfessor,
  obterStatusDocenteNoTurno,
} from '../services/riosEngine';
import {
  parseDataBR,
  formatarDataBR,
  getDiasDaSemana,
  getDiasDoMes,
  getDiaSemanaPorData,
  isDataNoIntervalo,
} from '../utils/conflitoAgenda';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  School,
  Building,
  DollarSign,
  Award,
  CalendarDays,
  CalendarRange,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  Users,
  GraduationCap,
} from 'lucide-react';

interface RelatoriosViewProps {
  turmas: Turma[];
  professores: Professor[];
}

export type PerspectivaTemporal = 'SEMANAL' | 'MENSAL' | 'ANUAL';
export type TipoRelatorio = 'alocacao-docente' | 'academico' | 'carga-financeiro';

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({
  turmas,
  professores,
}) => {
  // Perspectiva Temporal: Semanal, Mensal ou Anual
  const [perspectiva, setPerspectiva] = useState<PerspectivaTemporal>('SEMANAL');

  // Tipo de Relatório Ativo
  const [tipoAtivo, setTipoAtivo] = useState<TipoRelatorio>('alocacao-docente');

  // Filtros de texto e escola
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroEscola, setFiltroEscola] = useState<string>('TODAS');

  // Controle de Navegação Temporal
  // Semanal: segunda-feira de referência (padrão: 07/09/2026)
  const [dataBaseSemana, setDataBaseSemana] = useState<Date>(() => new Date(2026, 8, 7));

  // Mensal: Mês e Ano (padrão: Setembro / 2026)
  const [mesSelecionado, setMesSelecionado] = useState<number>(8); // Setembro (0-indexed)
  const [anoSelecionado, setAnoSelecionado] = useState<number>(2026);

  // Anual: Ano Letivo (padrão: 2026)
  const [anoLetivo, setAnoLetivo] = useState<number>(2026);

  // Lista única de escolas disponíveis para o filtro
  const listaEscolas = useMemo(() => {
    const escolas = new Set<string>();
    turmas.forEach((t) => {
      if (t.escola) escolas.add(t.escola);
    });
    return Array.from(escolas);
  }, [turmas]);

  // ==========================================
  // NAVEGAÇÃO DE SEMANA
  // ==========================================
  const avancarSemana = () => {
    setDataBaseSemana((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const retrocederSemana = () => {
    setDataBaseSemana((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const irSemanaAtual = () => {
    setDataBaseSemana(new Date(2026, 8, 7));
  };

  const diasDaSemanaAtiva = useMemo(() => {
    return getDiasDaSemana(dataBaseSemana, true); // Segunda a Sábado
  }, [dataBaseSemana]);

  const intervaloSemanaLabel = useMemo(() => {
    if (diasDaSemanaAtiva.length === 0) return '';
    const inicio = formatarDataBR(diasDaSemanaAtiva[0]);
    const fim = formatarDataBR(diasDaSemanaAtiva[diasDaSemanaAtiva.length - 1]);
    return `Semana de ${inicio} a ${fim}`;
  }, [diasDaSemanaAtiva]);

  // ==========================================
  // NAVEGAÇÃO DE MÊS
  // ==========================================
  const avancarMes = () => {
    if (mesSelecionado === 11) {
      setMesSelecionado(0);
      setAnoSelecionado((prev) => prev + 1);
    } else {
      setMesSelecionado((prev) => prev + 1);
    }
  };

  const retrocederMes = () => {
    if (mesSelecionado === 0) {
      setMesSelecionado(11);
      setAnoSelecionado((prev) => prev - 1);
    } else {
      setMesSelecionado((prev) => prev - 1);
    }
  };

  // Matriz de dias para o mês selecionado
  const diasDoMesMatriz = useMemo(() => {
    return getDiasDoMes(anoSelecionado, mesSelecionado);
  }, [anoSelecionado, mesSelecionado]);

  // ==========================================
  // EXPORTAR PARA CSV
  // ==========================================
  const exportarCSV = (dados: any[], colunas: string[], nomeArquivo: string) => {
    if (dados.length === 0) return;
    const cabecalho = colunas.join(';');
    const linhas = dados.map((item) =>
      colunas.map((col) => `"${item[col] ?? ''}"`).join(';')
    );
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [cabecalho, ...linhas].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${nomeArquivo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // RELATÓRIO 1: ALOCAÇÃO DOCENTE (SEMANAL / MENSAL / ANUAL)
  // =========================================================================
  const dadosAlocacaoDocente = useMemo(() => {
    if (perspectiva === 'SEMANAL') {
      // Alocação Docente na Semana Selecionada
      return professores.map((prof) => {
        const turmasNaSemana: Array<{
          turma: Turma;
          componente: ComponenteDaTurma;
          diaNome: string;
        }> = [];

        diasDaSemanaAtiva.forEach((dataDia) => {
          const diaNome = getDiaSemanaPorData(dataDia);
          if (!diaNome) return;

          turmas.forEach((t) => {
            if (t.diaSemana === diaNome) {
              t.componentes.forEach((c) => {
                if (c.professorId === prof.id) {
                  const vigente = isDataNoIntervalo(
                    dataDia,
                    c.dataInicio,
                    c.dataFim || c.dataConclusao
                  );
                  if (vigente || c.status === 'EM ANDAMENTO') {
                    turmasNaSemana.push({ turma: t, componente: c, diaNome });
                  }
                }
              });
            }
          });
        });

        const diasComAula = Array.from(new Set(turmasNaSemana.map((x) => x.diaNome)));
        const turnosAtuados = Array.from(new Set(turmasNaSemana.map((x) => x.turma.turno)));
        const escolasAtuadas = Array.from(new Set(turmasNaSemana.map((x) => x.turma.escola)));
        const salasAtuadas = Array.from(new Set(turmasNaSemana.map((x) => x.turma.sala)));
        const turmasCodigos = Array.from(new Set(turmasNaSemana.map((x) => x.turma.codigo)));
        const componentesVigentes = Array.from(
          new Set(
            turmasNaSemana.map(
              (x) =>
                `${x.componente.nome} (${x.componente.dataInicio || 'Início'} a ${
                  x.componente.dataFim || x.componente.dataConclusao || 'Fim'
                })`
            )
          )
        );

        const totalAulasSemana = turmasNaSemana.length;
        const horasSemanais = totalAulasSemana * 4;
        const remuneracaoSemanal = horasSemanais * prof.valorHora;

        return {
          Professor: prof.nome,
          Periodo: intervaloSemanaLabel,
          DiasComAula: diasComAula.length > 0 ? diasComAula.join(', ') : 'Sem aulas na semana',
          Turnos: turnosAtuados.length > 0 ? turnosAtuados.join(', ') : 'Livre',
          Turmas: turmasCodigos.length > 0 ? turmasCodigos.join(', ') : 'Nenhuma',
          Escolas: escolasAtuadas.length > 0 ? escolasAtuadas.join(', ') : 'Nenhuma',
          Salas: salasAtuadas.length > 0 ? salasAtuadas.join(', ') : '-',
          Componentes: componentesVigentes.length > 0 ? componentesVigentes.join(' | ') : 'Nenhum',
          CargaSemanal: `${horasSemanais}h / semana`,
          RemuneracaoSemanal: `R$ ${remuneracaoSemanal.toLocaleString('pt-BR')},00`,
          Status: totalAulasSemana > 0 ? 'ALOCADO NA SEMANA' : 'DISPONÍVEL',
          rawHoras: horasSemanais,
          rawValor: remuneracaoSemanal,
          rawEscolas: escolasAtuadas,
        };
      });
    }

    if (perspectiva === 'MENSAL') {
      // Alocação Docente no Mês Selecionado
      return professores.map((prof) => {
        let totalAulasNoMes = 0;
        const turmasNoMesSet = new Set<string>();
        const componentesNoMesSet = new Set<string>();
        const escolasNoMesSet = new Set<string>();

        diasDoMesMatriz.forEach((item) => {
          if (!item.isCurrentMonth) return;
          const diaNome = getDiaSemanaPorData(item.date);
          if (!diaNome) return;

          turmas.forEach((t) => {
            if (t.diaSemana === diaNome) {
              t.componentes.forEach((c) => {
                if (c.professorId === prof.id) {
                  const vigente = isDataNoIntervalo(
                    item.date,
                    c.dataInicio,
                    c.dataFim || c.dataConclusao
                  );
                  if (vigente || c.status === 'EM ANDAMENTO') {
                    totalAulasNoMes++;
                    turmasNoMesSet.add(t.codigo);
                    componentesNoMesSet.add(
                      `${c.nome} (${c.dataInicio || ''} a ${c.dataFim || c.dataConclusao || ''})`
                    );
                    escolasNoMesSet.add(t.escola);
                  }
                }
              });
            }
          });
        });

        const horasNoMes = totalAulasNoMes * 4;
        const tetoMensal = prof.cargaHorariaMaxima || 80;
        const percentualTeto = Math.min(100, Math.round((horasNoMes / tetoMensal) * 100));
        const saldoHorasLivres = Math.max(0, tetoMensal - horasNoMes);
        const valorEstimadoMes = horasNoMes * prof.valorHora;

        return {
          Professor: prof.nome,
          Periodo: `${MESES_NOMES[mesSelecionado]} / ${anoSelecionado}`,
          TurmasAtivas:
            turmasNoMesSet.size > 0 ? Array.from(turmasNoMesSet).join(', ') : 'Nenhuma',
          ComponentesNoMes:
            componentesNoMesSet.size > 0
              ? Array.from(componentesNoMesSet).join(' | ')
              : 'Nenhum',
          Escolas:
            escolasNoMesSet.size > 0 ? Array.from(escolasNoMesSet).join(', ') : 'Nenhuma',
          CargaMensal: `${horasNoMes}h`,
          TetoMensal: `${tetoMensal}h`,
          PercentualOcupacao: `${percentualTeto}%`,
          SaldoHorasLivres: `${saldoHorasLivres}h`,
          ValorHora: `R$ ${prof.valorHora},00`,
          RemuneracaoMensal: `R$ ${valorEstimadoMes.toLocaleString('pt-BR')},00`,
          Status:
            horasNoMes === 0
              ? 'DISPONÍVEL'
              : percentualTeto >= 90
              ? 'TETO ATINGIDO'
              : 'REGULAR',
          rawHoras: horasNoMes,
          rawValor: valorEstimadoMes,
          rawEscolas: Array.from(escolasNoMesSet),
        };
      });
    }

    // Perspectiva ANUAL
    return professores.map((prof) => {
      let totalAulasAno = 0;
      const turmasAnoSet = new Set<string>();
      const componentesAnoSet = new Set<string>();
      const escolasAnoSet = new Set<string>();

      for (let m = 0; m < 12; m++) {
        const diasMatriz = getDiasDoMes(anoLetivo, m);
        diasMatriz.forEach((item) => {
          if (!item.isCurrentMonth) return;
          const diaNome = getDiaSemanaPorData(item.date);
          if (!diaNome) return;

          turmas.forEach((t) => {
            if (t.diaSemana === diaNome) {
              t.componentes.forEach((c) => {
                if (c.professorId === prof.id) {
                  const vigente = isDataNoIntervalo(
                    item.date,
                    c.dataInicio,
                    c.dataFim || c.dataConclusao
                  );
                  if (vigente || c.status === 'EM ANDAMENTO') {
                    totalAulasAno++;
                    turmasAnoSet.add(t.codigo);
                    componentesAnoSet.add(c.nome);
                    escolasAnoSet.add(t.escola);
                  }
                }
              });
            }
          });
        });
      }

      const totalHorasAno = totalAulasAno * 4;
      const mediaHorasMes = Math.round(totalHorasAno / 12);
      const valorEstimadoAno = totalHorasAno * prof.valorHora;

      return {
        Professor: prof.nome,
        Periodo: `Ano Letivo ${anoLetivo}`,
        TurmasNoAno:
          turmasAnoSet.size > 0 ? Array.from(turmasAnoSet).join(', ') : 'Nenhuma',
        TotalComponentes: componentesAnoSet.size,
        ComponentesLista:
          componentesAnoSet.size > 0 ? Array.from(componentesAnoSet).join(', ') : 'Nenhum',
        EscolasAtendidas:
          escolasAnoSet.size > 0 ? Array.from(escolasAnoSet).join(', ') : 'Nenhuma',
        CargaTotalAnual: `${totalHorasAno}h`,
        MediaMensal: `${mediaHorasMes}h / mês`,
        RemuneracaoAnual: `R$ ${valorEstimadoAno.toLocaleString('pt-BR')},00`,
        Status: totalHorasAno > 0 ? 'ATIVO NO ANO LETIVO' : 'SEM ALOCAÇÃO NO ANO',
        rawHoras: totalHorasAno,
        rawValor: valorEstimadoAno,
        rawEscolas: Array.from(escolasAnoSet),
      };
    });
  }, [
    perspectiva,
    professores,
    turmas,
    diasDaSemanaAtiva,
    intervaloSemanaLabel,
    diasDoMesMatriz,
    mesSelecionado,
    anoSelecionado,
    anoLetivo,
  ]);

  // Filtragem do Relatório 1
  const dadosAlocacaoDocenteFiltrados = useMemo(() => {
    return dadosAlocacaoDocente.filter((item) => {
      const busca = filtroTexto.toLowerCase();
      const matchBusca =
        !filtroTexto ||
        item.Professor.toLowerCase().includes(busca) ||
        (item.Turmas && item.Turmas.toLowerCase().includes(busca)) ||
        (item.Componentes && item.Componentes.toLowerCase().includes(busca)) ||
        (item.Escolas && item.Escolas.toLowerCase().includes(busca));

      const matchEscola =
        filtroEscola === 'TODAS' ||
        (item.rawEscolas && item.rawEscolas.includes(filtroEscola));

      return matchBusca && matchEscola;
    });
  }, [dadosAlocacaoDocente, filtroTexto, filtroEscola]);

  // =========================================================================
  // RELATÓRIO 2: RELATÓRIO ACADÊMICO DAS TURMAS (SEMANAL / MENSAL / ANUAL)
  // =========================================================================
  const dadosAcademicos = useMemo(() => {
    if (perspectiva === 'SEMANAL') {
      return turmas.map((turma) => {
        const m = calcularMetricasTurma(turma);

        // Encontra o componente em vigência nesta semana específica
        let compVigenteNaSemana: ComponenteDaTurma | null = null;
        diasDaSemanaAtiva.forEach((d) => {
          const diaNome = getDiaSemanaPorData(d);
          if (turma.diaSemana === diaNome) {
            turma.componentes.forEach((c) => {
              if (isDataNoIntervalo(d, c.dataInicio, c.dataFim || c.dataConclusao)) {
                compVigenteNaSemana = c;
              }
            });
          }
        });

        if (!compVigenteNaSemana) {
          compVigenteNaSemana =
            turma.componentes.find((c) => c.status === 'EM ANDAMENTO') || null;
        }

        const horasNaSemana = compVigenteNaSemana ? 4 : 0;

        return {
          Turma: turma.codigo,
          Curso: turma.curso,
          Escola: turma.escola,
          Sala: turma.sala,
          Turno: `${turma.turno} (${turma.diaSemana})`,
          DocenteSemana: compVigenteNaSemana?.professorNome || 'Sem professor alocado',
          ComponenteVigente: compVigenteNaSemana
            ? `${compVigenteNaSemana.nome} [${compVigenteNaSemana.dataInicio || 'Início'} a ${
                compVigenteNaSemana.dataFim || compVigenteNaSemana.dataConclusao || 'Fim'
              }]`
            : 'Nenhum componente ativo nesta semana',
          CargaSemanalTurma: `${horasNaSemana}h`,
          CargaCumpridaTotal: `${m.cargaMinistrada}h`,
          CargaTotalCurso: `${m.cargaTotal}h`,
          PercentualProgresso: `${m.percentualConcluido}%`,
          StatusSemana: compVigenteNaSemana ? 'EM AULA NA SEMANA' : 'SEM ENCONTRO',
          rawEscola: turma.escola,
        };
      });
    }

    if (perspectiva === 'MENSAL') {
      return turmas.map((turma) => {
        const m = calcularMetricasTurma(turma);

        // Componentes com aula dentro deste mês
        const componentesDoMesSet = new Set<string>();
        const docentesDoMesSet = new Set<string>();
        let aulasNoMesCount = 0;

        diasDoMesMatriz.forEach((item) => {
          if (!item.isCurrentMonth) return;
          const diaNome = getDiaSemanaPorData(item.date);
          if (turma.diaSemana === diaNome) {
            turma.componentes.forEach((c) => {
              const vigente = isDataNoIntervalo(
                item.date,
                c.dataInicio,
                c.dataFim || c.dataConclusao
              );
              if (vigente || c.status === 'EM ANDAMENTO') {
                aulasNoMesCount++;
                componentesDoMesSet.add(c.nome);
                if (c.professorNome) docentesDoMesSet.add(c.professorNome);
              }
            });
          }
        });

        const horasMinistradasNoMes = aulasNoMesCount * 4;

        return {
          Turma: turma.codigo,
          Curso: turma.curso,
          Escola: turma.escola,
          Sala: turma.sala,
          Turno: turma.turno,
          DocentesNoMes:
            docentesDoMesSet.size > 0 ? Array.from(docentesDoMesSet).join(', ') : 'A definir',
          ComponentesNoMes:
            componentesDoMesSet.size > 0
              ? Array.from(componentesDoMesSet).join(' | ')
              : 'Nenhum componente',
          CargaNoMes: `${horasMinistradasNoMes}h`,
          CargaTotalCurso: `${m.cargaTotal}h`,
          ProgressoAcumulado: `${m.percentualConcluido}%`,
          StatusNoMes:
            aulasNoMesCount > 0 ? 'ATIVO NO MÊS' : 'RECESSO / SEM AULAS',
          rawEscola: turma.escola,
        };
      });
    }

    // Perspectiva ANUAL
    return turmas.map((turma) => {
      const m = calcularMetricasTurma(turma);
      const totalComponentes = turma.componentes.length;
      const componentesConcluidos = turma.componentes.filter((c) => c.status === 'CONCLUÍDO').length;

      // Data de previsão de conclusão da turma
      const ultimoComponente = turma.componentes[turma.componentes.length - 1];
      const previsaoFim =
        ultimoComponente?.dataFim || ultimoComponente?.dataConclusao || 'Dezembro / 2026';

      return {
        Turma: turma.codigo,
        Curso: turma.curso,
        Escola: turma.escola,
        Sala: turma.sala,
        Turno: `${turma.turno} (${turma.diaSemana})`,
        ComponentesTotal: totalComponentes,
        ComponentesConcluidos: componentesConcluidos,
        CargaTotal: `${m.cargaTotal}h`,
        CargaMinistrada: `${m.cargaMinistrada}h`,
        CargaRestante: `${m.cargaRestante}h`,
        PercentualConclusao: `${m.percentualConcluido}%`,
        PrevisaoConclusao: previsaoFim,
        StatusGeral:
          m.percentualConcluido === 100
            ? 'TURMA CONCLUÍDA'
            : m.percentualConcluido > 0
            ? 'EM ANDAMENTO'
            : 'PROGRAMADA',
        rawEscola: turma.escola,
      };
    });
  }, [
    perspectiva,
    turmas,
    diasDaSemanaAtiva,
    diasDoMesMatriz,
  ]);

  // Filtragem do Relatório 2
  const dadosAcademicosFiltrados = useMemo(() => {
    return dadosAcademicos.filter((item) => {
      const busca = filtroTexto.toLowerCase();
      const matchBusca =
        !filtroTexto ||
        item.Turma.toLowerCase().includes(busca) ||
        item.Curso.toLowerCase().includes(busca) ||
        item.Escola.toLowerCase().includes(busca);

      const matchEscola = filtroEscola === 'TODAS' || item.rawEscola === filtroEscola;

      return matchBusca && matchEscola;
    });
  }, [dadosAcademicos, filtroTexto, filtroEscola]);

  // =========================================================================
  // RELATÓRIO 3: CARGA DOCENTE E FINANCEIRO (SEMANAL / MENSAL / ANUAL)
  // =========================================================================
  const dadosCargaDocente = useMemo(() => {
    if (perspectiva === 'SEMANAL') {
      return professores.map((prof) => {
        let totalAulasSemana = 0;
        const turmasSemanaSet = new Set<string>();
        const escolasSemanaSet = new Set<string>();

        diasDaSemanaAtiva.forEach((d) => {
          const diaNome = getDiaSemanaPorData(d);
          if (!diaNome) return;

          turmas.forEach((t) => {
            if (t.diaSemana === diaNome) {
              t.componentes.forEach((c) => {
                if (c.professorId === prof.id) {
                  const vigente = isDataNoIntervalo(
                    d,
                    c.dataInicio,
                    c.dataFim || c.dataConclusao
                  );
                  if (vigente || c.status === 'EM ANDAMENTO') {
                    totalAulasSemana++;
                    turmasSemanaSet.add(t.codigo);
                    escolasSemanaSet.add(t.escola);
                  }
                }
              });
            }
          });
        });

        const horasNaSemana = totalAulasSemana * 4;
        const remuneracaoSemanal = horasNaSemana * prof.valorHora;

        return {
          Professor: prof.nome,
          Periodo: intervaloSemanaLabel,
          HorasNaSemana: `${horasNaSemana}h`,
          ValorHora: `R$ ${prof.valorHora},00`,
          RemuneracaoSemanal: `R$ ${remuneracaoSemanal.toLocaleString('pt-BR')},00`,
          EscolasAtuadas:
            escolasSemanaSet.size > 0 ? Array.from(escolasSemanaSet).join(', ') : 'Nenhuma',
          TurmasVinculadas:
            turmasSemanaSet.size > 0 ? Array.from(turmasSemanaSet).join(', ') : 'Nenhuma',
          Disponibilidade:
            horasNaSemana === 0
              ? 'TOTALMENTE DISPONÍVEL'
              : horasNaSemana <= 16
              ? 'DISPONIBILIDADE PARCIAL'
              : 'CARGA COMPLETA',
          rawEscolas: Array.from(escolasSemanaSet),
        };
      });
    }

    if (perspectiva === 'MENSAL') {
      return professores.map((prof) => {
        let totalAulasNoMes = 0;
        const turmasNoMesSet = new Set<string>();
        const escolasNoMesSet = new Set<string>();

        diasDoMesMatriz.forEach((item) => {
          if (!item.isCurrentMonth) return;
          const diaNome = getDiaSemanaPorData(item.date);
          if (!diaNome) return;

          turmas.forEach((t) => {
            if (t.diaSemana === diaNome) {
              t.componentes.forEach((c) => {
                if (c.professorId === prof.id) {
                  const vigente = isDataNoIntervalo(
                    item.date,
                    c.dataInicio,
                    c.dataFim || c.dataConclusao
                  );
                  if (vigente || c.status === 'EM ANDAMENTO') {
                    totalAulasNoMes++;
                    turmasNoMesSet.add(t.codigo);
                    escolasNoMesSet.add(t.escola);
                  }
                }
              });
            }
          });
        });

        const horasNoMes = totalAulasNoMes * 4;
        const tetoMensal = prof.cargaHorariaMaxima || 80;
        const horasLivres = Math.max(0, tetoMensal - horasNoMes);
        const percentualOcupado = Math.min(100, Math.round((horasNoMes / tetoMensal) * 100));
        const remuneracaoMensal = horasNoMes * prof.valorHora;

        return {
          Professor: prof.nome,
          Periodo: `${MESES_NOMES[mesSelecionado]} / ${anoSelecionado}`,
          HorasNoMes: `${horasNoMes}h`,
          TetoMensal: `${tetoMensal}h`,
          HorasLivres: `${horasLivres}h`,
          PercentualOcupado: `${percentualOcupado}%`,
          ValorHora: `R$ ${prof.valorHora},00`,
          RemuneracaoMensal: `R$ ${remuneracaoMensal.toLocaleString('pt-BR')},00`,
          EscolasAtuadas:
            escolasNoMesSet.size > 0 ? Array.from(escolasNoMesSet).join(', ') : 'Nenhuma',
          TurmasVinculadas:
            turmasNoMesSet.size > 0 ? Array.from(turmasNoMesSet).join(', ') : 'Nenhuma',
          rawEscolas: Array.from(escolasNoMesSet),
        };
      });
    }

    // Perspectiva ANUAL
    return professores.map((prof) => {
      let totalAulasAno = 0;
      const turmasAnoSet = new Set<string>();
      const escolasAnoSet = new Set<string>();

      for (let m = 0; m < 12; m++) {
        const diasMatriz = getDiasDoMes(anoLetivo, m);
        diasMatriz.forEach((item) => {
          if (!item.isCurrentMonth) return;
          const diaNome = getDiaSemanaPorData(item.date);
          if (!diaNome) return;

          turmas.forEach((t) => {
            if (t.diaSemana === diaNome) {
              t.componentes.forEach((c) => {
                if (c.professorId === prof.id) {
                  const vigente = isDataNoIntervalo(
                    item.date,
                    c.dataInicio,
                    c.dataFim || c.dataConclusao
                  );
                  if (vigente || c.status === 'EM ANDAMENTO') {
                    totalAulasAno++;
                    turmasAnoSet.add(t.codigo);
                    escolasAnoSet.add(t.escola);
                  }
                }
              });
            }
          });
        });
      }

      const totalHorasAno = totalAulasAno * 4;
      const custoTotalAno = totalHorasAno * prof.valorHora;
      const mediaHorasMes = Math.round(totalHorasAno / 12);
      const capacidadeAnualEstimada = (prof.cargaHorariaMaxima || 80) * 11; // 11 meses letivos

      return {
        Professor: prof.nome,
        Periodo: `Ano Letivo ${anoLetivo}`,
        HorasAnuaisProgramadas: `${totalHorasAno}h`,
        CapacidadeAnual: `${capacidadeAnualEstimada}h`,
        MediaHorasMes: `${mediaHorasMes}h / mês`,
        ValorHora: `R$ ${prof.valorHora},00`,
        CustoAnualTotal: `R$ ${custoTotalAno.toLocaleString('pt-BR')},00`,
        TurmasAtendidas:
          turmasAnoSet.size > 0 ? Array.from(turmasAnoSet).join(', ') : 'Nenhuma',
        EscolasHabituais: prof.escolasHabituais.join(', '),
        rawEscolas: Array.from(escolasAnoSet),
      };
    });
  }, [
    perspectiva,
    professores,
    turmas,
    diasDaSemanaAtiva,
    intervaloSemanaLabel,
    diasDoMesMatriz,
    mesSelecionado,
    anoSelecionado,
    anoLetivo,
  ]);

  // Filtragem do Relatório 3
  const dadosCargaDocenteFiltrados = useMemo(() => {
    return dadosCargaDocente.filter((item) => {
      const busca = filtroTexto.toLowerCase();
      const matchBusca =
        !filtroTexto ||
        item.Professor.toLowerCase().includes(busca) ||
        (item.TurmasVinculadas && item.TurmasVinculadas.toLowerCase().includes(busca)) ||
        (item.EscolasAtuadas && item.EscolasAtuadas.toLowerCase().includes(busca));

      const matchEscola =
        filtroEscola === 'TODAS' ||
        (item.rawEscolas && item.rawEscolas.includes(filtroEscola));

      return matchBusca && matchEscola;
    });
  }, [dadosCargaDocente, filtroTexto, filtroEscola]);

  // =========================================================================
  // METRICAS DE RESUMO DO TOPO (SEMANAL / MENSAL / ANUAL)
  // =========================================================================
  const metricasResumoTopo = useMemo(() => {
    let totalHoras = 0;
    let valorTotal = 0;
    let professoresAtivos = 0;

    dadosAlocacaoDocente.forEach((item) => {
      totalHoras += item.rawHoras || 0;
      valorTotal += item.rawValor || 0;
      if (item.rawHoras && item.rawHoras > 0) {
        professoresAtivos++;
      }
    });

    const totalTurmas = turmas.length;

    return {
      totalHoras,
      valorTotal,
      professoresAtivos,
      totalTurmas,
    };
  }, [dadosAlocacaoDocente, turmas]);

  return (
    <div className="space-y-6">
      {/* Top Header Card: Title, Global Temporal Perspective & Navigation Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Relatórios Operacionais e Acadêmicos (RIOS)
            </h2>
            <p className="text-xs text-slate-500">
              Análise e auditoria estruturada por perspectiva Semanal, Mensal ou Anual.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Global Temporal Perspective Switcher Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                id="btn-relatorio-perspectiva-semanal"
                onClick={() => setPerspectiva('SEMANAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  perspectiva === 'SEMANAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Visão Semanal</span>
              </button>

              <button
                id="btn-relatorio-perspectiva-mensal"
                onClick={() => setPerspectiva('MENSAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  perspectiva === 'MENSAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Visão Mensal</span>
              </button>

              <button
                id="btn-relatorio-perspectiva-anual"
                onClick={() => setPerspectiva('ANUAL')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  perspectiva === 'ANUAL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Visão Anual</span>
              </button>
            </div>

            {/* Export Button */}
            <button
              id="btn-exportar-csv"
              onClick={() => {
                const sufixoData =
                  perspectiva === 'SEMANAL'
                    ? `Semana_${formatarDataBR(diasDaSemanaAtiva[0]).replace(/\//g, '-')}`
                    : perspectiva === 'MENSAL'
                    ? `Mes_${MESES_NOMES[mesSelecionado]}_${anoSelecionado}`
                    : `Ano_${anoLetivo}`;

                if (tipoAtivo === 'alocacao-docente') {
                  exportarCSV(
                    dadosAlocacaoDocenteFiltrados,
                    Object.keys(dadosAlocacaoDocente[0] || {}).filter((k) => !k.startsWith('raw')),
                    `RIOS_Alocacao_Docente_${sufixoData}`
                  );
                } else if (tipoAtivo === 'academico') {
                  exportarCSV(
                    dadosAcademicosFiltrados,
                    Object.keys(dadosAcademicos[0] || {}).filter((k) => !k.startsWith('raw')),
                    `RIOS_Relatorio_Academico_${sufixoData}`
                  );
                } else {
                  exportarCSV(
                    dadosCargaDocenteFiltrados,
                    Object.keys(dadosCargaDocente[0] || {}).filter((k) => !k.startsWith('raw')),
                    `RIOS_Carga_Docente_Valores_${sufixoData}`
                  );
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Exportar CSV ({perspectiva})</span>
            </button>
          </div>
        </div>

        {/* Dynamic Period Navigator Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 bg-slate-50/60 p-3 rounded-xl border">
          {perspectiva === 'SEMANAL' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-relatorio-prev-semana"
                  onClick={retrocederSemana}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Semana Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  id="btn-relatorio-semana-atual"
                  onClick={irSemanaAtual}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs"
                >
                  Semana Atual
                </button>
                <button
                  id="btn-relatorio-next-semana"
                  onClick={avancarSemana}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Próxima Semana"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-indigo-900 ml-1">
                  {intervaloSemanaLabel}
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Alocação semanal calculada para os 6 dias úteis letivos
              </div>
            </div>
          )}

          {perspectiva === 'MENSAL' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-relatorio-prev-mes"
                  onClick={retrocederMes}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  id="select-relatorio-mes"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1"
                >
                  {MESES_NOMES.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  id="select-relatorio-ano-mensal"
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(parseInt(e.target.value, 10))}
                  className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
                <button
                  id="btn-relatorio-next-mes"
                  onClick={avancarMes}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setMesSelecionado(8);
                    setAnoSelecionado(2026);
                  }}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs ml-1"
                >
                  Setembro/2026 (Atual)
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Carga mensal programada e folha de pagamento estimada
              </div>
            </div>
          )}

          {perspectiva === 'ANUAL' && (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  id="btn-relatorio-prev-ano"
                  onClick={() => setAnoLetivo((prev) => prev - 1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black text-indigo-900 px-3 py-1 bg-white rounded-lg border border-slate-200">
                  Ano Letivo {anoLetivo}
                </span>
                <button
                  id="btn-relatorio-next-ano"
                  onClick={() => setAnoLetivo((prev) => prev + 1)}
                  className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAnoLetivo(2026)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-2xs ml-1"
                >
                  2026 (Padrão)
                </button>
              </div>
              <div className="text-xs text-slate-500 font-medium">
                Planejamento orçamentário e acadêmico consolidado de todo o ano letivo
              </div>
            </div>
          )}
        </div>

        {/* KPI Summary Cards according to the active period */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Horas no Período ({perspectiva})
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-indigo-700">
                {metricasResumoTopo.totalHoras}h
              </span>
              <span className="text-[11px] text-slate-500 font-medium">docência total</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Professores Alocados
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-blue-700">
                {metricasResumoTopo.professoresAtivos} / {professores.length}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">ativos no período</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Turmas Cadastradas
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">
                {metricasResumoTopo.totalTurmas}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">em monitoramento</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Investimento Estimado ({perspectiva})
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-emerald-700">
                R$ {metricasResumoTopo.valorTotal.toLocaleString('pt-BR')},00
              </span>
            </div>
          </div>
        </div>

        {/* Report Sub-Tabs & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-2">
            <button
              id="tab-rel-alocacao"
              onClick={() => setTipoAtivo('alocacao-docente')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                tipoAtivo === 'alocacao-docente'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              1. Alocação Docente ({perspectiva})
            </button>
            <button
              id="tab-rel-academico"
              onClick={() => setTipoAtivo('academico')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                tipoAtivo === 'academico'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              2. Relatório Acadêmico das Turmas
            </button>
            <button
              id="tab-rel-carga"
              onClick={() => setTipoAtivo('carga-financeiro')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                tipoAtivo === 'carga-financeiro'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              3. Carga Docente e Folha / Valores
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                id="input-filtro-relatorio"
                type="text"
                placeholder="Filtrar por professor, disciplina, turma..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <select
                id="select-escola-relatorio"
                value={filtroEscola}
                onChange={(e) => setFiltroEscola(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-semibold"
              >
                <option value="TODAS">Todas as Escolas</option>
                {listaEscolas.map((esc, i) => (
                  <option key={i} value={esc}>
                    {esc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TABELA DE ALOCAÇÃO DOCENTE (SEMANAL / MENSAL / ANUAL)                  */}
      {/* ========================================================================= */}
      {tipoAtivo === 'alocacao-docente' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Alocação Docente ({perspectiva}):{' '}
                  {perspectiva === 'SEMANAL'
                    ? intervaloSemanaLabel
                    : perspectiva === 'MENSAL'
                    ? `${MESES_NOMES[mesSelecionado]} / ${anoSelecionado}`
                    : `Ano Letivo ${anoLetivo}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {dadosAlocacaoDocenteFiltrados.length} professor(es) correspondente(s)
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                {perspectiva === 'SEMANAL' ? (
                  <tr>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Dias com Aula</th>
                    <th className="px-3 py-3">Turnos</th>
                    <th className="px-3 py-3">Turmas</th>
                    <th className="px-4 py-3">Escolas Atuadas</th>
                    <th className="px-4 py-3">Componente Vigente (Semana)</th>
                    <th className="px-3 py-3">Carga Semanal</th>
                    <th className="px-3 py-3">Remuneração Estimada</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                ) : perspectiva === 'MENSAL' ? (
                  <tr>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Turmas Ativas no Mês</th>
                    <th className="px-4 py-3">Componentes em Curso</th>
                    <th className="px-4 py-3">Escolas</th>
                    <th className="px-3 py-3">Carga no Mês</th>
                    <th className="px-3 py-3">Teto Mensal</th>
                    <th className="px-3 py-3">% Ocupação</th>
                    <th className="px-3 py-3">Saldo Livre</th>
                    <th className="px-3 py-3">Remuneração Mensal</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Turmas Atendidas no Ano</th>
                    <th className="px-3 py-3">Nº Componentes</th>
                    <th className="px-4 py-3">Componentes Curriculares</th>
                    <th className="px-4 py-3">Escolas Atendidas</th>
                    <th className="px-3 py-3">Carga Total Anual</th>
                    <th className="px-3 py-3">Média / Mês</th>
                    <th className="px-3 py-3">Custo Anual Previsto</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dadosAlocacaoDocenteFiltrados.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {perspectiva === 'SEMANAL' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.Professor}</td>
                        <td className="px-3 py-3 font-semibold text-indigo-700">
                          {item.DiasComAula}
                        </td>
                        <td className="px-3 py-3 text-slate-700 font-medium">{item.Turnos}</td>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.Turmas}</td>
                        <td className="px-4 py-3 text-slate-800">{item.Escolas}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {item.Componentes}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {item.CargaSemanal}
                        </td>
                        <td className="px-3 py-3 font-bold text-emerald-700">
                          {item.RemuneracaoSemanal}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.Status === 'ALOCADO NA SEMANA'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.Status}
                          </span>
                        </td>
                      </>
                    ) : perspectiva === 'MENSAL' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.Professor}</td>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.TurmasAtivas}</td>
                        <td className="px-4 py-3 text-slate-700">{item.ComponentesNoMes}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">{item.Escolas}</td>
                        <td className="px-3 py-3 font-bold text-indigo-700">{item.CargaMensal}</td>
                        <td className="px-3 py-3 text-slate-500 font-medium">{item.TetoMensal}</td>
                        <td className="px-3 py-3 font-bold text-slate-800">
                          {item.PercentualOcupacao}
                        </td>
                        <td className="px-3 py-3 font-semibold text-emerald-700">
                          {item.SaldoHorasLivres}
                        </td>
                        <td className="px-3 py-3 font-bold text-emerald-700">
                          {item.RemuneracaoMensal}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.Status === 'TETO ATINGIDO'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : item.Status === 'REGULAR'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.Status}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.Professor}</td>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.TurmasNoAno}</td>
                        <td className="px-3 py-3 font-bold text-slate-800">
                          {item.TotalComponentes}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.ComponentesLista}</td>
                        <td className="px-4 py-3 text-slate-800 font-medium">
                          {item.EscolasAtendidas}
                        </td>
                        <td className="px-3 py-3 font-bold text-indigo-700">
                          {item.CargaTotalAnual}
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">{item.MediaMensal}</td>
                        <td className="px-3 py-3 font-bold text-emerald-700">
                          {item.RemuneracaoAnual}
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {item.Status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TABELA DO RELATÓRIO ACADÊMICO DAS TURMAS                               */}
      {/* ========================================================================= */}
      {tipoAtivo === 'academico' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <GraduationCap className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Relatório Acadêmico das Turmas ({perspectiva})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {dadosAcademicosFiltrados.length} turma(s) listada(s)
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                {perspectiva === 'SEMANAL' ? (
                  <tr>
                    <th className="px-3 py-3">Turma</th>
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Escola / Sala</th>
                    <th className="px-3 py-3">Turno & Dia</th>
                    <th className="px-4 py-3">Docente na Semana</th>
                    <th className="px-4 py-3">Componente Vigente (Datas)</th>
                    <th className="px-3 py-3">CH Semana</th>
                    <th className="px-3 py-3">CH Ministrada</th>
                    <th className="px-3 py-3">% Progresso</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                ) : perspectiva === 'MENSAL' ? (
                  <tr>
                    <th className="px-3 py-3">Turma</th>
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Escola / Sala</th>
                    <th className="px-3 py-3">Turno</th>
                    <th className="px-4 py-3">Docentes no Mês</th>
                    <th className="px-4 py-3">Componente(s) em Curso</th>
                    <th className="px-3 py-3">Carga no Mês</th>
                    <th className="px-3 py-3">CH Total Curso</th>
                    <th className="px-3 py-3">% Acumulado</th>
                    <th className="px-3 py-3">Status</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-3">Turma</th>
                    <th className="px-4 py-3">Curso</th>
                    <th className="px-4 py-3">Escola / Sala</th>
                    <th className="px-3 py-3">Turno & Dia</th>
                    <th className="px-3 py-3">Componentes Concluídos</th>
                    <th className="px-3 py-3">CH Total</th>
                    <th className="px-3 py-3">CH Ministrada no Ano</th>
                    <th className="px-3 py-3">CH Restante</th>
                    <th className="px-3 py-3">% Conclusão Geral</th>
                    <th className="px-4 py-3">Previsão Término</th>
                    <th className="px-3 py-3">Status Geral</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dadosAcademicosFiltrados.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {perspectiva === 'SEMANAL' ? (
                      <>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.Turma}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.Curso}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.Escola} ({item.Sala})
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">{item.Turno}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.DocenteSemana}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{item.ComponenteVigente}</td>
                        <td className="px-3 py-3 font-bold text-indigo-700">
                          {item.CargaSemanalTurma}
                        </td>
                        <td className="px-3 py-3 font-medium text-emerald-600">
                          {item.CargaCumpridaTotal}
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                            {item.PercentualProgresso}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.StatusSemana === 'EM AULA NA SEMANA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.StatusSemana}
                          </span>
                        </td>
                      </>
                    ) : perspectiva === 'MENSAL' ? (
                      <>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.Turma}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.Curso}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.Escola} ({item.Sala})
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">{item.Turno}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.DocentesNoMes}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{item.ComponentesNoMes}</td>
                        <td className="px-3 py-3 font-bold text-indigo-700">{item.CargaNoMes}</td>
                        <td className="px-3 py-3 text-slate-600 font-medium">
                          {item.CargaTotalCurso}
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                            {item.ProgressoAcumulado}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.StatusNoMes === 'ATIVO NO MÊS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {item.StatusNoMes}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.Turma}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.Curso}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.Escola} ({item.Sala})
                        </td>
                        <td className="px-3 py-3 text-slate-600 font-medium">{item.Turno}</td>
                        <td className="px-3 py-3 font-bold text-emerald-700">
                          {item.ComponentesConcluidos} / {item.ComponentesTotal}
                        </td>
                        <td className="px-3 py-3 font-medium">{item.CargaTotal}</td>
                        <td className="px-3 py-3 font-bold text-emerald-600">
                          {item.CargaMinistrada}
                        </td>
                        <td className="px-3 py-3 text-slate-500">{item.CargaRestante}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                            {item.PercentualConclusao}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-indigo-700">
                          {item.PrevisaoConclusao}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.StatusGeral === 'TURMA CONCLUÍDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.StatusGeral}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. TABELA DE CARGA DOCENTE E FINANCEIRO (SEMANAL / MENSAL / ANUAL)        */}
      {/* ========================================================================= */}
      {tipoAtivo === 'carga-financeiro' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <DollarSign className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Carga Docente e Valores / Folha ({perspectiva})
                </h3>
                <p className="text-[11px] text-slate-500">
                  {dadosCargaDocenteFiltrados.length} professor(es) analisado(s)
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                {perspectiva === 'SEMANAL' ? (
                  <tr>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Carga na Semana</th>
                    <th className="px-3 py-3">Valor / Hora</th>
                    <th className="px-3 py-3">Remuneração Semanal</th>
                    <th className="px-4 py-3">Escolas na Semana</th>
                    <th className="px-4 py-3">Turmas Vinculadas</th>
                    <th className="px-3 py-3">Disponibilidade</th>
                  </tr>
                ) : perspectiva === 'MENSAL' ? (
                  <tr>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Horas no Mês</th>
                    <th className="px-3 py-3">Teto Mensal</th>
                    <th className="px-3 py-3">Horas Livres</th>
                    <th className="px-3 py-3">% Ocupado</th>
                    <th className="px-3 py-3">Valor / Hora</th>
                    <th className="px-3 py-3">Remuneração Mensal Prevista</th>
                    <th className="px-4 py-3">Escolas de Atuação</th>
                    <th className="px-4 py-3">Turmas no Mês</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-4 py-3">Professor</th>
                    <th className="px-3 py-3">Carga Anual Programada</th>
                    <th className="px-3 py-3">Capacidade Anual</th>
                    <th className="px-3 py-3">Média Horas / Mês</th>
                    <th className="px-3 py-3">Valor / Hora</th>
                    <th className="px-3 py-3">Custo Total Anual (R$)</th>
                    <th className="px-4 py-3">Turmas Atendidas</th>
                    <th className="px-4 py-3">Escolas Habituais</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dadosCargaDocenteFiltrados.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    {perspectiva === 'SEMANAL' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.Professor}</td>
                        <td className="px-3 py-3 font-bold text-blue-700">
                          {item.HorasNaSemana}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">{item.ValorHora}</td>
                        <td className="px-3 py-3 font-bold text-emerald-700 bg-slate-50/50">
                          {item.RemuneracaoSemanal}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.EscolasAtuadas}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.TurmasVinculadas}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.Disponibilidade === 'TOTALMENTE DISPONÍVEL'
                                ? 'bg-slate-100 text-slate-700'
                                : item.Disponibilidade === 'CARGA COMPLETA'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item.Disponibilidade}
                          </span>
                        </td>
                      </>
                    ) : perspectiva === 'MENSAL' ? (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.Professor}</td>
                        <td className="px-3 py-3 font-bold text-blue-700">{item.HorasNoMes}</td>
                        <td className="px-3 py-3 text-slate-500 font-medium">{item.TetoMensal}</td>
                        <td className="px-3 py-3 font-bold text-emerald-700">
                          {item.HorasLivres}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-900">
                          {item.PercentualOcupado}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">{item.ValorHora}</td>
                        <td className="px-3 py-3 font-bold text-emerald-700 bg-slate-50/50">
                          {item.RemuneracaoMensal}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.EscolasAtuadas}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.TurmasVinculadas}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.Professor}</td>
                        <td className="px-3 py-3 font-bold text-blue-700">
                          {item.HorasAnuaisProgramadas}
                        </td>
                        <td className="px-3 py-3 text-slate-500 font-medium">
                          {item.CapacidadeAnual}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-700">
                          {item.MediaHorasMes}
                        </td>
                        <td className="px-3 py-3 font-medium text-slate-800">{item.ValorHora}</td>
                        <td className="px-3 py-3 font-bold text-emerald-700 bg-slate-50/50">
                          {item.CustoAnualTotal}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {item.TurmasAtendidas}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.EscolasHabituais}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
