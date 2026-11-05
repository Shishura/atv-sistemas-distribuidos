# Rede de sensores IoT com sockets TCP

Projeto didático em TypeScript e Node.js. Os processos se comunicam usando somente TCP nativo (`node:net`) e mensagens JSON terminadas por quebra de linha (`\n`).

## Instalação

Tenha uma versão recente do Node.js instalada e, na pasta do projeto, execute:

```bash
npm install
```

Para compilar o TypeScript:

```bash
npm run build
```

Os comandos `npm run sensor`, `npm run gateway` e `npm run microservico` executam os arquivos TypeScript diretamente.

## Execução no mesmo computador

Abra terminais separados. Sugestão de ordem:

1. Inicie o microsserviço.
2. Inicie os sensores.
3. Inicie o gateway.

Microsserviço (porta padrão `5000`):

```bash
npm run microservico
```

Dois sensores, escutando nas portas `4001` e `4002`, com leituras a cada 10 segundos por padrão:

```bash
npm run sensor -- --id sensor-1 --host 0.0.0.0 --port 4001
npm run sensor -- --id sensor-2 --host 0.0.0.0 --port 4002
```

Gateway, conectando aos dois sensores e ao microsserviço:

```bash
npm run gateway -- --sensors 127.0.0.1:4001,127.0.0.1:4002 --service 127.0.0.1:5000
```

Para observar o ciclo mais rapidamente, configure sensores para lerem a cada 2 segundos e o gateway para fechar a janela a cada 10 segundos:

```bash
npm run sensor -- --id sensor-1 --port 4001 --interval-ms 2000
npm run sensor -- --id sensor-2 --port 4002 --interval-ms 2000
npm run gateway -- --sensors 127.0.0.1:4001,127.0.0.1:4002 --service 127.0.0.1:5000 --window-ms 10000
```

## Execução em computadores diferentes

Exemplo ilustrativo: sensores nos computadores `192.168.1.10` e `192.168.1.11`; microsserviço no computador `192.168.1.20`; gateway em outro computador da rede.

Nos computadores dos sensores, inicie cada processo para aceitar conexões de rede:

```bash
npm run sensor -- --id sensor-1 --host 0.0.0.0 --port 4001
npm run sensor -- --id sensor-2 --host 0.0.0.0 --port 4002
```

No computador do microsserviço:

```bash
npm run microservico -- --host 0.0.0.0 --port 5000
```

No computador do gateway, use os IPs reais das máquinas que executam os sensores e o microsserviço:

```bash
npm run gateway -- --sensors 192.168.1.10:4001,192.168.1.11:4002 --service 192.168.1.20:5000
```

Substitua os IPs ilustrativos pelos IPs reais da sua rede. `0.0.0.0` é o endereço de escuta dos servidores, para aceitarem conexões pelas interfaces de rede; o gateway precisa se conectar usando o IP real do computador remoto. Talvez seja necessário liberar as portas TCP `4001`, `4002` e `5000` no firewall e usar uma rede local que permita comunicação entre os computadores.

## Opções e padrões

- Sensor: `--id` (padrão `sensor-1`), `--host` (padrão `0.0.0.0`), `--port` (padrão `4001`) e `--interval-ms` (padrão `10000`).
- Gateway: `--sensors` (lista separada por vírgula, padrão `127.0.0.1:4001,127.0.0.1:4002`), `--service` (padrão `127.0.0.1:5000`) e `--window-ms` (padrão `60000`).
- Microsserviço: `--host` (padrão `0.0.0.0`) e `--port` (padrão `5000`).

O fluxo é: **sensores → gateway → lote por janela → microsserviço → médias → histórico do gateway**. Cada gateway mantém seu próprio buffer, lotes pendentes e histórico em arrays na RAM. Esses dados se perdem se o gateway for reiniciado.

Para executar um segundo gateway, abra outro terminal e use o mesmo comando de gateway com os mesmos endereços. O sensor envia cada leitura a todos os gateways conectados, e cada instância mantém suas próprias janelas e histórico. Novos gateways podem se conectar sem reiniciar os sensores.
