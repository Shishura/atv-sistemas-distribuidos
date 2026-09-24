import net from 'node:net';
import { aoReceberLinhas, numeroOpcao, opcoes, type Leitura, type LoteLeituras, type ResultadoMedias } from './tipos';

const args = opcoes(process.argv.slice(2));
const sensores = (args.get('sensors') ?? '127.0.0.1:4001,127.0.0.1:4002')
  .split(',').map((item) => item.trim()).filter(Boolean);
const microsservico = args.get('service') ?? '127.0.0.1:5000';
const intervaloJanelaMs = numeroOpcao(args, 'window-ms', 60_000);
const buffer: Leitura[] = [];
const pendentes: LoteLeituras[] = [];
const historico: ResultadoMedias[] = [];
let inicioJanela = new Date().toISOString();
let processando = false;

function endereco(valor: string): { host: string; port: number } {
  const separador = valor.lastIndexOf(':');
  if (separador < 1) throw new Error(`Endereço inválido: ${valor}; use IP:porta`);
  return { host: valor.slice(0, separador), port: Number(valor.slice(separador + 1)) };
}

function conectarSensor(destino: string): void {
  let endpoint: ReturnType<typeof endereco>;
  try { endpoint = endereco(destino); } catch (erro) {
    console.error(erro);
    return;
  }
  const socket = net.createConnection(endpoint);
  let reconectarAgendado = false;
  socket.on('connect', () => console.log(`Conectado ao sensor ${destino}`));
  aoReceberLinhas(socket, (linha) => {
    try {
      const leitura = JSON.parse(linha) as Leitura;
      if (typeof leitura.sensorId !== 'string' || typeof leitura.temperaturaC !== 'number' ||
          typeof leitura.umidadePercentual !== 'number' || typeof leitura.chuvaMmPorHora !== 'number') {
        throw new Error('formato de leitura inválido');
      }
      buffer.push(leitura);
      console.log('Leitura recebida:', leitura);
    } catch (erro) {
      console.error('Leitura inválida:', erro instanceof Error ? erro.message : erro);
    }
  });
  socket.on('error', (erro) => {
    console.error(`Erro na conexão com sensor ${destino}:`, erro.message);
    if (!reconectarAgendado) {
      reconectarAgendado = true;
      setTimeout(() => conectarSensor(destino), 3000);
    }
  });
  socket.on('close', () => {
    console.log(`Sensor desconectado: ${destino}; nova tentativa em 3 segundos`);
    if (!reconectarAgendado) setTimeout(() => conectarSensor(destino), 3000);
  });
}

function enviarLote(lote: LoteLeituras): Promise<ResultadoMedias> {
  return new Promise((resolve, reject) => {
    let concluido = false;
    const socket = net.createConnection(endereco(microsservico));
    const falhar = (erro: Error) => {
      if (concluido) return;
      concluido = true;
      socket.destroy();
      reject(erro);
    };
    
    socket.setTimeout(10000,() =>{
      falhar(new Error('tempo limite de resposta do microsserviço atingido'));
    })


    socket.on('connect', () => socket.write(`${JSON.stringify(lote)}\n`));
    aoReceberLinhas(socket, (linha) => {
      if (concluido) return;
      try {
        const resposta = JSON.parse(linha) as ResultadoMedias;
        if (resposta.tipo !== 'medias') throw new Error('resposta de erro ou formato inesperado');
        concluido = true;
        socket.end();
        resolve(resposta);
      } catch (erro) {
        falhar(erro instanceof Error ? erro : new Error(String(erro)));
      }
    });
    socket.on('error', (erro) => falhar(erro));
    socket.on('close', () => {
      if (!concluido) falhar(new Error('conexão encerrada antes da resposta'));
    });
  });
}

async function processarPendentes(): Promise<void> {
  if (processando || pendentes.length === 0) return;
  processando = true;
  const lote = pendentes[0];
  console.log(`Enviando lote com ${lote.leituras.length} leituras ao microsserviço`);
  try {
    const resultado = await enviarLote(lote);
    historico.push(resultado);
    pendentes.shift();
    console.log('Médias recebidas:', resultado);
    console.log(`Resultados no histórico: ${historico.length}`);
  } catch (erro) {
    console.error('Falha ao enviar/receber lote; ele continua pendente para nova tentativa:', erro);
  } finally {
    processando = false;
    if (pendentes.length > 0) setTimeout(() => void processarPendentes(), 3000);
  }
}

for (const sensor of sensores) conectarSensor(sensor);
setInterval(() => {
  const fimJanela = new Date().toISOString();
  if (buffer.length > 0) {
    pendentes.push({ tipo: 'lote', inicioJanela, fimJanela, leituras: buffer.splice(0, buffer.length) });
    console.log(`Janela fechada: ${pendentes[pendentes.length - 1].leituras.length} leituras no lote`);
    void processarPendentes();
  }
  inicioJanela = fimJanela;
}, intervaloJanelaMs);

console.log(`Gateway iniciado; sensores: ${sensores.join(', ')}; microsserviço: ${microsservico}; janela: ${intervaloJanelaMs} ms`);
