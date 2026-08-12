import { AnalysisData, FieldExperiment, NozzleCalibrationSession } from '../types';

export const SAMPLE_CARD_IMAGES = {
  ideal: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClUaLSB0WfXSdHOH5dyn924A6MoIeic141oS173oLTxJ3M7JGg4ERGhitJBIlueiZYzkfiP4UQL2YZst3TVlb4LwwX-0IiuDT8btIQ5_OoojPR3HuwuV-gDUB1XJrYiFGDM1Nsq2qIVqijX-9A2y7OXek2gX-ynjwzLpRK_TCHTzMycwTgFiCr_8AQJ5F2GGUTAqZwMtaEQyX5ivsuEnYTTy81AH3BplnncNwxhReHmjfGtqdQe_XP',
  runoff: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCgckIdM7cR4Zwt_EEj3T0Kqp1BfT0F2hTFrLVb3Pqmya3oPHk0R6FH_lFo2cYmp_GCgWePPLyRbzni0aBDxrCluq80dXpkHqUSeBcpP4QlNUq6pNSMgeF7q3siEu3sRHmEsxRqQbacZIh0d6qTWZTVSH75jP5JymqTjOSSC8O0NK7esfRg0WW-K0UXYXHrLWbvzoATEBGOqmmBbIbztE3Dh65wuEMt0NVxxk5RhwEJkjpifvva8EJw',
  macro: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7d_iQiGhKWNIJpF6H3vKaZMRDvKxSZq9Jt9zQq_i2c4DzMtiCoP3rsuNI5Rhd4-TCSrMVAA2E048WnZRTJNONytERwuM8ZEgO6MS3IbuvrI9yZUSf6GxmMsJoRQgaNwFcTSsAYNmvRgxV2Nmmahv9M8FR09XFsjsOoF_Vr0FUfChCFjdpli1v7wxKTA2E-qb_zafRr14ZJ-i-0aSJzYL88TepNn4yFvDxwle9tppmPmX5Mq1A6xwt',
  binary: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdDKoP_PcscP3hztPaZ5mBzS1RhPvs6xJkynObn2_q7FBhbkT62ki5snVp4KUvwdNJrdlKHBDYiJLp7lbUI_lZkvAZA9QbjC4zMhNZ62mAl7DJQNlKLfas2GPcsCcIiZm5J5MCchq46l-f4BfEpaacsbiYyfSp--Rod0rE6YGcJb5qKKxEuJxLyTmd-dINmMo27IPhHNwzJPToajF4_RILYPe0hseQaR2fCQqwzsPnxCmZ5XNx0uFK',
};

// Generate initial droplets for interactive step 6
export function generateMockDroplets(count = 28): Array<{ id: string; x: number; y: number; sizePx: number; diameterUm: number; included: boolean }> {
  const droplets = [];
  const coords = [
    { x: 30, y: 20, size: 24, um: 280, included: true },
    { x: 60, y: 45, size: 36, um: 420, included: true },
    { x: 25, y: 70, size: 16, um: 180, included: true },
    { x: 75, y: 35, size: 32, um: 360, included: false }, // Excluded
    { x: 40, y: 60, size: 20, um: 220, included: false }, // Excluded
    { x: 65, y: 80, size: 28, um: 310, included: false }, // Excluded
    { x: 15, y: 40, size: 18, um: 200, included: true },
    { x: 80, y: 15, size: 22, um: 250, included: true },
    { x: 50, y: 30, size: 30, um: 340, included: true },
    { x: 35, y: 85, size: 26, um: 290, included: true },
    { x: 85, y: 60, size: 20, um: 210, included: true },
    { x: 45, y: 15, size: 14, um: 160, included: true },
  ];

  for (let i = 0; i < Math.max(count, coords.length); i++) {
    const c = coords[i % coords.length];
    const jitterX = ((i * 17) % 15) - 7;
    const jitterY = ((i * 23) % 15) - 7;
    droplets.push({
      id: `drop-${i + 1}`,
      x: Math.min(92, Math.max(8, c.x + jitterX)),
      y: Math.min(92, Math.max(8, c.y + jitterY)),
      sizePx: c.size,
      diameterUm: c.um,
      included: c.included,
    });
  }
  return droplets;
}

export const INITIAL_RECENT_ANALYSES: AnalysisData[] = [
  {
    id: 'ana-1',
    title: 'Talhão 4 — Amostra 3',
    fieldId: 'exp-1',
    date: '10:42',
    timestamp: Date.now() - 3600000,
    imageUrl: SAMPLE_CARD_IMAGES.ideal,
    cardColor: 'Amarelo',
    cardSizeMm: { width: 76, height: 26 },
    dpi: 300,
    sensitivity: 0,
    totalDroplets: 1244,
    density: 62,
    coveragePercent: 18,
    span: 1.04,
    vmdUm: 346,
    dv01Um: 180,
    dv09Um: 540,
    estimatedVolumeLha: 2.26,
    verdict: 'BOM',
    verdictScore: 78,
    asabeCategory: 'Grossa',
    droplets: generateMockDroplets(30),
  },
  {
    id: 'ana-2',
    title: 'Talhão 2 — Amostra 1',
    fieldId: 'exp-2',
    date: 'Ontem',
    timestamp: Date.now() - 86400000,
    imageUrl: SAMPLE_CARD_IMAGES.ideal,
    cardColor: 'Amarelo',
    cardSizeMm: { width: 76, height: 26 },
    dpi: 300,
    sensitivity: 0,
    totalDroplets: 890,
    density: 45,
    coveragePercent: 12,
    span: 1.18,
    vmdUm: 280,
    dv01Um: 150,
    dv09Um: 480,
    estimatedVolumeLha: 1.85,
    verdict: 'REGULAR',
    verdictScore: 62,
    asabeCategory: 'Grossa',
    droplets: generateMockDroplets(24),
  },
  {
    id: 'ana-3',
    title: 'Talhão 1 — Amostra 5',
    fieldId: 'exp-3',
    date: 'Ontem',
    timestamp: Date.now() - 90000000,
    imageUrl: SAMPLE_CARD_IMAGES.runoff,
    cardColor: 'Amarelo',
    cardSizeMm: { width: 76, height: 26 },
    dpi: 300,
    sensitivity: 0,
    totalDroplets: 240,
    density: 12,
    coveragePercent: 3.5,
    span: 2.1,
    vmdUm: 120,
    dv01Um: 80,
    dv09Um: 330,
    estimatedVolumeLha: 0.65,
    verdict: 'RUIM',
    verdictScore: 28,
    asabeCategory: 'Fina',
    droplets: generateMockDroplets(15),
  },
];

export const INITIAL_FIELD_EXPERIMENTS: FieldExperiment[] = [
  {
    id: 'exp-1',
    name: 'Talhão 4 — Soja',
    crop: 'Soja',
    date: 'Hoje',
    samples: [
      { id: 's1', name: 'AMOSTRA 1', status: 'Ideal', density: 85, coverage: 12, span: 1.2 },
      { id: 's2', name: 'AMOSTRA 2', status: 'Razoável', density: 42, coverage: 5, span: 1.8 },
      { id: 's3', name: 'AMOSTRA 3', status: 'Ruim', density: 18, coverage: 2, span: 2.4 },
      { id: 's4', name: 'AMOSTRA 4', status: 'Ideal', density: 90, coverage: 14, span: 1.1 },
    ],
  },
  {
    id: 'exp-2',
    name: 'Talhão 2 — Milho',
    crop: 'Milho',
    date: 'Ontem',
    samples: [
      { id: 's5', name: 'AMOSTRA 1', status: 'Razoável', density: 45, coverage: 8, span: 1.5 },
      { id: 's6', name: 'AMOSTRA 2', status: 'Ideal', density: 78, coverage: 11, span: 1.2 },
    ],
  },
];

export const INITIAL_NOZZLE_SESSION: NozzleCalibrationSession = {
  id: 'noz-1',
  date: 'Hoje',
  nozzleCount: 6,
  collectionTimeSec: 60,
  overallAvgMl: 812,
  flowAvgLmin: 0.81,
  maxDevPercent: 14,
  nozzles: [
    { id: 1, label: 'Bico 1', volumeMl: 828, deviationPercent: 2 },
    { id: 2, label: 'Bico 2', volumeMl: 780, deviationPercent: -4 },
    { id: 3, label: 'Bico 3', volumeMl: 876, deviationPercent: 8 },
    { id: 4, label: 'Bico 4', volumeMl: 698, deviationPercent: -14, actionRequired: 'SUBSTITUIR' },
    { id: 5, label: 'Bico 5', volumeMl: 820, deviationPercent: 1 },
    { id: 6, label: 'Bico 6', volumeMl: 885, deviationPercent: 9 },
  ],
};
