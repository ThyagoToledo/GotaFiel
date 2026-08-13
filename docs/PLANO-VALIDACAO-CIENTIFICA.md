# Plano de evolução e validação científica do Gotas2

## 1. Objetivo e decisão técnica

O Gotas2 será tratado como um instrumento de medição de cartões hidrossensíveis, não como um gerador de recomendações agronômicas universais. A atualização tem quatro objetivos:

1. medir cobertura, manchas e distribuição de tamanhos com rastreabilidade;
2. informar quando a imagem não permite uma medição confiável;
3. separar resultados observados, estimativas e classificações que ainda exigem validação;
4. salvar no Neon os resultados textuais e numéricos, a versão do algoritmo e os avisos de qualidade de cada análise.

Toda a aplicação continuará compatível com a Vercel. O pipeline será escrito em TypeScript e executado no navegador, preferencialmente em Web Worker. A Vercel oferece runtime Python para Functions, atualmente em beta e disponível inclusive no plano gratuito, mas ele não é necessário para as operações implementadas nesta fase. Enviar a imagem ao backend acrescentaria latência, consumo de função e transferência de dados sem melhorar o resultado por si só. Python poderá ser usado futuramente no backend se uma biblioteca validada e inviável no navegador justificar esse custo; também poderá ser usado offline para construir e auditar a bateria científica.

## 2. Estado auditado

O pipeline atual executa:

1. correção de perspectiva por homografia;
2. binarização cromática ou modo compatível com o GOTAS;
3. componentes conexos;
4. conversão de área em diâmetro equivalente;
5. correção de espalhamento;
6. cálculo de cobertura, densidade, DV0,1, DV0,5, DV0,9, span e volume estimado.

As principais lacunas encontradas são:

- um cartão fotografado em orientação vertical pode associar o lado curto da imagem ao lado longo físico, desperdiçando resolução e deformando a escala por eixo;
- os percentis volumétricos são selecionados pelo primeiro degrau que ultrapassa 10%, 50% ou 90%, sem interpolação;
- iluminação irregular, sombra, reflexo, foco, balanço de branco e resolução efetiva ainda não são avaliados de forma completa;
- gotas sobrepostas são tratadas como um único componente;
- a interface apresenta um veredito agronômico universal e uma classe ASABE derivada apenas do DV0,5 do cartão, o que não é sustentado pelo método atual;
- ainda não existe uma bateria independente suficiente para afirmar exatidão geral.

## 3. Evidências e como podem ser usadas

### 3.1 Benchmark Outdoor_Wsp2

O cartão `Outdoor_Wsp2`, reconstruído de `IMG_2_20190621_094142_BGR.csv`, tem 4.608 × 3.456 pixels na imagem de origem e recorte retificado de 1.797 × 615 pixels.

Resultados publicados pelo método do artigo de 2025:

| Métrica | Valor |
|---|---:|
| Contagem produzida pelo algoritmo do artigo | 1.360 |
| Densidade produzida pelo algoritmo do artigo | 68,82 gotas/cm² |
| Cobertura produzida pelo algoritmo do artigo | 3,84% |
| Cobertura marcada manualmente | 3,49% |
| DV0,1 produzido pelo algoritmo do artigo | 87,40 µm |
| DV0,5 produzido pelo algoritmo do artigo | 203,10 µm |
| DV0,9 produzido pelo algoritmo do artigo | 388,98 µm |

A cobertura manual de 3,49% é a referência mais próxima de verdade-terreno disponível nesse exemplo. Contagem e DVs do artigo são saídas do algoritmo publicado, não medições independentes de laboratório. Portanto, servem para comparação de implementação, mas não para provar exatidão física.

No Gotas2, uma configuração ajustada especificamente nessa imagem (`gotas-legacy`, ajuste -15 e área mínima 25 px) produziu 1.375 gotas, 69,6 gotas/cm² e 4,1% de cobertura. A proximidade da contagem é útil para diagnóstico, mas não é validação: escolher parâmetros após observar o resultado é vazamento de calibração.

### 3.2 Código e manual do GOTAS local

O diretório `DadosColetadosParaCriar_o_Site/gotas64` contém o código Java do GOTAS. Foram identificados:

- filtro de média, binarização em tons de cinza, preenchimento de buracos e componentes conexos;
- correção de espalhamento `DC = DL / (0,8419 + 0,000152 × DL + 0,1758 × ln(DL))`;
- interpolação de percentis volumétricos;
- cálculo de cobertura.

O código é GPL. Trocar Java por TypeScript ou Python não remove automaticamente as obrigações da licença: a FAQ oficial da GNU considera a tradução de código para outra linguagem uma modificação sujeita à licença original. Por isso, o Gotas2 não fará tradução linha a linha. Serão reimplementados independentemente apenas algoritmos gerais, fórmulas publicadas e comportamentos necessários, com estrutura própria, testes próprios e esta atribuição documental. Se no futuro for necessário portar literalmente uma parte do código, o licenciamento do projeto terá de ser revisto antes da distribuição.

### 3.2.1 Mapa das reimplementações e atribuições

Este é o único local do projeto onde as correspondências com o código Java local são registradas. Os arquivos TypeScript permanecem independentes e descrevem somente o comportamento do Gotas2.

| Funcionalidade observada | Origem local consultada | Reimplementação independente no Gotas2 | Situação |
|---|---|---|---|
| Limiar em escala de cinza | `gotas64/src/bo/TratarImagem.java`, método `binarizaNovo`, linhas 147–212 | `src/core/imageProcessor.ts`, ramo `gotas-legacy` de `binarizeImageBuffer` | Implementada; compatibilidade experimental |
| Suavização por média local | `gotas64/src/bo/TratarImagem.java`, método `passaFiltroMedia`, a partir da linha 564 | `src/core/imageProcessor.ts`, função `boxBlurRgba` | Reimplementada do conceito de filtro caixa 3 × 3; não replica erros ou mutação interna do Java |
| Preenchimento de buracos | `gotas64/src/bo/TratarImagem.java`, método `fechaBuracos`, linhas 215–268 | `src/core/imageProcessor.ts`, função `fillBinaryHoles` | Reimplementada por flood fill do fundo conectado à borda |
| Ordem filtro → limiar → preenchimento → componentes | `gotas64/src/services/Geral.java`, linhas 516–520 | `src/core/analysisCore.ts`, função `runAnalysisCore` | Reimplementada com buffers tipados e execução no Web Worker |
| Correção de espalhamento | `gotas64/src/bo/CalcularResultados.java`, linhas 80–87 | `src/core/imageProcessor.ts`, função `calculateCorrectedDiameterUm` | Fórmula documentada, reimplementada e testada |
| Percentis volumétricos | `gotas64/src/bo/CalcularResultados.java`, a partir da linha 185 | `src/core/imageProcessor.ts`, função `interpolateVolumePercentile` | Reimplementada com interpolação explícita |
| Cobertura | `gotas64/src/bo/CalcularResultados.java`, linhas 261–276 | `src/core/imageProcessor.ts`, função `computeMetricsFromHistogram` | Reimplementada como razão de pixels, sem a antiga escala linear colapsada |

Licença local consultada: `gotas64/licenca/gpl.txt`. Referência externa sobre tradução de código GPL: <https://www.gnu.org/licenses/gpl-faq.en.html#TranslateCode>. Referência do runtime Python da Vercel: <https://vercel.com/docs/functions/runtimes/python>.

O manual oficial recomenda digitalização óptica a 600 dpi, prefere BMP por não introduzir perdas e alerta que resolução abaixo de 300 dpi causa erro sério. Também informa que gotas muito pequenas podem não ser registradas no papel e que sobreposição elevada impede recuperar contagem e tamanho com segurança.

### 3.3 Script experimental local

O arquivo `Software pulverização/script (1).text` usa região amarela em HSV, limiar adaptativo, abertura morfológica e área mínima. Essas ideias são candidatas ao ramo híbrido, mas os valores fixos de área, janela e região não podem entrar em produção como constantes universais. Todos os limites em pixels devem ser convertidos em limites físicos ou derivados da resolução efetiva.

## 4. O que cada métrica significa

| Saída | Natureza | Condições mínimas |
|---|---|---|
| Cobertura | razão de pixels segmentados pela área útil | recorte correto, segmentação aceitável e resolução ≥ 300 dpi |
| Contagem e densidade | número de componentes por área física | resolução próxima de 600 dpi e baixa sobreposição |
| Diâmetro equivalente da mancha | círculo com a mesma área da mancha | escala correta e segmentação da borda |
| Diâmetro estimado da gota | mancha corrigida por uma relação de espalhamento | papel, líquido e relação de espalhamento compatíveis |
| DV0,1/DV0,5/DV0,9 | percentis ponderados por volume estimado | tamanhos e volumes considerados confiáveis |
| Volume em L/ha | soma do volume esférico estimado dividida pela área | todas as hipóteses anteriores; deve ser rotulado como estimativa |
| Classe ASABE S572.3 | comparação com espectros de bicos de referência em ensaio padronizado | não pode ser inferida somente do DV0,5 depositado no cartão |
| Qualidade agronômica | adequação ao alvo, cultura, produto e técnica | exige contexto agronômico e regra validada; não é universal |

## 5. Arquitetura alvo do processamento

### 5.1 Entrada e geometria

1. preservar a resolução original;
2. validar os quatro cantos e a proporção do cartão;
3. detectar a orientação e rotacionar logicamente os cantos quando o lado longo físico estiver vertical;
4. retificar por homografia;
5. calcular dpi efetivo nos dois eixos;
6. impedir ampliação que invente detalhe ausente.

### 5.2 Controle de qualidade da captura

Serão produzidos avisos rastreáveis para:

- menos de 300 dpi: análise inconclusiva para métricas físicas;
- entre 300 e 600 dpi: leitura limitada;
- 600 dpi ou mais: resolução adequada, ainda sujeita a foco, sombra e reflexo;
- cobertura acima de 20%: cobertura pode ser usada, mas contagem, densidade, DVs e volume ficam pouco confiáveis;
- cartão pequeno no enquadramento, recorte incompatível, foco baixo, sombra forte, altas luzes estouradas ou cor do papel incompatível.

Os primeiros controles implementados serão orientação, dpi efetivo e sobreposição. Foco, iluminação e cor serão adicionados depois de calibrados com imagens rotuladas, para evitar limites arbitrários.

### 5.3 Normalização e segmentação híbrida

Pipeline candidato:

1. normalização de cor usando o fundo amarelo do próprio cartão;
2. estimativa de sombra por filtros locais de máximo e mínimo;
3. remoção condicional de sombra;
4. nitidez moderada e condicionada à qualidade da captura;
5. ramo de intensidade: escala de cinza com Otsu e/ou limiar adaptativo;
6. ramo cromático: HSV ou Lab para manchas azuladas/escuras;
7. união das máscaras;
8. morfologia 3 × 3 somente quando a resolução comportar esse elemento físico;
9. remoção de fibras, sujeira e riscos por área física, circularidade, solidez e alongamento;
10. separação conservadora de aglomerados por watershed com marcador, somente quando houver evidência suficiente;
11. componentes conexos e métricas.

O usuário continuará vendo a máscara e poderá ajustar a sensibilidade. Todo ajuste será salvo com a análise; não haverá parâmetros invisíveis ou valores aleatórios.

### 5.4 Cálculos

- área física por pixel: `(largura_mm × altura_mm) / (largura_px × altura_px)`;
- diâmetro equivalente da mancha: `2 × sqrt(área_mm² / π) × 1000`;
- diâmetro estimado da gota: fórmula de espalhamento explicitamente versionada;
- percentis de volume: interpolação entre os pontos acumulados vizinhos;
- cobertura: pixels incluídos / pixels totais da área útil;
- densidade: componentes confiáveis / área do cartão em cm².

O produto deve armazenar separadamente o diâmetro da mancha e o diâmetro corrigido. Até essa separação estar completa, o resultado deve dizer “diâmetro estimado da gota”, e não sugerir medição direta.

## 6. Experiência do usuário sem alegações simuladas

Mudanças necessárias:

- substituir “BOM/REGULAR/RUIM/EXCESSO” por qualidade técnica da leitura: `ADEQUADA`, `LIMITADA` ou `INCONCLUSIVA`;
- exibir os motivos da limitação e quais métricas continuam utilizáveis;
- retirar a classe ASABE automática e a tabela que associa classes a faixas fixas de DV0,5;
- não afirmar eficiência de controle, risco de escorrimento ou ajuste de bicos a partir apenas do cartão;
- chamar o arquivo exportado de relatório de medição, não de laudo profissional;
- manter dados antigos visíveis, mas marcá-los como produzidos por uma versão anterior quando não possuírem metadados de qualidade;
- não fabricar análises recentes, resultados, imagens ou campos ausentes.

## 7. Persistência e rastreabilidade no Neon

Cada análise nova deve armazenar, além das métricas atuais:

- `algorithm_version`;
- `quality_status`;
- `effective_dpi`;
- `orientation_corrected`;
- `quality_warnings`;
- no futuro: hash da imagem, marca/lote do papel, líquido/adjuvante, versão da relação de espalhamento e parâmetros completos de segmentação.

As imagens permanecem privadas no Vercel Blob e são renderizadas pelo endpoint autenticado do próprio site. No Neon ficam apenas URLs controladas, texto, números e metadados. Uma análise continua sempre vinculada ao usuário autenticado.

## 8. Plano de implementação

### Fase 1 — segurança metrológica básica

- corrigir orientação automática dos cantos;
- calcular e salvar dpi efetivo;
- interpolar DVs;
- criar status e avisos de confiabilidade;
- remover alegações ASABE/agronômicas da interface e dos novos relatórios;
- adicionar versão do algoritmo;
- cobrir tudo com testes unitários.

### Fase 2 — qualidade da imagem

- medir foco, sombra, reflexo, exposição e ocupação do cartão no quadro;
- criar bloqueios e instruções de recaptura;
- validar limites em uma coleção rotulada, sem escolhê-los com a bateria final.

### Fase 3 — segmentação híbrida

- implementar os ramos de intensidade e cor;
- normalização de fundo e remoção de sombra;
- morfologia dependente da escala;
- filtros físicos de artefatos;
- comparação cega com a implementação atual.

### Fase 4 — sobreposição

- avaliar watershed e outros separadores somente em cartões com verdade-terreno;
- definir uma faixa em que contagem e DVs são publicáveis;
- fora dessa faixa, publicar apenas cobertura e avisos.

### Fase 5 — validação científica

- congelar parâmetros antes do teste final;
- executar bateria independente;
- publicar protocolo, versão, resultados e limitações;
- somente então habilitar alegações de desempenho compatíveis com a evidência.

## 9. Bateria de validação

Conjuntos separados:

1. máscaras sintéticas com área e quantidade exatas;
2. círculos impressos de tamanhos conhecidos;
3. gotas isoladas produzidas de forma controlada e medidas por microscopia ou instrumento de referência;
4. cartões reais anotados independentemente por dois profissionais, com consenso;
5. variações de celular, scanner, orientação, distância, luz, sombra e compressão;
6. conjunto final nunca usado para escolher parâmetros.

Métricas de avaliação:

- segmentação: IoU, precisão, recall e F1;
- cobertura: erro absoluto em pontos percentuais;
- contagem e densidade: MAPE, somente na faixa de baixa sobreposição;
- DVs: erro relativo contra referência física adequada;
- repetibilidade: mesma amostra capturada novamente;
- concordância: gráfico e limites de Bland–Altman.

Metas provisórias para planejar a bateria, não promessas atuais:

- cobertura: erro absoluto ≤ 0,5 ponto percentual;
- contagem/densidade: erro ≤ 10% em cartões de baixa sobreposição;
- DVs: erro ≤ 10–15% contra medição independente;
- repetibilidade: variação ≤ 5%.

Essas metas só se tornam critérios oficiais após o piloto demonstrar que são tecnicamente alcançáveis.

## 10. Testes automatizados de produção

- orientação horizontal e vertical produzem o mesmo raster e as mesmas métricas;
- a proporção física do cartão é preservada;
- nunca há ampliação acima da resolução real da fotografia;
- cobertura depende apenas da máscara;
- DVs são monotônicos e interpolados;
- nenhuma saída contém `NaN` ou infinito;
- limites de 300 dpi, 600 dpi e 20% de cobertura geram os avisos esperados;
- API rejeita status, dpi e avisos inválidos;
- consultas, exclusões e imagens continuam isoladas por usuário;
- build, TypeScript e suíte Vitest passam antes de publicar.

## 11. Critério de conclusão

A atualização não estará cientificamente concluída apenas porque um cartão coincide com um artigo. A conclusão exige código versionado, bateria independente, resultados reproduzíveis, limites de uso explícitos e uma interface que esconda ou marque métricas quando as condições de captura não sustentarem a medição.

## 12. Fontes principais

- Artigo de processamento de cartões hidrossensíveis (2025): <https://link.springer.com/article/10.1007/s11042-025-20697-2>
- Conjunto de dados Dryad: <https://datadryad.org/dataset/doi:10.25338/B8WG9S>
- GOTAS — Embrapa: <https://www.embrapa.br/en/busca-de-solucoes-tecnologicas/-/produto-servico/9943/gotas---programa-de-calibracao-de-pulverizacao>
- Manual oficial GOTAS V2: <https://www.cnpma.embrapa.br/down_site/gotas/ManualGotasV2.pdf>
- Estudo Embrapa de comparação com microscopia: <https://apct.sede.embrapa.br/index.php/pab/article/view/6366>
- Comparação entre softwares de análise: <https://www.scielo.br/j/pd/a/8sZLF4kH5fZZZyL7KCd5CgM/?format=html>
- DepositScan/USDA: <https://www.ars.usda.gov/ARSUserFiles/50820500/Publications/Zhu_2010_DepositScan.pdf>
- ANSI/ASABE S572.3: <https://elibrary.asabe.org/abstract.asp?aid=51101>
