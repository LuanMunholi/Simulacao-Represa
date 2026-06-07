# Simulação-Represa

Simulação de uma barragem com painel de monitoramento em tempo real. Stack em
`docker compose`: PostgreSQL, backend (FastAPI), motor de simulação (FastAPI) e
front-end (React/Vite servido por nginx).

## Rodar localmente (um único computador)

Pré-requisito: Docker Desktop instalado e em execução.

```powershell
docker compose up --build
```

Acessos:

| Serviço            | URL                     |
| ------------------ | ----------------------- |
| Front-end (painel) | http://localhost:8080   |
| Backend API        | http://localhost:8000   |
| Simulation Engine  | http://localhost:8001   |

Comandos úteis:

```powershell
docker compose up -d          # sobe em segundo plano
docker compose logs -f        # acompanha logs
docker compose down           # para tudo
docker compose down -v        # para tudo e apaga o volume do banco
```

## Modo apresentação — servidor num notebook, acesso de outro (Opção A)

Cenário: um notebook hospeda a stack completa; outro computador (ex.: notebook ou
PC do laboratório) acessa o painel pelo navegador, na mesma rede — incluindo o
**hotspot de um celular**.

Funciona **sem nenhuma mudança de código**: o front-end conversa com o backend pela
mesma origem (caminhos relativos `/api` e `/ws`, proxiados pelo nginx do próprio
container), então acessar por `http://<IP-do-servidor>:8080` é equivalente a
`localhost`.

### Passo a passo

1. Conecte **os dois computadores** à mesma rede (hotspot do celular, de preferência —
   evita o isolamento de cliente comum em Wi-Fi de universidade). Não precisa de
   internet/dados móveis: o hotspot já cria a rede local.
2. No **notebook-servidor**, rode (de preferência em PowerShell **como Administrador**,
   para a regra de firewall ser criada automaticamente):

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\iniciar-apresentacao.ps1
   ```

   O script libera a porta no firewall, sobe a stack e imprime a **URL de acesso**.
   Use `-Build` após mudanças no código; `-NoStart` para só configurar/mostrar a URL.
3. No **outro computador**, abra a URL mostrada (ex.: `http://192.168.43.5:8080`).

### Configuração manual (equivalente ao script)

```powershell
# 1. Liberar a porta no firewall (PowerShell como Administrador, uma vez)
New-NetFirewallRule -DisplayName "Simulacao-Represa 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow

# 2. Descobrir o IP do notebook-servidor na rede ativa
ipconfig   # use o IPv4 do adaptador conectado ao hotspot

# 3. Subir a stack
docker compose up -d
```

### Solução de problemas

- **Não abre no outro computador:** teste `ping <IP-do-servidor>`. Se não responde,
  é a rede bloqueando (isolamento de cliente) — use o hotspot do celular ou um
  cabo/switch próprio, não o Wi-Fi da instituição.
- **IP mudou:** o endereço é distribuído por DHCP e pode mudar a cada sessão; rode o
  script (ou `ipconfig`) novamente para obter o atual.
- **Porta 8080 ocupada:** altere `FRONTEND_PORT` no `.env` (o script lê esse valor) e
  suba de novo.
