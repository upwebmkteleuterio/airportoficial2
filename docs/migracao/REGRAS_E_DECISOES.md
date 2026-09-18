# Regras e decisões da migração de dados

> Documento vivo de alinhamento. Atualizar a cada decisão confirmada sobre a migração das planilhas para o sistema.
>
> **Status:** preparação estrutural e de interface concluída. Nenhuma importação real foi executada e o módulo de migração permanece fora do escopo atual.

## 1. Contexto e escopo

- O cliente possui dados históricos em duas planilhas principais:
  - uma planilha de turmas;
  - uma planilha única com alunos de várias turmas.
- Os dados atualmente existentes no sistema são de teste.
- Os logins reais do operador responsável e do cliente devem ser preservados.
- Os dados acadêmicos de teste não devem ser usados como referência para correspondências durante a migração.
- A migração será feita em etapas:
  1. cursos, pessoas de apoio e referências necessárias;
  2. turmas;
  3. alunos;
  4. matrículas e vínculos dos alunos às turmas;
  5. notas, frequência e demais dados acadêmicos, se existirem;
  6. documentos em PDF, em etapa posterior.

## 2. Regras confirmadas

### 2.1 Turmas

- `TURMA` da planilha representa o identificador interno histórico da turma.
- `ANAC` representa o identificador da turma na ANAC.
- A quantidade de alunos da planilha será ignorada na importação de turmas.
- `qt_alunos_matriculados` será calculado a partir das matrículas reais.
- A planilha de alunos será vinculada às turmas já importadas por um identificador histórico confiável.
- A importação deve impedir o vínculo de um aluno quando a turma de referência não for encontrada.
- Os identificadores históricos da planilha devem ser preservados para permitir o vínculo posterior dos alunos.

### 2.2 Campos vazios

- Dados ausentes na planilha devem permanecer vazios quando não houver informação confiável.
- Os horários de primeira e segunda chamada podem ficar vazios nos registros históricos.
- `NULL` deve significar “não informado”.
- O valor “Sem prova” só deve ser usado quando estiver confirmado que não haverá prova.
- Novos cadastros manuais podem continuar exigindo os campos obrigatórios no formulário, mesmo que registros históricos aceitem campos vazios.
- A tela deve mostrar campos históricos ausentes como pendências para preenchimento posterior.

### 2.3 Situação e prazo da turma

- A lógica atual de prazo deve ser preservada:
  - prazo futuro: mostrar dias restantes;
  - prazo vencido: mostrar atraso;
  - nota lançada: mostrar “Nota Lançada”.
- A planilha traz o valor histórico `Encerrado`, mas o sistema usa `status_turma` para operação e aceita apenas `Ativa`/`Cancelada`.
- `status_historico` existe como coluna separada e aceita `No prazo`, `Cancelado` ou `Encerrado`, preservando o histórico sem alterar o status operacional.
- `Encerrado` não deve ser convertido automaticamente em `nota_lancada = true` nem substituir o status operacional.
- `No prazo` não deve ser confundido com encerramento ou cancelamento.
- Deve existir uma situação separada para turma cancelada.
- Uma turma cancelada deve mostrar `Cancelada` e não deve ser apresentada como atrasada ou pendente de lançamento.
- A opção de cancelar ficará no menu de ações da turma, junto de editar e excluir.
- O cancelamento exigirá modal de confirmação.
- A tela de turmas deverá exibir uma coluna de situação/status.
- A regra final para representar o status histórico `No prazo` quando faltarem datas de prazo ainda depende da confirmação do cliente.

### 2.4 Turnos e horários

- Os turnos e horários padrão já cadastrados devem ser preservados.
- A migração não deve alterar nem substituir o catálogo de turnos existente.
- O módulo deve procurar correspondência entre o turno da planilha e um turno padrão existente.
- O horário real da planilha deve ser preservado na turma, mesmo quando for diferente do horário padrão.
- Alterações futuras no catálogo de turnos não devem modificar os dados históricos das turmas migradas.
- Divergências entre o turno encontrado e o horário da planilha devem aparecer como aviso na pré-visualização.
- A tabela atual de turmas armazena cópias textuais do turno e do horário; não há, neste momento, dependência que atualize turmas antigas quando um turno padrão muda.
- Não criar automaticamente um novo turno para cada variação histórica sem decisão específica.

### 2.5 Endereços

- O endereço da planilha deve ser preservado como informação histórica completa.
- O módulo deve procurar um endereço existente antes de criar outro.
- Quando não houver correspondência, poderá criar um endereço com logradouro/local, cidade e UF.
- O endereço criado deve ser associado à turma por `endereco_id`.
- `endereco_realizacao` deve preservar a descrição completa do local, incluindo informações adicionais, CEP e quebras de linha quando necessário.
- Endereços já cadastrados para uso futuro não devem ser alterados ou excluídos pela migração.

### 2.6 Pessoas, instrutores, convidados e aplicadores

- Uma pessoa pode ter uma função diferente em cada vínculo com uma turma.
- As funções previstas são:
  - Instrutor/Tutor;
  - Convidado;
  - Aplicador de Prova;
  - outras funções existentes ou que forem definidas futuramente.
- A interface de inclusão e edição de turma deve permitir selecionar a pessoa e sua função de forma visível.
- A relação `Convidado` já é suportada pelo modelo de relacionamento e não deve ser uma coluna isolada na turma.
- O aplicador principal pode continuar sendo armazenado no campo próprio da turma, enquanto o histórico de funções pode ser mantido na tabela de relações.
- A regra final sobre gravar aplicador em um ou nos dois relacionamentos ainda deverá ser formalizada durante a implementação.
- O cadastro de uma pessoa histórica não deve exigir a criação imediata de um login.
- Não criar contas falsas ou e-mails genéricos para pessoas que só aparecem na planilha pelo nome.
- Uma pessoa sem login poderá ser convertida posteriormente em usuário, completando os dados necessários e vinculando o cadastro histórico ao novo perfil.
- A solução deve ser extensível para instrutores, convidados, aplicadores, coordenadores e alunos históricos.

### 2.7 Forma de cadastro de instrutor/pessoa

A interface deverá apresentar uma escolha simples e não técnica, por exemplo:

- **Usuário com acesso ao sistema**;
- **Cadastro sem login**.

A opção “Cadastro sem login” deve permitir, conforme os dados disponíveis:

- nome completo;
- CPF opcional;
- demais dados opcionais da planilha;
- vínculo com turmas e funções.

A conversão para usuário deverá ser uma ação posterior, feita quando o acesso ao sistema for necessário.

### 2.8 Carga horária

- A carga horária da turma será adicionada à tabela `turmas`.
- A carga horária deverá aparecer:
  - como coluna na tela de turmas;
  - no formulário de inclusão/edição de turma;
  - na pré-visualização da migração.
- A carga horária do curso em `cursos.carga_horaria_total` continua existindo como referência padrão do curso.
- A carga horária real da turma pode ser diferente da carga horária padrão do curso.
- `H/a` não exige nova regra neste momento: pode usar a carga horária já existente, sem afirmar equivalência definitiva entre as duas nomenclaturas.

### 2.9 Software

- Os valores como `QUALIZ` e `SAFE` aparecem relacionados à turma na primeira planilha.
- O software será tratado como característica da turma.
- Deve ser criado o campo `software_utilizado` em `turmas`.
- O software deve aparecer:
  - como coluna na tela de turmas;
  - como campo no formulário de inclusão manual;
  - na pré-visualização e no mapeamento da importação.
- O campo `matriculas.software_utilizado` existente não deve ser removido, pois poderá ser usado se no futuro houver variação individual por aluno.

### 2.10 Pasta e documentos

- `referência`, `CÓPIA TURMA` e `PASTA` serão desconsideradas na primeira migração e não são pendências para essa etapa.
- Não será criado link de pasta na turma: a tela da turma já lista os alunos e oferece o acesso individual à documentação pelo ícone de pasta.
- Documentos históricos serão tratados em fase posterior, fora da migração de turmas e alunos.
- Em fase futura, cada PDF será localizado, enviado ao Storage do Supabase e associado ao aluno correto na tabela `documentos`, para aparecer no mesmo ícone de pasta existente na tela do aluno e na tela de alunos matriculados.
- A coluna `PASTA` representa apenas um caminho legado do Windows e não deve ser importada como documento ou vínculo definitivo.

### 2.11 Valor de v.t.

- `numero_vt` existe como coluna nullable de inteiro não negativo para receber o valor de `v.t.` da planilha.
- Nesta fase, `v.t.` deve ser apenas preservado como o valor vindo da planilha.
- Não haverá regra automática, sequência de ofício nem associação obrigatória a curso.
- A definição de qualquer regra operacional de visita técnica fica para uma fase futura.

## 3. Mapeamento inicial da planilha de turmas

| Planilha | Destino inicial | Regra |
|---|---|---|
| `TURMA` | `turmas.id_interno_escola` | Preservar identificador histórico e validar duplicidade. |
| `ANAC` | `turmas.id_anac` | Obrigatório e único. |
| `Curso` | `cursos` + `turmas.curso_id` | Associar curso existente ou solicitar criação/seleção. |
| `TURNO` | `turmas.turno` | Normalizar e comparar com catálogo de turnos. |
| `HORÁRIO` | `turmas.horario_aulas` | Preservar horário real da planilha. |
| `INÍCIO` | `turmas.data_inicio` | Converter de DD/MM/AAAA para AAAA-MM-DD. |
| `TÉRMINO` | `turmas.data_termino` | Converter de DD/MM/AAAA para AAAA-MM-DD. |
| `1ª CH` | `turmas.horario_prova_1_chamada` | Aceitar vazio durante a migração. |
| `2ª CH` | `turmas.horario_prova_2_chamada` | Aceitar vazio durante a migração. |
| `CIDADE` | `turmas.cidade` | Campo obrigatório da turma. |
| `UF` | `turmas.uf` | Campo obrigatório da turma. |
| `Endereço` | `enderecos` + `turmas.endereco_id` | Procurar, criar e associar endereço. |
| `INSTRUTOR` | Relação turma/pessoa | Função padrão: Instrutor/Tutor. |
| `CONVIDADO` | Relação turma/pessoa | Função: Convidado. |
| `APLICADOR PR` | Aplicador/relação | Resolver regra final do aplicador. |
| `Status` | `turmas.status_historico` | Copiar diretamente os valores `No prazo`, `Cancelado` ou `Encerrado`; `status_turma` permanece o status operacional `Ativa`/`Cancelada`. |
| `Prazo` | Campos de prazo e histórico | Validar como preservar `No prazo` quando faltarem datas. |
| `S/N` | Campo operacional da turma | Converter Sim/Não conforme significado confirmado. |
| `MAT` | Contagem derivada de matrículas | Pode continuar como contagem de matrículas; não exige nova regra. |
| `SOFTWARE` | `turmas.software_utilizado` | Tratar como característica da turma. |
| `H/a` | Campo de carga horária da turma | Usar a carga horária já existente, sem afirmar equivalência definitiva. |
| `obs.` | `turmas.anotacoes_turma` | Preservar observações. |
| `CÓPIA TURMA` | Desconsiderada na primeira migração | Sem destino nesta etapa. |
| `v.t.` | `turmas.numero_vt` | Copiar diretamente o valor como inteiro não negativo, sem regra automática. |
| `referência` | Desconsiderada na primeira migração | Sem destino nesta etapa. |
| `PASTA` | Desconsiderada na primeira migração | Documentos e vínculo de pasta ficam para fase futura. |

## 4. Recursos necessários antes da importação

1. Permitir campos históricos vazios, principalmente horários de chamadas.
2. Adicionar cancelamento de turma com confirmação e indicação visual.
3. Adicionar coluna e campo de situação/status da turma.
4. Adicionar carga horária da turma.
5. Adicionar software da turma na tabela, tela e formulário.
6. Permitir cadastrar uma pessoa sem login.
7. Permitir escolher a função da pessoa no vínculo com a turma.
8. Ajustar o formulário manual de turma para instrutor, convidado e aplicador.
9. Definir como pessoas sem login serão relacionadas às turmas e, posteriormente, convertidas em usuários.
10. Preservar os turnos existentes e os horários históricos das turmas.
11. Implementar correspondência/revisão de cursos e endereços.
12. Preparar a chave de ligação entre a planilha de alunos e as turmas importadas.
13. Criar pré-visualização, validação, detecção de duplicidades e relatório de erros.
14. Restringir a importação a usuários autorizados e registrar a origem como migração.

## 5. Regras do módulo de importação

- O arquivo deve ser analisado antes de qualquer gravação definitiva.
- O usuário deve visualizar os dados originais e os dados normalizados.
- Registros com erro não devem ser importados silenciosamente.
- Duplicidades de ID ANAC e identificador interno devem ser mostradas antes da confirmação.
- Cursos, endereços e pessoas não encontrados devem gerar pendência para decisão.
- A importação deve ocorrer em lotes.
- O sistema deve informar o progresso e os registros que falharam.
- Deve ser possível reprocessar somente os registros pendentes ou com erro.
- A importação de alunos deve ocorrer somente depois que as turmas correspondentes existirem.
- A contagem de alunos não será importada da planilha de turmas.
- O sistema deve preservar os identificadores históricos para permitir auditoria e vínculo posterior.

## 6. Pendências aguardando o cliente

- Confirmar o significado completo da coluna `S/N`.
- Confirmar como o `APLICADOR PR` deve ser representado.
- Confirmar como preservar `No prazo` quando não houver data de lançamento.
- Confirmar o identificador usado na planilha de alunos para localizar a turma correspondente.
- Definir, em fase futura, como os arquivos PDF serão fornecidos para a migração documental.

Não são pendências desta primeira migração: `referência`, `CÓPIA TURMA` e `PASTA` serão desconsideradas; documentos históricos e vínculo de pasta ficam para uma fase futura. `MAT` continuará como contagem de matrículas, `H/a` poderá usar a carga horária existente sem equivalência definitiva, e a reconciliação/deduplicação de pessoas será lógica da futura importação.

## 7. Estado da preparação atual

- As alterações estruturais de turma, status, `status_historico`, `numero_vt`, carga horária e software estão implementadas.
- `status_turma` permanece o status operacional; `Status` da planilha será copiado para `status_historico` e `v.t.` para `numero_vt` no futuro módulo de migração.
- O diretório `public.pessoas` está preparado para pessoas com ou sem login, com RLS, grants e sincronização dos instrutores usuários.
- A tela de instrutores oferece `Usuário com acesso` e `Pessoa sem login` por meio de menu reutilizável.
- Os vínculos de turma permitem pessoa + função para Instrutor/Tutor, Convidado e Aplicador de Prova.
- Os turnos e horários padrão existentes foram preservados.
- Nenhum fluxo de importação, migração, staging ou pré-visualização foi implementado nesta etapa.

## 8. Auditoria da preparação para a futura migração

Esta auditoria cruza o modelo de planilha informado pelo usuário com a inspeção atual do código e do schema. Ela registra capacidade estrutural existente, lacunas de correspondência e decisões que ainda precisam ser tomadas. A migração continua fora do escopo: não há autorização ou implementação de carga, importação de planilhas, staging, lotes ou migração de documentos.

### 8.1 Campos já suportados

- `TURMA` / ID interno: `turmas.id_interno_escola`, com unicidade e sequência interna.
- `ANAC`: `turmas.id_anac`, com unicidade.
- Curso: `turmas.curso_id` com FK para `cursos`.
- `TURNO` e `HORÁRIO`: `turmas.turno` e `turmas.horario_aulas` armazenam o turno e o horário como texto.
- Datas: `data_inicio` e `data_termino`, além das datas de prova quando aplicáveis.
- Cidade/UF: `turmas.cidade` e `turmas.uf`.
- Endereço: `endereco_realizacao` preserva a descrição textual e `endereco_id` permite uma FK opcional para `enderecos`.
- Instrutor, convidado e aplicador: o modelo de vínculo `turma_instrutores` relaciona uma pessoa (`pessoas`) à turma com `funcao`; o aplicador também possui `turmas.aplicador_id` como referência direta opcional.
- Status `S/N`: `status_operacional_sn` é booleano e a interface o apresenta como `S`/`N`; a conversão do significado histórico da coluna ainda deve ser confirmada.
- Software: `turmas.software_utilizado` suporta o valor associado à turma.
- `H/a`: há `turmas.carga_horaria` para receber um valor numérico, mas a equivalência com `H/a` ainda não está confirmada.
- Notas e prazo: `anotacoes_turma`, `status_prazo_notas`, `dias_para_vencimento`, `nota_lancada` e datas relacionadas cobrem observações, prazo e acompanhamento do lançamento.
- `MAT`: não deve ser tratado como dado autoritativo da planilha; `turmas.qt_alunos_matriculados` é mantido como contagem derivada das matrículas, e os alunos em `matriculas` ficam relacionados à turma por `aluno_id`.

### 8.2 Suporte parcial ou ausente

- Status histórico: `turmas.status_historico` aceita `No prazo`, `Cancelado` e `Encerrado`; `status_turma` continua reservado à operação `Ativa`/`Cancelada`. A futura migração copiará `Status` diretamente para `status_historico`.
- `v.t.`: `turmas.numero_vt` existe como inteiro nullable não negativo e receberá diretamente o valor da planilha, sem regra automática, sequência de ofício ou associação obrigatória a curso.
- `referência`, `CÓPIA TURMA` e `PASTA`: serão desconsideradas na primeira migração. Documentos históricos e vínculo de pasta ficam para fase futura e não bloqueiam a preparação atual.
- `MAT` e `H/a`: não exigem nova regra neste momento. `MAT` pode continuar como contagem de matrículas, e `H/a` pode usar a carga horária já existente, sem afirmar equivalência definitiva.
- Identidade e duplicidade de pessoas: reconciliação/deduplicação é lógica da futura importação, não uma lacuna estrutural que bloqueie a preparação. A regra deverá usar CPF quando houver e encaminhar nomes ambíguos para revisão manual.

### 8.3 Riscos e decisões prévias obrigatórias

Não há bloqueio estrutural pendente para `status_historico` ou `numero_vt`: ambas as colunas já existem. A futura importação deverá preservar os IDs explícitos da planilha, copiar `Status` para `status_historico` e `v.t.` para `numero_vt`, mapear cursos, validar vínculos, reconciliar/deduplicar pessoas usando CPF quando houver e encaminhar nomes ambíguos para revisão manual, além de gerar prévia e tratar erros. A associação de documentos e pastas também fica para fase futura. `referência`, `CÓPIA TURMA` e `PASTA` não serão carregadas na primeira migração.

### 8.4 Conclusão da auditoria

As colunas estruturais necessárias para o status histórico e o valor de visita técnica já existem: `Status` será copiado para `turmas.status_historico` e `v.t.` para `turmas.numero_vt`. O trabalho restante é construir o futuro módulo de migração, incluindo preview e mapeamento.

Nenhuma migração será construída agora: permanecem fora do escopo parser Excel, staging, preview, lotes, importação, SQL e migração de documentos. Reconciliação/deduplicação de pessoas e vínculo de pasta permanecem como lógica ou escopo de fases futuras.

## 9. Próxima ordem de trabalho, quando a migração for autorizada

1. Confirmar ou ajustar as pendências com o cliente.
2. Implementar a leitura, validação e pré-visualização da planilha de turmas.
3. Testar com uma pequena amostra.
4. Executar a importação completa das turmas.
5. Implementar e testar a importação da planilha de alunos.
6. Planejar a migração dos documentos.
