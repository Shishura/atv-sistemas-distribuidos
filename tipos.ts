import type { Socket } from 'node:net';

export interface Leitura {
  sensorId: string;
  timestamp: string;
  temperaturaC: number;
  umidadePercentual: number;
  chuvaMmPorHora: number;
}

export interface LoteLeituras {
  tipo: 'lote';
  inicioJanela: string;
  fimJanela: string;
  leituras: Leitura[];
}

export interface ResultadoMedias {
  tipo: 'medias';
  quantidadeLeituras: number;
  temperaturaMediaC: number;
  umidadeMediaPercentual: number;
  chuvaMediaMmPorHora: number;
  inicioJanela: string;
  fimJanela: string;
}

/** Divide o fluxo TCP em linhas, mesmo quando os dados chegam fragmentados. */
export function aoReceberLinhas(socket: Socket, aoLer: (linha: string) => void): void {
  let restante = '';
  socket.setEncoding('utf8');
  socket.on('data', (trecho: string) => {
    restante += trecho;
    const linhas = restante.split('\n');
    restante = linhas.pop() ?? '';
    for (const linha of linhas) {
      if (linha.trim()) aoLer(linha.trim());
    }
  });
}

export function opcoes(args: string[]): Map<string, string> {
  const valores = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) valores.set(arg.slice(2), args[i + 1] ?? '');
  }
  return valores;
}

export function numeroOpcao(args: Map<string, string>, chave: string, padrao: number): number {
  const valor = Number(args.get(chave));
  return args.has(chave) && Number.isFinite(valor) && valor > 0 ? valor : padrao;
}
