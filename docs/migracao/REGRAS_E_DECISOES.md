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
- O status histórico `Encerrado` da planilha será tratado como `nota_lancada = true`, desde que essa interpretação seja confirmada pelo cliente.
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
- O significado exato da coluna `H/a` ainda deve ser confirmado com o cliente antes de sua importação definitiva.

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

- A coluna `PASTA` representa caminhos antigos da rede interna.
- O caminho antigo não precisa ser uma coluna definitiva da turma.
- Os documentos serão migrados em etapa posterior para o Storage do Supabase.
- Cada documento deverá ser associado ao aluno correto e registrado na tabela `documentos`.
- O caminho antigo poderá ser usado temporariamente para localizar e conferir os arquivos.
- Não tentar importar um caminho de rede como se fosse um documento do sistema.

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
| `Status` | `nota_lancada`/cancelamento | `Encerrado` tende a significar nota lançada; `Cancelado` será situação própria. |
| `Prazo` | Campos de prazo e histórico | Validar como preservar `No prazo` quando faltarem datas. |
| `S/N` | Campo operacional da turma | Converter Sim/Não conforme significado confirmado. |
| `MAT` | Ignorado na etapa de turmas | Quantidade será calculada pelas matrículas. |
| `SOFTWARE` | `turmas.software_utilizado` | Tratar como característica da turma. |
| `H/a` | Campo de carga horária da turma | Confirmar significado antes de importar. |
| `obs.` | `turmas.anotacoes_turma` | Preservar observações. |
| `CÓPIA TURMA` | Metadado histórico | Definir destino após explicação do cliente. |
| `v.t.` | Ainda não definido | Aguardar esclarecimento. |
| `referência` | Metadado histórico | Definir se será necessário preservar. |
| `PASTA` | Referência temporária | Não importar como documento final. |

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

- Confirmar se `Encerrado` sempre significa que a nota foi lançada.
- Confirmar o significado de `H/a`.
- Confirmar o significado de `v.t.`.
- Confirmar o significado de `CÓPIA TURMA`.
- Confirmar o significado completo da coluna `S/N`.
- Confirmar se `SOFTWARE` sempre pertence à turma.
- Confirmar como o `APLICADOR PR` deve ser representado.
- Confirmar como preservar `No prazo` quando não houver data de lançamento.
- Confirmar a referência exata usada na planilha de alunos para identificar a turma.
- Definir como os arquivos PDF serão fornecidos para a futura migração documental.

## 7. Estado da preparação atual

- As alterações estruturais de turma, status, carga horária e software estão implementadas.
- O diretório `public.pessoas` está preparado para pessoas com ou sem login, com RLS, grants e sincronização dos instrutores usuários.
- A tela de instrutores oferece `Usuário com acesso` e `Pessoa sem login` por meio de menu reutilizável.
- Os vínculos de turma permitem pessoa + função para Instrutor/Tutor, Convidado e Aplicador de Prova.
- Os turnos e horários padrão existentes foram preservados.
- Nenhum fluxo de importação, migração, staging ou pré-visualização foi implementado nesta etapa.

## 8. Próxima ordem de trabalho, quando a migração for autorizada

1. Confirmar ou ajustar as pendências com o cliente.
2. Implementar a leitura, validação e pré-visualização da planilha de turmas.
3. Testar com uma pequena amostra.
4. Executar a importação completa das turmas.
5. Implementar e testar a importação da planilha de alunos.
6. Planejar a migração dos documentos.
