# XRSC07 - SLA, Grupo 12

**Disciplina:** Computação em Nuvem — XRSC07  
**Professor:** Bruno Guazzelli Batista  
**Grupo:** 12

---

## Fase 1 — Infraestrutura

### 1a — Estrutura de diretórios

- [ ] **1.1** Criar diretório raiz do projeto e os subdiretórios: `simulation-engine/`, `backend-api/`, `frontend/`, `postgres/`
- [ ] **1.2** Criar `simulation-engine/src/` e `simulation-engine/tests/`
- [ ] **1.3** Criar `backend-api/src/` e `backend-api/tests/`
- [ ] **1.4** Criar `frontend/src/` com subdirs `components/`, `hooks/`, `store/`, `pages/`
- [ ] **1.5** Criar `postgres/init/` para scripts SQL de inicialização

### 1b — Arquivos de configuração base

- [ ] **1.6** Criar `.env` na raiz com: `DATABASE_URL`, `ENGINE_PORT`, `API_PORT`, `FRONTEND_PORT`, `ENGINE_INTERNAL_URL`, `API_INTERNAL_URL`
- [ ] **1.7** Criar `simulation-engine/Dockerfile`: imagem Python 3.12-slim, instala `requirements.txt`, expõe porta do engine
- [ ] **1.8** Criar `backend-api/Dockerfile`: imagem Python 3.12-slim, instala `requirements.txt`, expõe porta da API
- [ ] **1.9** Criar `frontend/Dockerfile`: build em Node 20-alpine (estágio build) + nginx-alpine (estágio serve)
- [ ] **1.10** Criar `frontend/nginx.conf`: serve arquivos estáticos, proxy `/api` e `/ws` para backend-api

### 1c — Docker Compose

- [ ] **1.11** Criar `docker-compose.yml` com os 4 serviços: `simulation-engine`, `backend-api`, `postgres`, `frontend`; definir `depends_on`, `restart: unless-stopped`, rede compartilhada, mapeamento de portas via `.env`
- [ ] **1.12** Validar que `docker compose up --build` sobe todos os containers sem erro; testar `docker compose restart` e verificar que todos reiniciam corretamente

---

## Fase 2 — Banco de Dados

### 2a — Configuração do Alembic

- [ ] **2.1** Criar `backend-api/requirements.txt` com: `fastapi`, `uvicorn`, `sqlalchemy`, `asyncpg`, `alembic`, `apscheduler`, `pydantic`, `httpx`
- [ ] **2.2** Inicializar Alembic em `backend-api/`: `alembic init alembic`; configurar `alembic.ini` e `env.py` para ler `DATABASE_URL` do ambiente

### 2b — Modelos SQLAlchemy

- [ ] **2.3** Criar `backend-api/src/models.py` com modelo `SimulationState`: colunas `id` (PK), `simulated_hours` (int), `fator_aceleracao` (float), `paused` (bool), `rain_series` (JSON), `created_at`, `updated_at`
- [ ] **2.4** Adicionar modelo `SensorReading`: colunas `id` (PK), `simulated_timestamp` (int, horas), `sensor_id` (str), `valor` (float), `unidade` (str)
- [ ] **2.5** Adicionar modelo `AlertHistory`: colunas `id` (PK), `simulated_timestamp` (int), `tipo` (str: `risco` | `previsao`, sem diacríticos para alinhar com o enum do API-Contract), `severidade` (str), `mensagem` (str), `leituras` (JSON)

### 2c — Migration e índices

- [ ] **2.6** Gerar migration Alembic para as 3 tabelas; revisar SQL gerado
- [ ] **2.7** Adicionar índice composto em `sensor_readings(sensor_id, simulated_timestamp)` na migration
- [ ] **2.8** Aplicar migration no container postgres e verificar tabelas com `psql`

---

## Fase 3 — Simulation Engine

### 3a — Estrutura base e estado interno

- [ ] **3.1** Criar `simulation-engine/requirements.txt` com: `apscheduler`, `httpx`, `fastapi`, `uvicorn`, `pydantic`
- [ ] **3.2** Criar `simulation-engine/src/state.py`: classe `EngineState` com todos os campos de estado — `simulated_hours` (int), `fator_aceleracao` (float), `paused` (bool), `paused_reason` (str | None: `"manual"` | `"previsao_critica"`), `rain_series` (lista de 364 floats — uma entrada por dia), `rain_series_original` (lista de 364 floats — backup para restauração após cenários), `comporta_01..04` (float, %), `sensor_turbina_01` (str: `"LIGADO"` | `"DESLIGADO"`, controlado externamente — não derivado), `sensor_chuva_01`, `sensor_chuva_02`, `chuva_window` (deque maxlen=720), `capacidade_atual`, `sensor_enchimento_01`, `sensor_fluxo_01`, `sensor_fluxo_02`, `sensor_esvaziamento_01`, `sensor_energia_01`, `sensor_volume_01`, `sensor_volume_02`. Observação: o índice do dia da série de chuva é derivado de `simulated_hours // 24`, não armazenado em campo próprio.
- [ ] **3.3** Criar `simulation-engine/src/config.py`: URL do backend-api, porta do engine, valor padrão de `fator_aceleracao` (1.0)

### 3b — Geração de série de chuva

- [ ] **3.4** Criar `simulation-engine/src/rain.py`: função `generate_rain_series() -> list[float]` que para cada uma das 52 semanas sorteia aleatoriamente uma das 4 tendências e gera 7 valores diários conforme as regras de cada tendência:
  - `sem_chuva`: cada dia tem 80% de chance de 0 mm/h e 20% de chance de exatamente 1 mm/h
  - `pouca_chuva`: cada dia gera valor aleatório uniforme entre 1–5 mm/h
  - `chuva_constante`: cada dia gera valor aleatório uniforme entre 5–10 mm/h
  - `chuvas_intensas`: cada dia gera valor aleatório uniforme entre 10–50 mm/h
  - Retorna lista de exatamente 364 floats (52 × 7)
- [ ] **3.5** Escrever teste unitário para `generate_rain_series`: verificar que retorna exatamente 364 valores, todos ≥ 0

### 3c — Pipeline de sensores

- [ ] **3.6** Criar `simulation-engine/src/sensors.py`: função `compute_tick(state: EngineState) -> EngineState` que executa o pipeline completo na ordem de dependência:
  1. `dia_atual = state.simulated_hours // 24`; `sensor_chuva_01 = rain_series[dia_atual % 364]` — indexação **por dia simulado** (não por tick). `simulated_hours` é lido antes do incremento (feito por `simulation_tick` após `compute_tick`), portanto: ticks 0–23 leem `rain_series[0]`, ticks 24–47 leem `rain_series[1]`, etc. A série tem 364 entradas diárias e cicla a cada ano simulado.
  2. Adicionar `sensor_chuva_01 × 1h` à `chuva_window`; `sensor_chuva_02 = sum(chuva_window)`
  3. `capacidade_atual = min(200, max(10, (sensor_chuva_02 / 10) × 200))`
  4. `sensor_enchimento_01 = (comporta_01 / 100) × capacidade_atual`
  5. `sensor_fluxo_01 = (comporta_02 / 100) × 200`
  6. `sensor_fluxo_02 = min((comporta_03 / 100) × 200, sensor_fluxo_01)`
  7. `sensor_esvaziamento_01 = (comporta_04 / 100) × 200`
  8. `sensor_energia_01 = sensor_fluxo_01 × 50 if state.sensor_turbina_01 == "LIGADO" else 0` — o estado da turbina é **controlado externamente** (startup, `/engine/adjust`, ou algoritmo de ajuste do backend). `compute_tick` **não** modifica `state.sensor_turbina_01` — apenas lê o valor atual para calcular a energia.
  9. `contribuicao_chuva = sensor_chuva_01`; `taxa_liquida_v1 = sensor_enchimento_01 + contribuicao_chuva − sensor_fluxo_01`; `delta_v1 = taxa_liquida_v1 × 1`; `sensor_volume_01 = clamp(sensor_volume_01 + delta_v1 / 100, 0, 100)`
  10. `taxa_liquida_v2 = sensor_fluxo_02 + contribuicao_chuva − sensor_esvaziamento_01`; `delta_v2 = taxa_liquida_v2 × 1`; `sensor_volume_02 = clamp(sensor_volume_02 + delta_v2 / 100, 0, 100)`
- [ ] **3.7** Escrever testes unitários para `compute_tick`: (a) com comportas todas em 0% — volumes não mudam; (b) com enchimento > fluxo — volume_01 sobe; (c) volume em 100% com entrada positiva — permanece em 100% (clamp); (d) `state.sensor_turbina_01` **não é modificado** por `compute_tick` (com qualquer combinação de comportas); (e) `sensor_energia_01` reflete o estado externo da turbina — 0 quando `sensor_turbina_01 = "DESLIGADO"`, `fluxo_01 × 50` quando `"LIGADO"`; (f) indexação da chuva por dia — em 25 ticks consecutivos sem mudança de série, `sensor_chuva_01` muda exatamente uma vez (do dia 0 para o dia 1 ao chegar em `simulated_hours = 24`)

### 3d — Startup e cenários

- [ ] **3.8** Criar `simulation-engine/src/startup.py`: função assíncrona `run_startup_sequence(state)` que executa a sequência da Seção 9:
  - Abrir `comporta_01` progressivamente até `sensor_volume_01 ≥ 90%`
  - Abrir `comporta_02` e `comporta_03` progressivamente **e** setar `state.sensor_turbina_01 = "LIGADO"` simultaneamente; aguardar `sensor_volume_02 ≥ 90%`
  - Ajustar comportas para manter ~90% em ambos; preservar `sensor_turbina_01 = "LIGADO"` enquanto `comporta_02 > 0` e `comporta_03 > 0` (caso o ajuste feche alguma dessas comportas, setar `sensor_turbina_01 = "DESLIGADO"` para manter o invariante operacional)
- [ ] **3.9** Criar `simulation-engine/src/scenarios.py`: função `apply_scenario(state, tipo: str, duracao_dias: int)` que sobrescreve **as próximas `duracao_dias` entradas diárias** da `rain_series` (começando pelo dia atual `state.simulated_hours // 24`) — chuva intensa: 20 mm/h fixo em cada entrada; seca: 0 mm/h fixo em cada entrada. Antes de sobrescrever, copiar os valores originais para `state.rain_series_original` (ou estrutura equivalente); ao fim do período (controlado via `scenario_active`/`scenario_ticks_remaining` no estado), restaurar as entradas originais. A indexação continua sendo por dia (ver tarefa 3.6 passo 1), portanto a sobrescrita afeta naturalmente todos os ticks daquele dia simulado.

### 3e — API HTTP do engine (comandos vindos do backend)

- [ ] **3.10** Criar `simulation-engine/src/api.py`: aplicação FastAPI com os endpoints:
  - `POST /engine/pause` body `{"reason": "manual" | "previsao_critica"}` — seta `state.paused = True` e `state.paused_reason = reason`; idempotente quando já pausado (preserva o `paused_reason` anterior)
  - `POST /engine/resume` — seta `state.paused = False` e `state.paused_reason = None`
  - `POST /engine/speed` body `{"fator": float}` — atualiza `fator_aceleracao`; reescalona job APScheduler
  - `POST /engine/scenario` body `{"tipo": str, "duracao_dias": int}` — chama `apply_scenario`
  - `POST /engine/adjust` body `{"comporta_01": float, ..., "comporta_04": float, "turbina": "LIGADO" | "DESLIGADO"}` — aplica novos valores de comportas **e** do estado da turbina ao estado
  - `POST /engine/start` — dispara `run_startup_sequence` em background task
- [ ] **3.11** Adicionar ao FastAPI do engine um `lifespan` que inicia o APScheduler e o loop de simulação na startup

### 3f — Loop de simulação

- [ ] **3.12** Criar `simulation-engine/src/loop.py`: configurar APScheduler com `BackgroundScheduler`; job `simulation_tick` com intervalo inicial `1.0 / fator_aceleracao`
- [ ] **3.13** Implementar `simulation_tick`: verificar `state.paused`; se não pausado — chamar `compute_tick(state)`; incrementar `simulated_hours`; fazer POST para `{API_URL}/internal/tick` com payload JSON do estado completo; tratar falhas de rede com retry simples (3 tentativas)
- [ ] **3.14** Implementar reescalonamento do job: ao receber novo `fator_aceleracao` via `/engine/speed`, remover job atual e adicionar novo com `interval = 1.0 / novo_fator`
- [ ] **3.15** Criar `simulation-engine/src/main.py`: ponto de entrada que inicializa `EngineState`, inicia FastAPI com uvicorn
- [ ] **3.16** Testar manualmente: subir engine isolado, verificar que o loop dispara na frequência correta para fator=1, fator=10, fator=0.5

---

## Fase 4 — Backend API

### 4a — Estrutura base e state cache

- [ ] **4.1** Criar `backend-api/src/state_cache.py`: objeto `StateCache` singleton com campos `last_tick: dict | None`, `simulated_hours: int`, `paused: bool`, `paused_reason: str | None` (`"manual"` | `"previsao_critica"` | `None`), `fator_aceleracao: float`; thread-safe com `asyncio.Lock`
- [ ] **4.2** Criar `backend-api/src/db.py`: configurar SQLAlchemy async engine com `asyncpg`; criar `AsyncSessionLocal`; função `get_db()` como dependency

### 4b — Endpoint interno e loop de display

- [ ] **4.3** Criar `backend-api/src/routers/internal.py`: `POST /internal/tick` — recebe payload JSON do engine; atualiza `StateCache`; retorna 200 OK imediatamente
- [ ] **4.4** Criar `backend-api/src/scheduler.py`: APScheduler com job `display_tick` a 1 Hz
- [ ] **4.5** Implementar `display_tick`: ler `StateCache`; persistir leituras em `sensor_readings` (uma linha por sensor); executar motor de riscos (Fase 5); executar previsão (Fase 5); enviar broadcast WebSocket com estado completo + alertas ativos

### 4c — Endpoints REST públicos

- [ ] **4.6** Criar `backend-api/src/routers/simulation.py`:
  - `GET /state` — retorna `StateCache` + último `SimulationState` do banco
  - `POST /simulation/start` — POST para `{ENGINE_URL}/engine/start`; retorna 202
  - `POST /simulation/pause` — POST para `{ENGINE_URL}/engine/pause` com `{"reason": "manual"}`; idempotente — se já pausado, apenas confirma; retorna 200 com `{"ok": true, "paused_reason": <reason em vigor>}`
  - `POST /simulation/resume` — valida `state_cache.paused_reason`: se `"manual"` (ou não pausado), POST para `{ENGINE_URL}/engine/resume` e retorna 200; se `"previsao_critica"`, retorna 409 com mensagem orientando o uso de `/simulation/adjust`
  - `POST /simulation/speed` body `{"fator": float}` — valida range (0.1–100); POST para `/engine/speed`; retorna 200
  - `POST /simulation/scenario` body `{"tipo": str, "duracao_dias": int}` — POST para `/engine/scenario`; retorna 202
  - `POST /simulation/adjust` — calcula novos valores de comportas **e** do estado da turbina (lógica da Fase 5); POST para `/engine/adjust` com os 4 valores de comporta + `turbina`; POST para `/engine/resume` se pausado (independente do motivo); retorna 200 com `ajuste_aplicado` incluindo o campo `turbina`
- [ ] **4.7** Criar `backend-api/src/routers/history.py`:
  - `GET /history/alerts?page=1&per_page=50` — query paginada em `alert_history`, ordenada por `simulated_timestamp DESC`
  - `GET /history/sensors/{sensor_id}?horas=720` — retorna últimas N leituras do sensor_id ordenadas por timestamp

### 4d — WebSocket

- [ ] **4.8** Criar `backend-api/src/websocket.py`: gerenciador de conexões `ConnectionManager` com `connect`, `disconnect`, `broadcast(data: dict)`; usar `asyncio.Lock` na lista de conexões
- [ ] **4.9** Criar endpoint `GET /ws` (WebSocket): ao conectar, adicionar ao `ConnectionManager`; ao desconectar (ou erro), remover; aguardar mensagens do cliente (pode ser ignorar ou tratar ping)
- [ ] **4.10** No `display_tick`, chamar `await manager.broadcast(payload)` com o estado completo serializado como JSON

### 4e — Aplicação principal

- [ ] **4.11** Criar `backend-api/src/main.py`: instanciar FastAPI com `lifespan` que inicia o scheduler; incluir todos os routers; configurar CORS para aceitar origem do frontend
- [ ] **4.12** Testar manualmente: subir stack completa (engine + api + postgres); verificar que `/state` retorna dados, WebSocket recebe atualizações a 1 Hz

---

## Fase 5 — Motor de Riscos + Previsão de Limite

### 5a — Motor de riscos

- [ ] **5.1** Criar `backend-api/src/risk_engine.py`: função `evaluate_risks(sensors: dict) -> list[RiskAlert]` que avalia as 10 regras da Seção 6 das Specs:
  - `RISCO_01` (ALTA): `sensor_volume_01 > 90%` E `(sensor_enchimento_01 + contribuicao_chuva) > sensor_fluxo_01`
  - `RISCO_02` (MEDIA): `sensor_volume_01 < 20%` E `sensor_fluxo_01 > sensor_enchimento_01`
  - `RISCO_03` (BAIXA): `sensor_volume_01 < 20%` E `sensor_enchimento_01 = 0` E `sensor_comporta_01 = 0%`
  - `RISCO_04` (ALTA): `sensor_volume_02 > 90%` E `sensor_fluxo_02 > sensor_esvaziamento_01`
  - `RISCO_05` (MEDIA): `sensor_volume_02 < 20%` E `sensor_esvaziamento_01 > sensor_fluxo_02`
  - `RISCO_06` (MEDIA): `sensor_comporta_02 ≠ sensor_comporta_03`
  - `RISCO_07` (CRITICA): `sensor_comporta_02 > sensor_comporta_03`
  - `RISCO_08` (ALTA): `sensor_turbina_01 = "DESLIGADO"` E `sensor_comporta_02 > 0%` E `sensor_comporta_03 > 0%`
  - `RISCO_09` (CRITICA): `sensor_turbina_01 = "LIGADO"` E `sensor_fluxo_01 = 0`
  - `RISCO_10` (BAIXA): `|sensor_volume_01 − sensor_volume_02| ≥ 20%`
- [ ] **5.2** Criar `backend-api/src/risk_models.py`: dataclass `RiskAlert` com campos `codigo` (str: `RISCO_01`…`RISCO_10`), `severidade` (str: `RiskSeverity` — `BAIXA` / `MEDIA` / `ALTA` / `CRITICA`), `mensagem` (str), `sensores` (dict: sensor_id → valor float)
- [ ] **5.3** Implementar `aggregate_alert_level(alerts: list[RiskAlert]) -> str`: conta riscos ativos — 0 → `"VERDE"`, 1 → `"AMARELO"`, 2 → `"LARANJA"`, 3+ → `"VERMELHO"`
- [ ] **5.4** Implementar geração de mensagens conforme Seção 7: template por código de risco com valores interpolados dos sensores
- [ ] **5.5** Escrever testes unitários para `evaluate_risks`: um caso por regra, incluindo casos de borda (exatamente no limiar vs. 1 unidade abaixo)

### 5b — Mecanismo de previsão

- [ ] **5.6** Criar `backend-api/src/prediction.py`: função `compute_predictions(sensors: dict) -> list[Prediction]`:
  - Para tanque 1: `taxa_liquida_v1 = sensor_enchimento_01 + contribuicao_chuva − sensor_fluxo_01`
    - Se `> 0` (enchendo): `tempo_overflow = (100 − volume_01) × 100 / taxa_liquida_v1` horas
    - Se `< 0` (esvaziando): `tempo_vazio = volume_01 × 100 / abs(taxa_liquida_v1)` horas
  - Para tanque 2: `taxa_liquida_v2 = sensor_fluxo_02 + contribuicao_chuva − sensor_esvaziamento_01`; mesma lógica de overflow/vazio
  - Classificar: `tempo < 24h` → `"CRITICO"` (pausa engine); `24h ≤ tempo < 48h` → `"ALERTA"`; taxa = 0 → sem previsão
- [ ] **5.7** Criar `backend-api/src/prediction_models.py`: dataclass `Prediction` com `tanque`, `tipo` (overflow/vazio), `tempo_horas` (float), `severidade` (ALERTA/CRÍTICO)
- [ ] **5.8** No `display_tick`: se alguma previsão for CRÍTICO, fazer POST para `{ENGINE_URL}/engine/pause` com `{"reason": "previsao_critica"}` e salvar alerta em `alert_history`
- [ ] **5.9** Escrever testes unitários para `compute_predictions`: (a) taxa positiva com volume em 50% → tempo correto; (b) taxa zero → sem previsão; (c) tempo < 24h → CRÍTICO

### 5c — Algoritmo de ajuste automático de comportas

- [ ] **5.10** Criar `backend-api/src/adjustment.py`: função `compute_adjustment(sensors: dict) -> dict` que calcula novos valores de comportas **e** do estado da turbina:
  - Objetivo: levar `sensor_volume_01` e `sensor_volume_02` a 90%
  - Para tanque 1: resolver `sensor_enchimento_01 = sensor_fluxo_01` com margem; ajustar `comporta_01` e/ou `comporta_02`
  - Para tanque 2: ajustar `comporta_03` e `comporta_04` para que `sensor_fluxo_02 ≈ sensor_esvaziamento_01`
  - Restrição: `comporta_02 ≤ comporta_03`; clamp todos entre 0–100%
  - Após calcular as comportas, definir `turbina`: `"LIGADO"` se `comporta_02 > 0` E `comporta_03 > 0`; caso contrário `"DESLIGADO"` — mantém o invariante operacional dos Riscos 8 e 9 (turbina ligada sse comportas internas abertas)
  - Retorna dict `{"comporta_01": v, "comporta_02": v, "comporta_03": v, "comporta_04": v, "turbina": "LIGADO" | "DESLIGADO"}`
- [ ] **5.11** Escrever teste para `compute_adjustment`: aplicar resultado a `compute_tick` e verificar que taxa_líquida ≈ 0 para ambos os tanques
- [ ] **5.12** Integrar `compute_adjustment` no endpoint `POST /simulation/adjust` (Fase 4, tarefa 4.6)

### 5d — Persistência de alertas

- [ ] **5.13** No `display_tick`: salvar em `alert_history` apenas quando há mudança de nível de alerta ou novas previsões CRÍTICO/ALERTA (evitar inserções redundantes)
- [ ] **5.14** Validar que `GET /history/alerts` retorna alertas ordenados e paginados corretamente

---

## Fase 6 — Frontend 1 (Painel de Monitoramento)

### 6a — Setup do projeto React

- [ ] **6.1** Criar projeto com `npm create vite@latest frontend -- --template react-ts`; instalar dependências: `recharts`, `tailwindcss`, `zustand`, `@types/react`
- [ ] **6.2** Configurar Tailwind CSS: `tailwind.config.ts`, `postcss.config.ts`, importar no `index.css`
- [ ] **6.3** Criar `src/store/simulationStore.ts` com Zustand: estado `sensors`, `alertLevel`, `activeRisks`, `predictions`, `simulatedHours`, `paused`, `fatorAceleracao`; actions `updateFromWs(payload)`

### 6b — Conexão WebSocket

- [ ] **6.4** Criar `src/hooks/useWebSocket.ts`: conectar ao `ws://{host}/ws`; ao receber mensagem, parsear JSON e chamar `updateFromWs`; reconectar automaticamente com backoff exponencial (1s, 2s, 4s, max 30s) em caso de desconexão
- [ ] **6.5** Chamar `useWebSocket` no componente raiz `App.tsx`; exibir indicador de conexão (conectado/desconectado)

### 6c — Relógio simulado

- [ ] **6.6** Criar `src/components/SimulatedClock.tsx`: receber `simulated_hours` como prop; converter para `Dia D, Mês M de AAAA, às HH:MM` (base: 1 de janeiro de 2026, hora 00:00); exibir com fonte monospace

### 6d — Cards de sensores

- [ ] **6.7** Criar `src/components/SensorCard.tsx`: props `label`, `value`, `unit`, `highlight` (bool para cor de fundo); exibir valor com 2 casas decimais e unidade
- [ ] **6.8** Criar `src/components/SensorGrid.tsx`: grid responsivo com um `SensorCard` por sensor (14 sensores); destacar sensores envolvidos em riscos ativos

### 6e — Indicador de alerta e lista de riscos

- [ ] **6.9** Criar `src/components/AlertBadge.tsx`: badge colorido conforme nível (VERDE=#16a34a, AMARELO=#ca8a04, LARANJA=#ea580c, VERMELHO=#dc2626); texto do nível e ícone
- [ ] **6.10** Criar `src/components/RiskList.tsx`: lista de riscos ativos com código, severidade (badge) e mensagem; lista de previsões ativas com tempo estimado e tipo
- [ ] **6.11** Criar `src/components/AlertHistoryTable.tsx`: tabela com colunas timestamp simulado, tipo, severidade, mensagem; buscar dados de `GET /history/alerts`; atualizar a cada 10s ou ao receber novo broadcast

### 6f — Gráficos Recharts

- [ ] **6.12** Criar `src/hooks/useSensorHistory.ts`: buscar `GET /history/sensors/{sensor_id}?horas=720` para os sensores de volume, chuva e energia; atualizar a cada broadcast WebSocket
- [ ] **6.13** Criar `src/components/charts/VolumeChart.tsx`: `LineChart` Recharts com duas linhas (`sensor_volume_01`, `sensor_volume_02`) em % × horas simuladas; eixo Y 0–100%; linhas de referência em 90% e 10%
- [ ] **6.14** Criar `src/components/charts/RainChart.tsx`: `BarChart` com `sensor_chuva_01` (mm/h) e `sensor_chuva_02` (mm acumulado) × horas simuladas
- [ ] **6.15** Criar `src/components/charts/EnergyChart.tsx`: `AreaChart` com `sensor_energia_01` (kW/h) × horas simuladas
- [ ] **6.16** Criar `src/components/charts/RiskCountChart.tsx`: `LineChart` com contagem de riscos ativos por hora × horas simuladas (derivar do histórico de alertas)

### 6g — Botão de ajuste e layout final

- [ ] **6.17** Criar `src/components/AdjustButton.tsx`: botão "Ajustar Comportas"; habilitado quando `alertLevel !== 'VERDE'` ou `paused === true`; ao clicar, `POST /simulation/adjust`; exibir feedback visual (loading/sucesso/erro)
- [ ] **6.18** Criar `src/pages/MonitoringPanel.tsx`: montar todos os componentes acima em layout de duas colunas (sensores + alertas à esquerda; gráficos à direita); relógio no topo

---

## Fase 7 — Frontend 2 (Painel de Simulação)

### 7a — Controles de simulação

- [ ] **7.1** Criar `src/components/SpeedSlider.tsx`: slider de 0.1 a 100 (escala logarítmica); exibir valor atual como `Nx`; ao soltar (`onMouseUp`/`onTouchEnd`), `POST /simulation/speed`
- [ ] **7.2** Criar `src/components/StartButton.tsx`: botão "Iniciar Barragem"; ao clicar, `POST /simulation/start`; exibir progresso em 3 fases com base nas atualizações WebSocket (volume_01 subindo → volume_02 subindo → estabilizando em 90%)
- [ ] **7.3** Criar `src/components/ScenarioControls.tsx`: dois grupos — "Chuva Intensa" (seletor 1/7/15 dias + botão) e "Período de Seca" (seletor 15/30/60 dias + botão); cada botão chama `POST /simulation/scenario` com `tipo` e `duracao_dias`

### 7b — Indicador de estado e layout

- [ ] **7.4** Criar `src/components/SimulationStatus.tsx`: exibir estado atual — `RODANDO`, `PAUSADO (previsão crítica)`, `PAUSADO (manual)`, `CENÁRIO ATIVO: {tipo} — {dias restantes} dias restantes`; derivar do store Zustand
- [ ] **7.5** Criar `src/pages/SimulationPanel.tsx`: montar controles de velocidade, botões de ação e indicador de estado; link/tab de navegação para o Painel de Monitoramento
- [ ] **7.6** Configurar React Router (ou abas simples) para alternar entre `MonitoringPanel` e `SimulationPanel` sem recarregar a página; garantir que o WebSocket permanece conectado ao trocar de painel

---

## Fase 8 — Integração e Testes

### 8a — Testes de fluxo completo

- [ ] **8.1** Testar sequência completa: `POST /simulation/start` → aguardar volumes ≥ 90% → verificar estado RODANDO → confirmar atualizações WebSocket a 1 Hz
- [ ] **8.2** Testar `POST /simulation/scenario tipo=chuva_intensa duracao_dias=7`: verificar que `sensor_chuva_01` fica em 20 mm/h por 168 ticks; após período, retorna à série original
- [ ] **8.3** Testar acionamento de pausa por previsão crítica: ajustar comportas para criar taxa_liquida alta → aguardar previsão CRÍTICO → verificar que engine pausa com `paused_reason = "previsao_critica"` → verificar badge PAUSADO no frontend. Testar também pausa manual: `POST /simulation/pause` → verificar `paused_reason = "manual"` no broadcast WebSocket → `POST /simulation/resume` → verificar `paused_reason = null` e ticks voltando a avançar. Validar 409 em `/simulation/resume` quando `paused_reason = "previsao_critica"`.
- [ ] **8.4** Testar `POST /simulation/adjust` com simulação pausada: verificar que comportas são ajustadas, simulação retoma, taxa_liquida ≈ 0

### 8b — Testes de performance e estabilidade

- [ ] **8.5** Testar mudança de velocidade em tempo de execução: alterar de 1x → 100x → 0.1x → 10x; verificar que `simulated_hours` continua crescendo monotonicamente sem saltos ou perdas
- [ ] **8.6** Testar janela deslizante `sensor_chuva_02`: em fator=100, rodar 1000 ticks; verificar que `sensor_chuva_02` reflete apenas os últimos 720 ticks (não acumula indefinidamente)
- [ ] **8.7** Testar broadcast WebSocket com 3 clientes simultâneos: todos devem receber o mesmo payload; desconectar 1 cliente não deve afetar os outros

### 8c — Testes de consistência dos dados

- [ ] **8.8** Verificar que `sensor_readings` no banco acumula uma linha por sensor por tick do display loop (13 sensores × 1 Hz)
- [ ] **8.9** Verificar que `GET /history/sensors/sensor_volume_01?horas=720` retorna exatamente os últimos 720 pontos (ou menos se a simulação tem menos horas)
- [ ] **8.10** Verificar que `GET /history/alerts` retorna alertas ordenados por timestamp decrescente, paginação correta

### 8d — Validação do motor de riscos

- [ ] **8.11** Forçar `sensor_volume_01 = 96%` manualmente e verificar que Risco 2 (VERMELHO) é gerado e propagado via WebSocket
- [ ] **8.12** Verificar que motor de riscos e previsão rodam em paralelo no mesmo tick de display sem interferência

### 8e — Ajustes finais

- [ ] **8.13** Testar responsividade do frontend em viewport 1280×720 e 1920×1080; ajustar grid e gráficos se necessário
