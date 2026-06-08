# Simulação-Represa

Simulação de uma barragem com painel de monitoramento em tempo real. Stack em
`docker compose`: PostgreSQL, backend (FastAPI), motor de simulação (FastAPI) e
front-end (React/Vite servido por nginx).

### Passo a passo

1. Conecte **os dois computadores** à mesma rede.
   
2. No **notebook-servidor**, rode (de preferência em PowerShell **como Administrador**,
   para a regra de firewall ser criada automaticamente):

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\iniciar-apresentacao.ps1
   ```

   O script libera a porta no firewall, sobe a stack e imprime a **URL de acesso**.
   Use `-Build` após mudanças no código; `-NoStart` para só configurar/mostrar a URL.
   
3. No **outro computador**, abra a URL mostrada (ex.: `http://192.168.43.5:8080`).

Pré-requisito: Docker Desktop instalado e em execução.

Acessos:

| Serviço            | URL                     |
| ------------------ | ----------------------- |
| Front-end (painel) | http://localhost:8080   |
| Backend API        | http://localhost:8000   |
| Simulation Engine  | http://localhost:8001   |

Comandos úteis:

```powershell
docker compose logs -f        # acompanha logs
docker compose down           # para tudo
docker compose down -v        # para tudo e apaga o volume do banco
```