# Regras de negócio B2B

## Contagem de funcionários ativos

A fonte das empresas é `public.empresas`. Para cada empresa, funcionário ativo é o
aluno único (`COUNT DISTINCT aluno_id`) que tenha uma matrícula em
`public.matriculas` com `status_matricula = 'Ativo'` e um perfil correspondente em
`public.profiles` com `role = 'ALUNO'` e `status = 'ativo'`. A contagem é agrupada por
`matriculas.empresa_b2b_id`. Matrículas pendentes, recusadas, canceladas ou concluídas,
outros papéis e números simulados não entram no total. Empresas sem funcionários
retornam 0.

## Fluxo esperado

1. O gestor gera e compartilha o link único da empresa.
2. O aluno faz o cadastro público pendente vinculado à empresa.
3. O gestor analisa e aprova o cadastro.
4. A aprovação resulta em perfil ativo e matrícula ativa da empresa.
5. O aluno passa a ser contado como funcionário ativo.

## Diagnóstico atual

O fluxo público existente ainda cria apenas o perfil pendente; ele não cria a
matrícula nem passa `empresa_id` de forma completa. Portanto, a contagem real ficará
0 até que o fluxo de matrícula e aprovação seja conectado. Essa integração ainda não
está implementada nesta tarefa. A lacuna também não foi alterada em
`PublicEnrollment`, `CentralGed`, `CompanyEmployeesPanel` ou nos componentes de
`Modal`.
