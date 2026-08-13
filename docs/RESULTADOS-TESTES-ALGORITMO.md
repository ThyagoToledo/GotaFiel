# Resultados de verificação do algoritmo

## Execução de 13 de agosto de 2026

Branch: `codex/validacao-cientifica`

Versão declarada do algoritmo: `3.1.0-alpha.1`

### Comandos executados

```text
npm run lint
npm test
npm run build
```

### Resultados

| Verificação | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | Aprovado |
| Arquivos de teste Vitest | 6 aprovados |
| Testes automatizados | 82 aprovados |
| Testes com falha | 0 |
| Build Vite de produção | Aprovado |
| Módulos transformados no build | 1.945 |

O build gerou corretamente o frontend, o Web Worker de processamento e os módulos de exportação. O Vite apresentou apenas um aviso não bloqueante: `generateCsvReport.ts` é importado dinamicamente na tela de resultado e estaticamente na tela de configurações, portanto permanece no pacote principal em vez de formar um chunk separado.

## O que estes testes comprovam

Os testes automatizados cobrem, entre outros pontos:

- determinismo do processamento;
- correção de perspectiva e calibração por área de pixel;
- invariância da cobertura ao tamanho físico declarado;
- planejamento de raster sem ampliar acima da resolução da fonte;
- orientação horizontal e vertical do cartão;
- binarização cromática e compatibilidade em cinza;
- filtro de média 3 × 3 sem mutação do buffer original;
- preenchimento de buracos preservando fundo conectado à borda;
- componentes conexos e filtros de tamanho;
- interpolação e monotonicidade de DV0,1, DV0,5 e DV0,9;
- limites de confiabilidade para 300 dpi, 600 dpi e cobertura acima de 20%;
- recálculo após inspeção manual;
- geração de CSV sem valores inválidos;
- cálculos auxiliares de pulverização já existentes.

## O que estes testes não comprovam

Esta verificação demonstra consistência de software, ausência de erros conhecidos na suíte e capacidade de gerar o pacote de produção. Ela não comprova, isoladamente:

- exatidão física em cartões reais;
- superioridade em relação a outro software;
- eficiência agronômica da aplicação;
- classificação ASABE;
- recuperação correta de gotas sobrepostas;
- robustez geral a foco, sombra, reflexo, papel, líquido, câmera ou scanner diferentes.

A comprovação científica depende da bateria independente e do teste cego descritos em `docs/PLANO-VALIDACAO-CIENTIFICA.md`.

## Reprodutibilidade

Para repetir a verificação a partir da raiz do projeto:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Os arquivos de `tmp/` são artefatos locais do benchmark e foram deliberadamente excluídos do Git. As fontes públicas e os valores usados no planejamento estão documentados no plano científico.
