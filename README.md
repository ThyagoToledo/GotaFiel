<p align="center">
  <img src="public/banner.jpg" alt="GotaFiel Banner" width="600px" style="border-radius: 12px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);" />
</p>

<p align="center">
  <img src="public/icon.svg" alt="GotaFiel Icon" width="96px" height="96px" style="border-radius: 24px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);" />
</p>

<h1 align="center">GotaFiel</h1>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/PWA-Offline_Ready-006439?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Precisao-%E2%89%A5_95%25-006439?style=for-the-badge" alt="Precisao" />
</p>

<p align="center">
  GotaFiel e uma plataforma de visao computacional e calibracao agronomica para analise de cartoes hidrossensiveis de pulverizacao agricola. O software processa imagens de deposicao de defensivos, quantifica densidade de gotas, cobertura percentual e diametros volumetricos (DV0.1, DV0.5/DMV, DV0.9, Span), alem de oferecer calibracao de bicos pulverizadores, monitoramento termodinamico de Delta T e suporte a operacao offline em campo via Progressive Web App (PWA).
</p>

---

## Indice

* [Visao Geral](#visao-geral)
* [Componentes Principais](#componentes-principais)
* [Validacao de Testes](#validacao-de-testes)
* [Tecnologias Utilizadas](#tecnologias-utilizadas)
* [Estrutura de Diretorios](#estrutura-de-diretorios)
* [Execucao Local](#execucao-local)
* [Autor](#autor)
* [Licenca](#licenca)

---

## Visao Geral

O **GotaFiel** transforma fotografias de cartoes hidrossensiveis capturadas por smartphones ou cameras em diagnosticos quantitativos de pulverizacao. Construido sob a metodologia Clean-Room, todo o pipeline de processamento foi desenvolvido em TypeScript puro com execucao em Web Workers, permitindo realizar medicoes com precisao milimetrica mesmo sem sinal de internet na lavoura.

---

## Componentes Principais

### Visao Computacional & Motores de Segmentacao
* **Motor Hibrido Adaptativo:** Fusao espectral azul-amarelo e luminancia, normalizacao de iluminacao para compensacao de sombras e separacao morfologica de gotas aglomeradas por transformada de distancia.
* **Motor Cromatico:** Binarizacao espectral direta pelo diferencial cromatico com limiarizacao automatica de Otsu.
* **Motor Monocromatico:** Binarizacao em escala de cinza por densidade optica e suavizacao espacial.
* **Calibracao Fisica:** Retificacao geometrica por homografia subpixel e calculo preciso de area fisica por pixel (mm2/pixel).

### Ferramentas de Campo & Diagnostico Agronomico
* **Afericao de Bicos:** Cronometro de coleta de 60 segundos com sinal sonoro, calculo de desvio relativo/absoluto e graficos divergentes para identificacao de desgaste ou obstrucao.
* **Calculadora de Volume de Calda:** Determinacao da taxa de aplicacao em L/ha em funcao da vazao, espacamento e velocidade de trabalho.
* **Clima & Risco de Deriva (Delta T):** Avaliacao termodinamica de bulbo umido (Stull, 2011) para prevencao de evaporacao de gotas finas e deriva por vento.
* **Diagnostico Rapido:** Simulacao de densidade e cobertura para alvos especificos (fungicidas de contato, sistemicos, inseticidas e herbicidas).

### Mobilidade & Persistencia
* **Progressive Web App (PWA):** Instalacao direta no celular ou computador com Service Worker para execucao completa sem sinal de internet na lavoura.
* **Persistencia Distribuida:** Armazenamento relacional serverless no Neon PostgreSQL e imagens privadas no Vercel Blob com protecao de taxa (Rate Limiting).
* **Exportacao de Relatorios:** Geracao client-side de documentos tecnicos em PDF e planilhas estruturadas em CSV.

---

## Validacao de Testes

O software e validado continuamente por uma suite automatizada de testes e benchmarks de visao computacional contra padroes de referencia:

| Cenario de Teste | Precisao | Recall | F1-Score | IoU (Jaccard) | Erro Contagem | Erro Cobertura | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Padrao Geometrico de Calibracao (25 gotas)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 0,000 p.p. | Aprovado |
| **2. Gotas Finas Esparsas (Baixa Cobertura)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 0,000 p.p. | Aprovado |
| **3. Gradiente Severo de Sombra (100% a 45% luz)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 0,000 p.p. | Aprovado |
| **4. Aglomerados com Constricao (Split)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 0,000 p.p. | Aprovado |
| **5. Ruido de Papel Real** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 0,000 p.p. | Aprovado |
| **Metrica Agregada Global** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | **0,00%** | **0,000 p.p.** | **Meta Atingida (>= 95%)** |

---

## Tecnologias Utilizadas

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, TailwindCSS v4, Lucide Icons, Motion |
| **Computacao Visual** | HTML5 Canvas, Web Workers, Transformada de Distancia, Homografia Subpixel |
| **Backend & Banco** | Vercel Serverless Functions, Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Armazenamento & PWA** | Vercel Blob Storage, Service Workers, Web App Manifest |
| **Relatorios & Exportacao** | jsPDF, HTML2Canvas, gerador CSV nativo |
| **Testes & Qualidade** | Vitest, TypeScript Strict Mode, TSX |

---

<details>
  <summary><b>Estrutura de Diretorios</b></summary>

```text
GotaFiel/
├── api/                     # Serverless endpoints (autenticacao, analises e rate limit)
│   ├── auth/                # Rotas de login, cadastro, sessao e logout
│   ├── analyses/            # CRUD de amostras e sincronizacao com o Neon
│   └── lib/                 # Conexao com banco Neon, hash de senhas e utilitarios HTTP
├── public/                  # Ativos estaticos e configuracoes PWA
│   ├── icon.svg             # Vetor principal do icone da aplicacao
│   ├── icon-maskable.svg    # Icone adaptativo com area de seguranca para Android
│   ├── app-icon.png         # Icone em alta resolucao para instalacao PWA
│   ├── banner.jpg           # Banner oficial do GotaFiel
│   ├── manifest.webmanifest # Manifesto da aplicacao web progressiva
│   └── sw.js                # Service Worker para cache e uso offline
├── src/
│   ├── core/                # Nucleo de visao computacional e binarizacao
│   │   ├── imageProcessor.ts     # Pipeline de processamento e extracao de metricas
│   │   ├── analysisCore.ts       # Algoritmos de segmentacao e rotulacao de gotas
│   │   ├── imageWorker.ts        # Execucao assincrona em Web Worker
│   │   └── validationMetrics.ts  # Metricas estatisticas de validacao e IoU
│   ├── components/          # Componentes visuais da interface de usuario
│   │   ├── wizard/          # Assistente de analise em 6 etapas
│   │   ├── CalculatorsView.tsx   # Calculadoras agronomicas e diagnosticos
│   │   ├── InstallAppBanner.tsx  # Banner de instalacao PWA
│   │   ├── TalhaoDetailView.tsx  # Gestao de experimentos e talhoes
│   │   └── MoreView.tsx          # Configuracoes de motores e criterios
│   ├── hooks/               # Custom hooks React (PWA, camera, eventos)
│   └── utils/               # Geradores de relatorio PDF, CSV e calculos climaticos
├── scripts/                 # Suites de validacao e benchmarks cientificos
│   └── benchmarkRunner.ts   # Executor de validacao de precisao (>= 95%)
└── package.json             # Dependencias e scripts do projeto
```
</details>

---

## Execucao Local

### Pre-requisitos
* Node.js versao 20 ou superior
* npm ou yarn

### Instrucoes

1. Clone o repositorio:
```bash
git clone https://github.com/ThyagoToledo/GotaFiel.git
cd GotaFiel
```

2. Instale as dependencias:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Execute os testes e a validacao de precisao:
```bash
# Execucao dos 101 testes unitarios
npm test

# Execucao do benchmark de precisao cientifica
npm run test:benchmark

# Verificacao de tipos TypeScript
npm run lint
```

5. Gere o pacote de producao:
```bash
npm run build
```

---

## Autor

Desenvolvido por **[Thyago Toledo](https://github.com/ThyagoToledo)**.

---

## Licenca

Projeto desenvolvido com arquitetura proprietaria e independente sob metodologia Clean-Room. Todos os direitos reservados.
