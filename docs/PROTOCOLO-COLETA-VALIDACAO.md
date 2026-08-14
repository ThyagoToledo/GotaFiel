# Protocolo de coleta para validação do Gotas2

Este documento transforma a próxima etapa em uma coleta auditável. Ele não cria
resultados nem escolhe limites antes dos dados.

## Unidade de coleta

Cada amostra deve conter:

- imagem original sem recorte ou compressão adicional;
- identificação anônima da amostra;
- aparelho, resolução, orientação e data;
- papel/cartão, tamanho físico e lote quando disponível;
- condição de iluminação: uniforme, sombra parcial, reflexo, baixa luz ou alta luz;
- método de referência usado para a anotação;
- arquivo de máscara ou anotação independente das manchas;
- indicação de sobreposição: baixa, média ou alta, definida pelo anotador antes de ver o resultado do Gotas2.

Não salvar nomes, rostos, localização precisa ou outros dados pessoais junto das imagens.

## Separação dos conjuntos

1. **Desenvolvimento:** usado para corrigir código e explorar sinais.
2. **Calibração:** usado para estimar limites de foco, iluminação, exposição, reflexo e ocupação.
3. **Teste final:** congelado antes de escolher os limites e usado somente uma vez para a avaliação principal.

Cartões da mesma amostra, aparelho ou sessão devem permanecer no mesmo conjunto para
evitar vazamento entre calibração e teste.

## Anotação independente

Dois profissionais devem anotar uma parte sobreposta do conjunto sem consultar a saída
do Gotas2. Divergências devem ser resolvidas por consenso registrado. A anotação deve
separar, quando possível, mancha isolada, aglomerado, sujeira, fibra e reflexo.

## Métricas mínimas

- máscara: IoU, precisão, recall e F1;
- cobertura: erro absoluto em pontos percentuais;
- contagem/densidade: erro relativo somente em baixa sobreposição;
- DV: erro relativo contra referência física adequada;
- repetibilidade: variação entre novas capturas da mesma amostra;
- qualidade da captura: concordância entre os sinais e o rótulo visual, sem definir o corte no teste final.

## Meta de 95% e como ela será comprovada

No Gotas2, “95% de precisão” não pode significar apenas uma foto favorável nem apenas
95% de acertos sobre pixels de fundo. A meta proposta para a segmentação no conjunto de
teste final é, simultaneamente, **precisão, recall e F1 maiores ou iguais a 0,95**. Assim,
a avaliação penaliza tanto falsos positivos (sujeira/reflexo contado como gota) como falsos
negativos (gota não identificada).

As métricas são calculadas pelas funções versionadas em
`src/core/validationMetrics.ts`, comparando uma máscara produzida pelo Gotas2 a uma
referência independente já alinhada ao mesmo recorte. Para contagem, densidade, cobertura e
DV, o relatório deve publicar também erro absoluto/relativo e os casos excluídos com motivo.
O resultado só poderá ser divulgado como meta atingida quando o conjunto final estiver
congelado, as anotações tiverem sido revisadas independentemente e as três métricas forem
apresentadas por cenário de iluminação, resolução, cor do cartão e nível de sobreposição.

Imagens de referência devem ter autorização de uso e vir de relatórios, instituições,
fabricantes ou ensaios com método e rótulo verificáveis. Material publicitário sem imagem
original, máscara/contagem de referência ou identificação do método pode servir para teste
exploratório, mas não para comprovar a meta.

## Critério de publicação

Até o teste final existir, a interface deve continuar chamando DV, volume e sinais de
captura de estimativas/diagnósticos. Nenhum limite de recaptura ou alegação de exatidão
deve ser incorporado apenas porque funciona em uma imagem de exemplo.
