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
  GotaFiel é uma plataforma de visão computacional e metrologia agrícola para análise de cartões hidrossensíveis de pulverização. O software processa imagens de deposição de defensivos, quantifica densidade de gotas, cobertura percentual e diâmetros volumétricos (DV0,1, DV0,5/DMV, DV0,9, Span), além de oferecer seleção de pontas ISO 10625, ordem de mistura WALES, monitoramento termodinâmico de Delta T e suporte a operação 100% offline em campo via Progressive Web App (PWA).
</p>

---

## Índice

* [Visão Geral](#visao-geral)
* [Componentes Principais](#componentes-principais)
* [Validação de Testes](#validacao-de-testes)
* [Tecnologias Utilizadas](#tecnologias-utilizadas)
* [Documentação Completa](#documentacao-completa)
* [Execução Local](#execucao-local)
* [Equipe & Créditos](#equipe--creditos)
* [Licença](#licenca)

---

<a name="visao-geral"></a>
## Visão Geral

O **GotaFiel** transforma fotografias de cartões hidrossensíveis capturadas por smartphones ou câmeras em diagnósticos quantitativos de pulverização. Construído sob metodologia Clean-Room, todo o pipeline de processamento foi desenvolvido em TypeScript puro com execução em Web Workers, permitindo realizar medições com precisão milimétrica mesmo sem sinal de internet na lavoura.

---

<a name="componentes-principais"></a>
## Componentes Principais

### Visão Computacional & Motores de Segmentação
* **Motor Híbrido Adaptativo:** Fusão espectral azul-amarelo e luminância, normalização de iluminação para compensação de sombras e separação morfológica de gotas aglomeradas por transformada de distância.
* **Motor Cromático:** Binarização espectral direta pelo diferencial cromático com limiarização automática de Otsu.
* **Motor Monocromático:** Binarização em escala de cinza por densidade óptica e suavização espacial.
* **Calibração Física:** Retificação geométrica por homografia subpixel e cálculo de área física por pixel (mm²/pixel).
* **Assistente de Foco em Tempo Real:** Análise instantânea de nitidez via variância do Laplaciano no visor da câmera.

### Ferramentas de Campo & Diagnóstico Agronômico
* **Seletor de Pontas ISO 10625:** Dimensionamento hidráulico de bicos (01 Laranja a 08 Branca) com cálculo de pressão exata em bar e PSI.
* **Guia de Ordem de Tanque WALES & Jar Test:** Sequência agronômica padronizada de adição de produtos e cronômetro de 15 minutos para teste de compatibilidade.
* **Aferição de Bicos na Barra:** Cronômetro de coleta de 60 segundos com sinal sonoro, cálculo de desvio relativo/absoluto e gráficos de desgaste ou obstrução.
* **Comparador de Dossel & Penetração Foliar:** Avaliação simultânea de topo, médio e baixeiro com diagnóstico de cobertura.
* **Mapeamento Geoespacial Foliar:** Visualização de amostras por talhão em mapa interativo OpenStreetMap com geolocalização GPS.
* **Clima & Risco de Deriva (Delta T):** Avaliação termodinâmica de bulbo úmido (Stull, 2011) para prevenção de evaporação e deriva.

---

<a name="validacao-de-testes"></a>
## Validação de Testes

O software é validado continuamente por uma suíte automatizada de testes e benchmarks de visão computacional contra padrões de referência:

| Cenário de Teste | Precisão | Recall | F1-Score | IoU (Jaccard) | Erro Contagem | Acurácia DMV | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Espectro Fino (Fungicida / Inseticida)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 98,64% | Aprovado |
| **2. Espectro Médio (Fungicida Sistêmico)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 100,00% | Aprovado |
| **3. Espectro Grosso Anti-Deriva (Herbicida)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 99,98% | Aprovado |
| **4. Aglomerados com Separação Morfológica** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 97,67% | Aprovado |
| **5. Gradiente de Sombra & Iluminação (45%)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 99,49% | Aprovado |
| **6. Rejeição de Fibras e Poeira** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 99,86% | Aprovado |
| **Métrica Agregada Global** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | **0,00%** | **≥ 97,6%** | **Meta Atingida (≥ 95%)** |

---

<a name="tecnologias-utilizadas"></a>
## Tecnologias Utilizadas

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19, TypeScript 5.8, Vite 6, TailwindCSS v4, Lucide Icons |
| **Computação Visual** | HTML5 Canvas, Web Workers, Transformada de Distância, Homografia Subpixel |
| **Backend & Banco** | Vercel Serverless Functions, Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Mapeamento & GPS** | Leaflet, OpenStreetMap Tile Layer |
| **PWA & Offline** | Service Workers, Cache Storage API, Web App Manifest |
| **Relatórios & Exportação** | jsPDF, HTML2Canvas, gerador CSV estruturado |
| **Testes & Qualidade** | Vitest (134 testes), TypeScript Strict Mode, TSX |

---

<a name="documentacao-completa"></a>
## Documentação Completa

Para aprofundamento técnico, consulte os documentos disponíveis na pasta [`docs/`](docs/):

* [**Arquitetura Técnica & Metodologia Científica**](docs/ARQUITETURA-E-METODOLOGIA.md)
* [**Manual do Usuário & Guia de Campo**](docs/MANUAL-DO-USUARIO.md)
* [**Estudo Científico e Comparação de Softwares**](docs/ESTUDO-CIENTIFICO-E-COMPARACAO-SOFTWARE.md)
* [**Plano de Validação Científica (Meta ≥ 95%)**](docs/PLANO-VALIDACAO-CIENTIFICA.md)
* [**Protocolo de Coleta e Validação em Campo**](docs/PROTOCOLO-COLETA-VALIDACAO.md)
* [**Resultados dos Testes do Algoritmo**](docs/RESULTADOS-TESTES-ALGORITMO.md)
* [**Auditoria de Segurança & Rate Limiting**](docs/SECURITY-AUDIT.md)
* [**Autenticação e Persistência Neon**](docs/NEON-AUTH.md)
* [**Roadmap & Sugestões de Novas Funcionalidades**](docs/ROADMAP-E-NOVAS-FUNCIONALIDADES.md)

---

<a name="execucao-local"></a>
## Execução Local

1. Clone o repositório:
```bash
git clone https://github.com/ThyagoToledo/GotaFiel.git
cd GotaFiel
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Execute os testes e a validação de precisão:
```bash
# Execução dos 134 testes unitários automatizados
npm test

# Execução do benchmark científico (95%+)
npm run test:scientific

# Verificação estrita de tipos TypeScript
npm run lint
```

5. Gere o pacote de produção:
```bash
npm run build
```

---

<a name="equipe--creditos"></a>
## Equipe & Créditos

<div align="center">
  <table style="border: none; border-collapse: collapse; margin: auto;">
    <tr>
      <td align="center" style="padding: 16px;">
        <a href="https://github.com/ThyagoToledo">
          <img src="https://github.com/ThyagoToledo.png" width="100px" alt="Thyago Toledo" style="border-radius: 50%; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);" />
        </a>
        <br />
        <b>Thyago Toledo</b>
        <br />
        <sub>Engenharia de Software & Visão Computacional</sub>
        <br />
        <a href="https://github.com/ThyagoToledo">
          <img src="https://img.shields.io/badge/GitHub-ThyagoToledo-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
        </a>
      </td>
      <td align="center" style="padding: 16px;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: #006439; color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin: auto; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
          CA
        </div>
        <br />
        <b>Carlos Alberto</b>
        <br />
        <sub>Engenheiro Agrônomo · Consultoria de Campo</sub>
      </td>
      <td align="center" style="padding: 16px;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: #0f2438; color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin: auto; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);">
          MF
        </div>
        <br />
        <b>Marco Antônio Moreira de Freitas</b>
        <br />
        <sub>Engenheiro Agrônomo · Validação Agronômica</sub>
      </td>
    </tr>
  </table>
</div>

---

<a name="licenca"></a>
## Licença

Projeto desenvolvido com arquitetura proprietária e independente sob metodologia Clean-Room. Todos os direitos reservados.
