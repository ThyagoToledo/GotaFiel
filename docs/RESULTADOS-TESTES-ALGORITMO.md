# Resultados de verificação do algoritmo

## Execução de 14 de agosto de 2026

Branch: `agent/polish-validation`

Versão declarada do algoritmo: `3.3.0-alpha.1`

### Comandos executados

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:benchmark
npm.cmd run build
```

### Resultados

| Verificação | Resultado |
|---|---|
| TypeScript (`tsc --noEmit`) | Aprovado |
| Arquivos de teste Vitest | 11 aprovados |
| Testes automatizados | 101 aprovados |
| Testes com falha | 0 |
| Benchmark Científico (`test:benchmark`) | 5/5 cenários aprovados (Precisão, Recall e F1 $\ge 95\%$) |
| Build Vite de produção | Aprovado |

O build gerou corretamente o frontend, o Web Worker de processamento e os módulos de exportação.

## O que estes testes comprovam

Os testes automatizados cobrem, entre outros pontos:

- determinismo do processamento;
- correção de perspectiva e calibração por área de pixel;
- invariância da cobertura ao tamanho físico declarado;
- planejamento de raster sem ampliar acima da resolução da fonte;
- orientação horizontal e vertical do cartão;
- binarização híbrida adaptativa, cromática e compatibilidade em cinza;
- normalização de fundo contra sombras e gradientes de iluminação;
- separação morfológica conservadora de gotas aglomeradas/sobrepostas;
- filtragem de fibras e riscos não-gotas por circularidade/alongamento;
- filtro de média 3 × 3 sem mutação do buffer original;
- preenchimento de buracos preservando fundo conectado à borda;
- componentes conexos e filtros de tamanho;
- interpolação e monotonicidade de DV0,1, DV0,5 e DV0,9;
- limites de confiabilidade para 300 dpi, 600 dpi e cobertura acima de 20%;
- sinais de captura finitos, versionados e explicitamente não calibrados;
- recálculo após inspeção manual preservando metadados de captura;
- rate limit distribuído atômico no Neon para autenticação;
- geração de CSV e PDF sem valores inválidos;
- cálculos auxiliares de pulverização e calibração de bicos.

## Desempenho no Benchmark Científico (Meta 95%)

| Cenário | Precisão | Recall | F1-Score | IoU | Erro Contagem | Status |
|---|---|---|---|---|---|---|
| 1. Padrão Geométrico (25 gotas) | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | APROVADO ($\ge 95\%$) |
| 2. Gotas Finas (Baixa Cobertura) | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | APROVADO ($\ge 95\%$) |
| 3. Gradiente Severo de Sombra | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | APROVADO ($\ge 95\%$) |
| 4. Gotas Aglomeradas (Split) | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | APROVADO ($\ge 95\%$) |
| 5. Ruído de Granulação Real | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | APROVADO ($\ge 95\%$) |

## Reprodutibilidade

Para repetir a verificação completa a partir da raiz do projeto:

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:benchmark
npm.cmd run build
```
