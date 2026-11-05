# Sistemas Distribuídos — versões do projeto

Projeto acadêmico de simulação de uma rede de sensores IoT com gateway e microsserviço de cálculo de médias. As versões ficam em pastas próprias para que a implementação atual seja preservada enquanto uma próxima atividade é desenvolvida separadamente.

| Pasta | Objetivo | Estado |
| --- | --- | --- |
| [`v1/`](v1/README.md) | Simulação com sensores, gateway e microsserviço usando sockets TCP. | Implementada; leituras, lotes pendentes e histórico ficam em memória RAM. |
| `v2/` | Espaço reservado para a próxima atividade. | Vazia por enquanto. |

## Executar a v1

Entre na pasta `v1`, instale as dependências e compile:

```bash
cd v1
npm install
npm run build
```

Consulte [`v1/README.md`](v1/README.md) para os comandos completos de execução, os parâmetros e o exemplo em rede local. Para iniciar microsserviço, sensores e gateway, use terminais separados, todos dentro de `v1/`.

Cada versão terá seu próprio código, `package.json`, arquivo de lock, configuração TypeScript e README. O diretório `v2/` será preenchido quando essa atividade começar. Os dados da v1 existem apenas durante a execução e se perdem quando o gateway é encerrado.
