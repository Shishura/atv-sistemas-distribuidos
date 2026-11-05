import net from 'node:net';
import { aoReceberLinhas, numeroOpcao, opcoes, type Leitura } from './tipos';

const args = opcoes(process.argv.slice(2));
const id = args.get('id') ?? 'sensor-1';
const host = args.get('host') ?? '0.0.0.0';
const porta = numeroOpcao(args, 'port', 4001);
const intervaloMs = numeroOpcao(args, 'interval-ms', 10_000);
const gateways = new Set<net.Socket>();

const servidor = net.createServer((socket) => {
  gateways.add(socket);
  console.log(`Gateway conectado: ${socket.remoteAddress}:${socket.remotePort}`);
  aoReceberLinhas(socket, (linha) => console.log(`Mensagem do gateway: ${linha}`));
  socket.on('close', () => {
    gateways.delete(socket);
    console.log(`Gateway desconectado. Conexões ativas: ${gateways.size}`);
  });
  socket.on('error', (erro) => console.error('Erro na conexão com gateway:', erro.message));
});

function aleatorio(min: number, max: number, casas = 1): number {
  const escala = 10 ** casas;
  return Math.round((min + Math.random() * (max - min)) * escala) / escala;
}

function medir(): Leitura {
  return {
    sensorId: id,
    timestamp: new Date().toISOString(),
    temperaturaC: aleatorio(15, 35),
    umidadePercentual: aleatorio(30, 95),
    chuvaMmPorHora: aleatorio(0, 20),
  };
}

setInterval(() => {
  const leitura = medir();
  console.log('Leitura:', leitura);
  const mensagem = `${JSON.stringify(leitura)}\n`;
  for (const gateway of gateways) {
    if (!gateway.destroyed) gateway.write(mensagem);
  }
}, intervaloMs);

servidor.on('error', (erro) => console.error('Erro no servidor do sensor:', erro.message));
servidor.listen(porta, host, () => console.log(`${id} escutando em ${host}:${porta}; intervalo ${intervaloMs} ms`));
