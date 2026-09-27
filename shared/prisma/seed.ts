import { prisma } from '../src/index';

type SeedRow = {
  customerName: string;
  email: string;
  content: string;
  daysAgo: number;
  analysis?: {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: 'BUG' | 'FEATURE_REQUEST' | 'BILLING' | 'USABILITY' | 'OTHER';
    summary: string;
    tags: string[];
  };
};

const ROWS: SeedRow[] = [
  {
    customerName: 'Ana Paula',
    email: 'ana@empresa.com',
    content: 'Adorei a nova tela de relatórios, ficou muito mais rápida e fácil de usar. Parabéns à equipe!',
    daysAgo: 0,
    analysis: { sentiment: 'POSITIVE', urgency: 'LOW', category: 'USABILITY', summary: 'Elogio à nova tela de relatórios.', tags: ['elogio', 'relatórios'] },
  },
  {
    customerName: 'Carlos Mendes',
    email: 'carlos@empresa.com',
    content: 'Cobrança duplicada na fatura deste mês. Já paguei o boleto e o valor veio de novo. Quero reembolso hoje.',
    daysAgo: 0,
    analysis: { sentiment: 'NEGATIVE', urgency: 'HIGH', category: 'BILLING', summary: 'Cobrança duplicada e solicitação de reembolso imediato.', tags: ['cobrança', 'reembolso', 'fatura'] },
  },
  {
    customerName: 'João Pedro',
    email: 'joao@empresa.com',
    content: 'O sistema apresenta erro 500 ao gerar o relatório financeiro desde hoje de manhã. Preciso fechar o mês.',
    daysAgo: 1,
    analysis: { sentiment: 'NEGATIVE', urgency: 'CRITICAL', category: 'BUG', summary: 'Erro 500 ao gerar relatórios financeiros.', tags: ['erro 500', 'relatório', 'financeiro'] },
  },
  {
    customerName: 'Mariana Lopes',
    email: 'mariana@empresa.com',
    content: 'Seria ótimo ter exportação em Excel além do PDF. Facilitaria muito meu trabalho mensal.',
    daysAgo: 2,
    analysis: { sentiment: 'NEUTRAL', urgency: 'LOW', category: 'FEATURE_REQUEST', summary: 'Sugestão de exportação em Excel.', tags: ['exportação', 'excel', 'sugestão'] },
  },
  {
    customerName: 'Rafael Souza',
    email: 'rafael@empresa.com',
    content: 'Não consigo fazer login desde ontem, diz senha inválida mesmo após redefinir. Estou parado.',
    daysAgo: 3,
    analysis: { sentiment: 'NEGATIVE', urgency: 'HIGH', category: 'BUG', summary: 'Falha de login após redefinição de senha.', tags: ['login', 'senha', 'acesso'] },
  },
  {
    customerName: 'Fernanda Alves',
    email: 'fernanda@empresa.com',
    content: 'O suporte resolveu meu problema em minutos, atendimento nota dez. Continuem assim!',
    daysAgo: 5,
    analysis: { sentiment: 'POSITIVE', urgency: 'LOW', category: 'OTHER', summary: 'Elogio ao atendimento do suporte.', tags: ['elogio', 'suporte'] },
  },
  {
    customerName: 'Paulo Henrique',
    email: 'paulo@empresa.com',
    content: 'O botão de salvar some em telas pequenas e não consigo concluir o cadastro pelo celular.',
    daysAgo: 7,
    analysis: { sentiment: 'NEGATIVE', urgency: 'MEDIUM', category: 'USABILITY', summary: 'Botão de salvar inacessível no mobile.', tags: ['mobile', 'usabilidade', 'cadastro'] },
  },
  {
    customerName: 'Juliana Castro',
    email: 'juliana@empresa.com',
    content: 'Gostaria de um modo escuro no painel, trabalho muito à noite e a tela clara cansa a vista.',
    daysAgo: 9,
    analysis: { sentiment: 'NEUTRAL', urgency: 'LOW', category: 'FEATURE_REQUEST', summary: 'Pedido de modo escuro no painel.', tags: ['modo escuro', 'sugestão'] },
  },
  {
    customerName: 'Marcos Vinicius',
    email: 'marcos@empresa.com',
    content: 'Fui cobrado por um plano que cancelei há dois meses. Exijo estorno imediato ou abro reclamação.',
    daysAgo: 11,
    analysis: { sentiment: 'NEGATIVE', urgency: 'CRITICAL', category: 'BILLING', summary: 'Cobrança indevida após cancelamento do plano.', tags: ['cobrança', 'cancelamento', 'estorno'] },
  },
  {
    customerName: 'Patricia Gomes',
    email: 'patricia@empresa.com',
    content: 'O dashboard carrega bem e os gráficos ajudam na reunião semanal. Bom trabalho.',
    daysAgo: 13,
    analysis: { sentiment: 'POSITIVE', urgency: 'LOW', category: 'OTHER', summary: 'Elogio ao dashboard e gráficos.', tags: ['elogio', 'dashboard'] },
  },
  {
    customerName: 'Lucas Oliveira',
    email: 'lucas@empresa.com',
    content: 'Acabei de enviar e ainda não sei o status, testando o acompanhamento do chamado em aberto.',
    daysAgo: 0,
  },
];

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function main() {
  await prisma.analysis.deleteMany();
  await prisma.feedback.deleteMany();
  for (const { daysAgo, analysis, ...data } of ROWS) {
    const createdAt = daysAgoDate(daysAgo);
    await prisma.feedback.create({
      data: {
        ...data,
        status: analysis ? 'PROCESSED' : 'PENDING',
        createdAt,
        updatedAt: createdAt,
        ...(analysis ? { analysis: { create: analysis } } : {}),
      },
    });
  }
  console.log(`seed: ${ROWS.length} feedbacks criados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
