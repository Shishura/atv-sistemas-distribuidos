import net from 'node:net';
import { aoReceberLinhas, numeroOpcao, opcoes, type LoteLeituras } from './tipos';

const args = opcoes(process.argv.slice(2));
const host = args.get('host') ?? '0.0.0.0';
const porta = numeroOpcao(args, 'port', 5000);

const servidor = net.createServer((socket) => {
  console.log(`Gateway conectado: ${socket.remoteAddress}:${socket.remotePort}`);
  aoReceberLinhas(socket, (linha) => {
    try {
      const lote = JSON.parse(linha) as LoteLeituras;
      if (lote.tipo !== 'lote' || !Array.isArray(lote.leituras) || lote.leituras.length === 0) {
        throw new Error('lote vazio ou formato inválido');
      }
      const leituras = lote.leituras;
      const campos = ['temperaturaC', 'umidadePercentual', 'chuvaMmPorHora'] as const;
      if (leituras.some((leitura) => campos.some((campo) => typeof leitura[campo] !== 'number' || !Number.isFinite(leitura[campo])))) {
        throw new Error('o lote contém valores que não são números');
      }
      const media = (campo: typeof campos[number]) =>
        leituras.reduce((soma, leitura) => soma + leitura[campo], 0) / leituras.length;
      const resultado = {
        tipo: 'medias' as const,
        quantidadeLeituras: leituras.length,
        temperaturaMediaC: media('temperaturaC'),
        umidadeMediaPercentual: media('umidadePercentual'),
        chuvaMediaMmPorHora: media('chuvaMmPorHora'),
        inicioJanela: lote.inicioJanela,
        fimJanela: lote.fimJanela,
      };
      console.log(`Lote recebido: ${leituras.length} leituras`, resultado);
      socket.write(`${JSON.stringify(resultado)}\n`);
    } catch (erro) {
      console.error('Não foi possível calcular o lote:', erro instanceof Error ? erro.message : erro);
      socket.end(`${JSON.stringify({ tipo: 'erro', mensagem: erro instanceof Error ? erro.message : 'erro no lote' })}\n`);
    }
  });
  socket.on('error', (erro) => console.error('Erro na conexão com gateway:', erro.message));
  socket.on('close', () => console.log('Conexão com gateway encerrada.'));
});

servidor.on('error', (erro) => console.error('Erro no servidor do microsserviço:', erro.message));
servidor.listen(porta, host, () => console.log(`Microsserviço escutando em ${host}:${porta}`));
