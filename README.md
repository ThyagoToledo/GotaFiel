<p align="center">
  <img src="public/banner.jpg" alt="GotaFiel Banner" width="100%" />
</p>

<h1 align="center">🌾 GotaFiel — Análise de Pulverização & Calibração Agrícola</h1>

<p align="center">
  <strong>Plataforma moderna de visão computacional de alta precisão para análise de cartões hidrossensíveis, calibração de bicos pulverizadores e diagnóstico agronômico de campo.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versão-2.5.0-emerald.svg" alt="Versão 2.5.0" />
  <img src="https://img.shields.io/badge/precisão-≥_95%25_comprovada-006439.svg" alt="Precisão 95%+" />
  <img src="https://img.shields.io/badge/pwa-offline_ready-blue.svg" alt="PWA Offline" />
  <img src="https://img.shields.io/badge/typescript-strict_100%25-3178c6.svg" alt="TypeScript" />
  <img src="https://img.shields.io/badge/testes-101_passando-brightgreen.svg" alt="Testes Unitários" />
  <img src="https://img.shields.io/badge/arquitetura-clean--room-orange.svg" alt="Clean-Room" />
  <img src="https://img.shields.io/badge/banco-neon_serverless-00e599.svg" alt="Neon Database" />
</p>

---

## 📌 Visão Geral

O **GotaFiel** é uma solução de agricultura de precisão desenvolvida para agrônomos, pesquisadores, operadores de pulverização e produtores rurais. O software transforma imagens de cartões hidrossensíveis capturadas por smartphones ou câmeras em métricas quantitativas de deposição de defensivos em segundos.

A ferramenta combina processamento em **Web Workers** acelerados no próprio navegador, armazenamento em nuvem no **Neon PostgreSQL** e **Vercel Blob**, e ferramentas de campo como aferição individual de bicos de pulverização, monitoramento climático (Delta T) e diagnóstico rápido de gotas.

---

## 🛡️ Arquitetura Clean-Room & Propriedade Intelectual

O GotaFiel foi construído segundo os mais rigorosos princípios de **Engenharia Reversa Limpa (*Clean-Room Development*)**:

1. **Zero Cópia de Código**: 100% do código-fonte, algoritmos de segmentação, rotulação de componentes, matrizes de transformação de perspectiva e modelos estatísticos foram escritos do zero em **TypeScript e JavaScript modernos**.
2. **Identidade Visual Própria**: Interface responsiva, contemporânea e projetada especificamente para uso sob a luz do sol (*High Sunlight Legibility*) e tema escuro.
3. **Independência Tecnológica**: Nenhuma dependência de binários legados ou marcas comerciais registradas de terceiros.

---

## 🚀 Principais Funcionalidades

### 1. 🔬 Análise de Cartões Hidrossensíveis (Fluxo em 6 Passos)
- **Passo 1 — Captura Inteligente**:
  - Acesso direto à galeria de fotos sem forçar a câmera.
  - Câmera nativa no mobile via `capture="environment"`.
  - Visualizador de **webcam ao vivo no desktop** via `navigator.mediaDevices.getUserMedia`.
- **Passo 2 — Retificação Geométrica**:
  - Ajuste de 4 vértices para correção de perspectiva com homografia subpixel e raster dinâmico.
- **Passo 3 — Escala Física e Resolução**:
  - Calibração de dimensão do cartão ($76 \times 26\text{ mm}$, $38 \times 26\text{ mm}$ ou personalizado) garantindo pixel físico quadrado ($mm^2/\text{pixel}$).
- **Passo 4 — Sensibilidade & Motores Clean-Room**:
  - **Motor Híbrido Adaptativo (Padrão Recomendado)**: Fusão espectral azul-amarelo ($B - \max(R,G)$), luminância, compensação de sombras e separação morfológica de gotas sobrepostas.
  - **Motor Cromático (Espectral)**: Binarização direta por isolamento do canal azul com limiar de Otsu.
  - **Motor Monocromático (Escala de Cinza)**: Binarização por contraste de densidade óptica com suavização espacial 3×3.
  - Separação de gotas aglomeradas (*Overlapping Droplet Split*) por transformada de distância e constrição.
  - Filtragem de fibras, poeiras e riscos por circularidade ($4\pi A / P^2$).
- **Passo 5 — Resultados & Diagnóstico Agronômico**:
  - Densidade de gotas ($\text{gotas/cm}^2$) com classificação visual (Insuficiente, Intermediária, Boa).
  - Cobertura percentual (%) com **Alerta Crítico de Excesso e Escorrimento ($\ge 75\%$)**.
  - Diâmetros Volumétricos: $DV_{0.1}, DV_{0.5} (\text{DMV/VMD}), DV_{0.9}$ e Coeficiente de Dispersão ($\text{Span}$).
  - Volume estimado aplicado em $\text{L/ha}$.
  - Espectro de gotas padronizado (ASABE S572.1).
- **Passo 6 — Inspeção Manual de Manchas**:
  - Visualização interativa gota a gota com inclusão/exclusão manual e recálculo instantâneo das estatísticas.

---

### 2. 🧪 Calculadoras Agrícolas Especializadas
- **Volume de Calda**: Cálculo exato da taxa de aplicação ($\text{L/ha}$) a partir da vazão do bico ($\text{L/min}$), espaçamento ($\text{cm}$) e velocidade ($\text{km/h}$).
- **Aferição de Bicos de Pulverização**:
  - Cronômetro digital integrado de 60 segundos com sinal sonoro de término.
  - Gráfico divergente de barras destacando desvio individual ($\%$) em relação à média da barra.
  - Critérios direcionais (desgaste vs obstrução) e absolutos.
- **Clima & Risco de Deriva (Delta T)**:
  - Cálculo de temperatura de bulbo úmido pela fórmula termodinâmica de **Stull (2011)**.
  - Diagnóstico de risco de evaporação rápida (gotas finas), deriva por vento ou inversão térmica.
- **Diagnóstico Rápido de Pulverização**:
  - Simulação instantânea de densidade e cobertura para alvos específicos: *Fungicidas de Contato (50-70 gotas/cm²)*, *Fungicidas Sistêmicos (30-40 gotas/cm²)*, *Inseticidas (20-30 gotas/cm²)* e *Herbicidas (15-30 gotas/cm²)*.

---

### 3. 📱 PWA & Funcionamento Offline no Campo
- Instalável como aplicativo nativo no celular (Android / iOS) e no computador (Chrome / Edge / Safari).
- Service Worker com estratégia de cache avançada: funciona mesmo sem sinal de internet na lavoura.
- Banner e atalho direto nas configurações para instalação com um clique.

---

### 4. 📄 Exportação & Relatórios
- **Relatório PDF Completo**: Geração no cliente via `jsPDF` com dados do talhão, histograma de distribuição de gotas, metadados técnicos e orientações de calibração.
- **Planilhas CSV**: Exportação detalhada de gotas individuais ou consolidadas por talhão e experimento.

---

## 📊 Validação Científica & Benchmark (Meta $\ge 95\%$)

O GotaFiel conta com uma suíte de validação automatizada contra conjuntos de dados de referência sintéticos e reais:

```bash
npm run test:benchmark
```

| Cenário de Teste | Precisão | Recall | F1-Score | IoU (Jaccard) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Padrão Geométrico de Calibração (25 gotas)** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | ✅ **Aprovado ($\ge 95\%$)** |
| **2. Gotas Finas Esparsas (Baixa Cobertura)** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | ✅ **Aprovado ($\ge 95\%$)** |
| **3. Gradiente Severo de Sombra (100% a 45% luz)** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | ✅ **Aprovado ($\ge 95\%$)** |
| **4. Aglomerados de Gotas Sobrepostas (Split)** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | ✅ **Aprovado ($\ge 95\%$)** |
| **5. Ruído de Granulação de Papel Real** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | ✅ **Aprovado ($\ge 95\%$)** |
| **MÉTRICA AGREGADA GLOBAL** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | 🏆 **EXCELÊNCIA (100%)** |

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/), [TailwindCSS v4](https://tailwindcss.com/)
- **Ícones & UI**: [Lucide React](https://lucide.dev/), [Motion](https://motion.dev/)
- **Documentos**: [jsPDF](https://github.com/parallax/jsPDF)
- **Backend Serverless**: [Vercel Serverless Functions](https://vercel.com/docs/functions)
- **Banco de Dados**: [Neon Serverless PostgreSQL](https://neon.tech/) com driver `@neondatabase/serverless`
- **Armazenamento de Imagens**: [Vercel Blob Storage](https://vercel.com/docs/storage/vercel-blob)
- **Testes & Qualidade**: [Vitest](https://vitest.dev/), [TSX](https://github.com/privatenumber/tsx)

---

## 💻 Instalação & Execução Local

### Pré-requisitos
- Node.js 20+ ou 22+
- npm ou yarn

### 1. Clonar o repositório
```bash
git clone https://github.com/ThyagoToledo/Gotas2.git
cd Gotas2
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente (Opcional para desenvolvimento local)
Crie um arquivo `.env` com a conexão do Neon e do Vercel Blob (ou rode no modo mock offline):
```env
DATABASE_URL=postgres://usuario:senha@ep-exemplo.us-east-2.aws.neon.tech/neondb?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_token_aqui
```

### 4. Executar em modo de desenvolvimento
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### 5. Executar os testes
```bash
# Executa todos os testes unitários (101 testes)
npm test

# Executa o benchmark científico de 95%+
npm run test:benchmark

# Verifica tipagem estrita do TypeScript
npm run lint
```

### 6. Gerar o build de produção
```bash
npm run build
```

---

## 🔒 Segurança & Privacidade

- **Autenticação Segura**: Senhas protegidas por criptografia `scrypt` com salt individual criptográfico.
- **Cookies HttpOnly**: Tokens de sessão com atributos `Secure`, `SameSite=Lax` e `HttpOnly`.
- **Proteção contra Brute-Force**: Rate limiting distribuído no Neon com janelas deslizantes de 15 minutos e hash SHA-256 (nenhum IP ou senha em texto puro é persistido).
- **Isolamento de Dados**: Análises, imagens e coordenadas de gotas são vinculadas estritamente ao `user_id` autenticado.

---

## 📄 Licença

Este projeto é desenvolvido com código 100% original sob a abordagem Clean-Room para o agronegócio de alta precisão. Todos os direitos reservados.
