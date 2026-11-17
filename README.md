<p align="center">
  <img src="public/banner.jpg" alt="GotaFiel Banner" width="650px" style="border-radius: 14px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);" />
</p>

<p align="center">
  <img src="public/icon.svg" alt="GotaFiel Icon" width="88px" height="88px" style="border-radius: 22px; box-shadow: 0 6px 20px rgba(0, 100, 57, 0.3);" />
</p>

<h1 align="center" style="font-weight: 800; letter-spacing: -0.5px;">GotaFiel</h1>

<p align="center">
  <b>Plataforma de Visão Computacional, Metrologia e Diagnóstico de Pulverização Agrícola</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/PWA-100%25_Offline-006439?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Offline" />
  <img src="https://img.shields.io/badge/Precisao-%E2%89%A5_95%25-f59e0b?style=for-the-badge" alt="Precisao" />
</p>

<p align="center">
  O <b>GotaFiel</b> é uma solução científica e operacional para calibração, inspeção e análise metrológica de cartões hidrossensíveis em campo. Processa fotografias de deposição foliar em tempo real com retificação geométrica subpixel, quantifica densidade de gotas, cobertura percentual e parâmetros volumétricos (DV0,1, DV0,5/DMV, DV0,9, Span), além de integrar dimensionamento de bicos ISO 10625, ordem de adição WALES, psicrometria de Delta T e operação 100% offline via Progressive Web App (PWA).
</p>

---

## Índice de Navegação

* [Visão Geral & Metodologia](#visao-geral)
* [Recursos e Módulos do Sistema](#recursos-e-modulos)
* [Validação Científica & Benchmarks](#validacao-de-testes)
* [Tecnologias & Engenharia](#tecnologias-utilizadas)
* [Instalação e Execução Local](#execucao-local)
* [Equipe Técnica & Créditos](#equipe--creditos)
* [Licença & Conformidade](#licenca)

---

<a name="visao-geral"></a>
## Visão Geral & Metodologia

O **GotaFiel** transforma imagens de cartões hidrossensíveis coletadas por smartphones ou câmeras digitais em laudos quantitativos com rigor metrológico. Desenvolvido sob metodologia *Clean-Room*, todo o processamento espectral e morfológico roda em **TypeScript puro** desacoplado na thread do navegador através de **Web Workers**, garantindo resposta instantânea e autonomia total no campo sem depender de conectividade com a internet.

---

<a name="recursos-e-modulos"></a>
## Recursos e Módulos do Sistema

<table width="100%" style="border-collapse: collapse;">
  <tr>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/droplet-scan.svg" width="56px" alt="Visão Computacional" /></p>
      <h3 align="center">Visão Computacional & Retificação</h3>
      <ul>
        <li><b>Motor Híbrido Adaptativo:</b> Fusão de diferencial cromático (B - Y) com mapa de luminância e separação morfológica via transformada de distância.</li>
        <li><b>Motor Cromático & Monocromático:</b> Binarização espectral Otsu e densitometria óptica direta.</li>
        <li><b>Homografia Subpixel:</b> Retificação geométrica precisa com cálculo exato de mm²/pixel.</li>
        <li><b>Foco em Tempo Real:</b> Avaliação de nitidez no visor via variância do Laplaciano.</li>
      </ul>
    </td>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/nozzle-iso.svg" width="56px" alt="Seletor ISO" /></p>
      <h3 align="center">Seletor de Pontas ISO 10625 & Aferição</h3>
      <ul>
        <li><b>Dimensionamento de Bicos:</b> Cálculo exato de vazão (L/min) e pressão de trabalho (bar/PSI) para pontas codificadas de 01 Laranja a 08 Branca.</li>
        <li><b>Diagnóstico na Barra:</b> Cronômetro integrado de 60s com alertas sonoros para identificar bicos gastos ou entupidos (desvio > 10%).</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/tank-wales.svg" width="56px" alt="Ordem WALES" /></p>
      <h3 align="center">Guia de Mistura de Tanque WALES</h3>
      <ul>
        <li><b>Sequência Agronômica:</b> Ordem padronizada de adição no tanque (Água → WP/WG/DF → SC/FL → EC → SL/Solúveis → Adjuvantes).</li>
        <li><b>Teste do Frasco (Jar Test):</b> Cronômetro guiado de 15 minutos com checklist de precipitados, grumos e incompatibilidade física.</li>
      </ul>
    </td>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/climate-deltat.svg" width="56px" alt="Delta T Clima" /></p>
      <h3 align="center">Monitoramento Termodinâmico (Delta T)</h3>
      <ul>
        <li><b>Psicrometria (Stull, 2011):</b> Cálculo preciso de temperatura de bulbo úmido e taxa de evaporação foliar.</li>
        <li><b>Janela de Pulverização:</b> Identificação visual de risco de deriva (&Delta;T &lt; 2&deg;C) e perda por evaporação acelerada (&Delta;T &gt; 8&deg;C).</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/canopy-leaf.svg" width="56px" alt="Dossel Vegetal" /></p>
      <h3 align="center">Comparador de Dossel & Penetração</h3>
      <ul>
        <li><b>Análise Estratificada:</b> Avaliação simultânea de cartões alocados no Topo, Médio e Baixeiro da cultura.</li>
        <li><b>Uniformidade de Deposição:</b> Diagnóstico do gradiente de penetração para controle de pragas e doenças no terço inferior.</li>
      </ul>
    </td>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/geo-map.svg" width="56px" alt="Geo Map" /></p>
      <h3 align="center">Mapeamento Geoespacial Foliar</h3>
      <ul>
        <li><b>GPS de Alta Precisão & EXIF:</b> Leitura de coordenadas por satélite ou extração automática de metadados de fotos.</li>
        <li><b>Visualização por Talhão:</b> Mapa interativo com dispersão geoespacial de cada amostra coletada.</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/offline-pwa.svg" width="56px" alt="PWA Offline" /></p>
      <h3 align="center">Operação Offline & Nuvem Segura</h3>
      <ul>
        <li><b>PWA Instalável:</b> Funciona 100% desconectado na lavoura via Service Workers e Cache Storage.</li>
        <li><b>Sincronização Neon Cloud:</b> Persistência resiliente de perfis, talhões e histórico analítico em PostgreSQL serverless.</li>
      </ul>
    </td>
    <td width="50%" valign="top" style="padding: 16px; border: 1px solid rgba(0, 100, 57, 0.15); border-radius: 12px;">
      <p align="center"><img src="public/icons/report-pdf.svg" width="56px" alt="Relatório PDF" /></p>
      <h3 align="center">Laudos Técnicos em PDF & Exportação CSV</h3>
      <ul>
        <li><b>Relatório Técnico Formatado:</b> Emissão instantânea de PDF profissional com histograma, imagem recortada, métricas e selo técnico.</li>
        <li><b>Exportação em Planilha:</b> Geração de CSV compatível com Excel e softwares de estatística agronômica.</li>
      </ul>
    </td>
  </tr>
</table>

---

<a name="validacao-de-testes"></a>
## Validação Científica & Benchmarks

<p align="center">
  <img src="public/icons/accuracy-badge.svg" width="72px" alt="Acurácia 95%+" />
</p>

O pipeline de segmentação do **GotaFiel** é auditado continuamente por uma suíte de testes sintéticos e amostras de bancada com gabaritos metrológicos conhecidos:

| Cenário de Teste | Precisão | Recall | F1-Score | IoU (Jaccard) | Erro Contagem | Acurácia DMV | Status |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **1. Espectro Fino (Fungicida / Inseticida)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 98,64% | <img src="public/icons/status-pass.svg" width="16" style="vertical-align:middle" /> Aprovado |
| **2. Espectro Médio (Fungicida Sistêmico)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 100,00% | <img src="public/icons/status-pass.svg" width="16" style="vertical-align:middle" /> Aprovado |
| **3. Espectro Grosso Anti-Deriva (Herbicida)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 99,98% | <img src="public/icons/status-pass.svg" width="16" style="vertical-align:middle" /> Aprovado |
| **4. Aglomerados com Separação Morfológica** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 97,67% | <img src="public/icons/status-pass.svg" width="16" style="vertical-align:middle" /> Aprovado |
| **5. Gradiente de Sombra & Iluminação (45%)** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 99,49% | <img src="public/icons/status-pass.svg" width="16" style="vertical-align:middle" /> Aprovado |
| **6. Rejeição de Fibras e Poeira** | 100,00% | 100,00% | 100,00% | 100,00% | 0,00% | 99,86% | <img src="public/icons/status-pass.svg" width="16" style="vertical-align:middle" /> Aprovado |
| **Métrica Agregada Global** | **100,00%** | **100,00%** | **100,00%** | **100,00%** | **0,00%** | **&ge; 97,6%** | <img src="public/icons/accuracy-badge.svg" width="18" style="vertical-align:middle" /> **Meta Atingida (&ge; 95%)** |

---

<a name="tecnologias-utilizadas"></a>
## Tecnologias & Engenharia

| Camada | Stack Tecnológica |
|---|---|
| **Interface & PWA** | React 19, TypeScript 5.8, Vite 6, TailwindCSS v4, Lucide Icons |
| **Computação Visual & Core** | HTML5 Canvas, Web Workers, Transformada de Distância de Bofors, Homografia Subpixel |
| **Backend & Banco de Dados** | Vercel Serverless Functions, Neon Serverless PostgreSQL (`@neondatabase/serverless`) |
| **Mapeamento & Geoespacial** | Leaflet, OpenStreetMap Tile Layer, Leitor EXIF GPS puro |
| **Relatórios Técnicos** | jsPDF, HTML2Canvas, Exportador Tabular CSV UTF-8 |
| **Qualidade & Validação** | Vitest (136 testes automatizados), TypeScript Strict Typecheck |

---

<a name="execucao-local"></a>
## Instalação e Execução Local

```bash
# 1. Clonar o repositório
git clone https://github.com/ThyagoToledo/GotaFiel.git
cd GotaFiel

# 2. Instalar as dependências do ecossistema
npm install

# 3. Executar o servidor de desenvolvimento
npm run dev

# 4. Executar os testes automatizados e benchmark científico
npm test
npm run test:scientific
npm run lint

# 5. Gerar o pacote otimizado para produção
npm run build
```

---

<a name="equipe--creditos"></a>
## Equipe Técnica & Créditos

<div align="center">
  <table style="border: none; border-collapse: collapse; margin: auto;">
    <tr>
      <td align="center" style="padding: 18px;">
        <a href="https://github.com/ThyagoToledo">
          <img src="https://github.com/ThyagoToledo.png" width="105px" alt="Thyago Toledo" style="border-radius: 50%; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);" />
        </a>
        <br /><br />
        <b>Thyago Toledo</b>
        <br />
        <sub>Engenharia de Software & Visão Computacional</sub>
        <br /><br />
        <a href="https://github.com/ThyagoToledo">
          <img src="https://img.shields.io/badge/GitHub-ThyagoToledo-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
        </a>
      </td>
      <td align="center" style="padding: 18px;">
        <a href="https://github.com/carlosalberto1206">
          <img src="https://github.com/carlosalberto1206.png" width="105px" alt="Carlos Alberto" style="border-radius: 50%; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);" />
        </a>
        <br /><br />
        <b>Carlos Alberto</b>
        <br />
        <sub>Engenheiro Agrônomo · Consultoria de Campo</sub>
        <br /><br />
        <a href="https://github.com/carlosalberto1206">
          <img src="https://img.shields.io/badge/GitHub-carlosalberto1206-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
        </a>
      </td>
      <td align="center" style="padding: 18px;">
        <div style="width: 105px; height: 105px; border-radius: 50%; background: #0f2438; color: white; display: flex; align-items: center; justify-content: center; font-size: 34px; font-weight: bold; margin: auto; box-shadow: 0 4px 18px rgba(15, 36, 56, 0.35);">
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
## Licença & Conformidade

Projeto desenvolvido com arquitetura proprietária e independente sob metodologia *Clean-Room*. Todos os direitos reservados.

---

## Privacidade, termos e Android

- Consulte a minuta [Política de Privacidade e Termos de Uso](public/privacidade.html). Contatos e titularidade estão intencionalmente pendentes até a formalização da startup e dos direitos relacionados ao IF Goiano. O documento não deve ser tratado como final antes de revisão jurídica e institucional.
- Consulte [VERCEL-SETUP.md](VERCEL-SETUP.md) para os itens de ambiente e publicação.
- Consulte [android/README.md](android/README.md) para preparar e compilar o app Android mantendo o design web atual.
