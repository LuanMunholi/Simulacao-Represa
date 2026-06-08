# Contrato de API — Simulação Represa

**Disciplina:** XRSC07 - Computação em Nuvem  
**Grupo:** 12 — Luan Rodrigues Munholi · Diego Luis Valim

Este documento define o contrato completo de comunicação entre os serviços. É a fonte da verdade compartilhada entre Dev A (backend/engine) e Dev B (frontend). Qualquer alteração de campo, tipo ou enum aqui deve ser acordada por ambos antes de implementar.

---

## 1. Enums

### 1.1 `SensorId` — nomes canônicos dos sensores

| Identificador | Unidade | Tipo do valor |
|---|---|---|
| `sensor_chuva_01` | `mm/h` | `float` |
| `sensor_chuva_02` | `mm` | `float` |
| `sensor_comporta_01` | `%` | `float` (0–100) |
| `sensor_enchimento_01` | `m³/h` | `float` |
| `sensor_comporta_02` | `%` | `float` (0–100) |
| `sensor_fluxo_01` | `m³/h` | `float` |
| `sensor_comporta_03` | `%` | `float` (0–100) |
| `sensor_fluxo_02` | `m³/h` | `float` |
| `sensor_comporta_04` | `%` | `float` (0–100) |
| `sensor_esvaziamento_01` | `m³/h` | `float` |
| `sensor_turbina_01` | `null` | `TurbineState` (string) |
| `sensor_energia_01` | `kW/h` | `float` |
| `sensor_volume_01` | `%` | `float` (0–100) |
| `sensor_volume_02` | `%` | `float` (0–100) |

> **Nota:** `sensor_capacidade_atual` e `contribuicao_chuva` são valores derivados internos do engine — não são sensores persistidos individualmente no banco, mas são enviados no payload de tick para rastreabilidade.

---

### 1.2 `TurbineState` — estado da turbina

```
"LIGADO"
"DESLIGADO"
```

---

### 1.3 `AlertLevel` — nível de alerta geral da barragem

```
"VERDE"     # 0 riscos ativos
"AMARELO"   # 1 risco ativo
"LARANJA"   # 2 riscos ativos
"VERMELHO"  # 3 ou mais riscos ativos
```

---

### 1.4 `RiskSeverity` — severidade de cada risco individual

```
"BAIXA"
"MEDIA"
"ALTA"
"CRITICA"
```

---

### 1.5 `RiskCode` — código de cada regra de risco

```
"RISCO_01"   # Transbordamento — Tanque Superior (ALTA)
"RISCO_02"   # Esvaziamento — Tanque Superior (MEDIA)
"RISCO_03"   # Enchimento Estagnado — Tanque Superior (BAIXA)
"RISCO_04"   # Transbordamento — Tanque Inferior (ALTA)
"RISCO_05"   # Esvaziamento — Tanque Inferior (MEDIA)
"RISCO_06"   # Desbalanceamento Comporta_02 vs Comporta_03 (MEDIA)
"RISCO_07"   # Comporta_02 excedendo Comporta_03 (CRITICA)
"RISCO_08"   # Turbina desligada com comportas abertas (ALTA)
"RISCO_09"   # Turbina ligada sem fluxo (CRITICA)
"RISCO_10"   # Desequilíbrio entre tanques (BAIXA)
```

---

### 1.6 `PredictionType` — tipo de projeção de limite

```
"overflow"   # tanque atingirá 100%
"vazio"      # tanque atingirá 0%
```

---

### 1.7 `PredictionSeverity` — severidade da previsão

```
"ALERTA"    # tempo projetado entre 24h e 48h simuladas
"CRITICO"   # tempo projetado menor que 24h simuladas (pausa a simulação)
```

---

### 1.8 `SimulationStatus` — estado operacional da simulação

```
"RODANDO"          # loop de simulação ativo, sem cenário
"PAUSADO"          # loop suspenso (previsão crítica ou manual)
"INICIANDO"        # sequência de startup em andamento
"CENARIO_ATIVO"    # cenário de chuva intensa ou seca em execução
```

---

### 1.9 `PausedReason` — motivo da pausa (presente somente quando `status = "PAUSADO"`)

```
"previsao_critica"   # pausa automática por previsão < 24h
"manual"             # pausa solicitada pelo usuário via POST /simulation/pause
```

---

### 1.10 `ScenarioType` — tipo de cenário ativo

```
"chuva_intensa"   # sensor_chuva_01 fixado em 20mm/h
"seca"            # sensor_chuva_01 fixado em 0mm/h
```

---

## 2. Payload: `POST /internal/tick` (Engine → Backend API)

Enviado pelo Simulation Engine a cada tick do loop de simulação.  
O Backend API deve responder `200 OK` imediatamente — não bloquear o engine.

### Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `simulated_hours` | `int` | Horas simuladas totais desde o início (incrementa 1 por tick) |
| `fator_aceleracao` | `float` | Fator de aceleração atual (0.1–100.0) |
| `status` | `SimulationStatus` | Estado atual da simulação |
| `paused_reason` | `PausedReason \| null` | Motivo da pausa; `null` se não pausado |
| `scenario_active` | `ScenarioType \| null` | Cenário em andamento; `null` se nenhum |
| `scenario_ticks_remaining` | `int \| null` | Ticks restantes do cenário; `null` se nenhum |
| `sensors` | `object` | Mapa de sensor_id → leitura (ver estrutura abaixo) |
| `derived` | `object` | Valores derivados do tick atual (ver estrutura abaixo) |

### Estrutura de `sensors`

Cada entrada do mapa segue o formato:

```json
"<sensor_id>": {
  "valor": <number | string>,
  "unidade": <string | null>
}
```

### Estrutura de `derived`

Valores calculados internamente no tick — não são sensores individuais, mas necessários para o motor de riscos e previsão:

| Campo | Tipo | Descrição |
|---|---|---|
| `capacidade_atual` | `float` | `min(200, max(10, (chuva_acumulada / 10) × 200))` em m³/h |
| `contribuicao_chuva` | `float` | `sensor_chuva_01` convertido para m³/h (valor idêntico em escala, unidade diferente) |
| `taxa_liquida_01` | `float` | `sensor_enchimento_01 + contribuicao_chuva − sensor_fluxo_01` em m³/h |
| `taxa_liquida_02` | `float` | `sensor_fluxo_02 + contribuicao_chuva − sensor_esvaziamento_01` em m³/h |

### Exemplo completo

```json
{
  "simulated_hours": 42,
  "fator_aceleracao": 10.0,
  "status": "RODANDO",
  "paused_reason": null,
  "scenario_active": null,
  "scenario_ticks_remaining": null,
  "sensors": {
    "sensor_chuva_01":       { "valor": 15.3,       "unidade": "mm/h" },
    "sensor_chuva_02":       { "valor": 320.5,      "unidade": "mm" },
    "sensor_comporta_01":    { "valor": 75.0,        "unidade": "%" },
    "sensor_enchimento_01":  { "valor": 135.0,       "unidade": "m³/h" },
    "sensor_comporta_02":    { "valor": 60.0,        "unidade": "%" },
    "sensor_fluxo_01":       { "valor": 120.0,       "unidade": "m³/h" },
    "sensor_comporta_03":    { "valor": 60.0,        "unidade": "%" },
    "sensor_fluxo_02":       { "valor": 120.0,       "unidade": "m³/h" },
    "sensor_comporta_04":    { "valor": 50.0,        "unidade": "%" },
    "sensor_esvaziamento_01":{ "valor": 100.0,       "unidade": "m³/h" },
    "sensor_turbina_01":     { "valor": "LIGADO",    "unidade": null },
    "sensor_energia_01":     { "valor": 6000.0,      "unidade": "kW/h" },
    "sensor_volume_01":      { "valor": 87.5,        "unidade": "%" },
    "sensor_volume_02":      { "valor": 91.2,        "unidade": "%" }
  },
  "derived": {
    "capacidade_atual":    180.0,
    "contribuicao_chuva":  15.3,
    "taxa_liquida_01":     30.3,
    "taxa_liquida_02":     35.3
  }
}
```

---

## 3. Payload: Broadcast WebSocket `/ws` (Backend API → Frontend)

Enviado pelo Backend API a cada tick do loop de display (1 Hz).  
O frontend deve consumir este payload via `WebSocket.onmessage` e atualizar o estado global (Zustand/Context).

### Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `simulated_hours` | `int` | Horas simuladas totais |
| `simulated_time` | `string` | Tempo formatado: `"Dia D, Mês M de AAAA, às HH:MM"` |
| `fator_aceleracao` | `float` | Fator de aceleração atual |
| `status` | `SimulationStatus` | Estado operacional da simulação |
| `paused_reason` | `PausedReason \| null` | Motivo da pausa; `null` se não pausado |
| `scenario_active` | `ScenarioType \| null` | Cenário em andamento; `null` se nenhum |
| `scenario_days_remaining` | `float \| null` | Dias simulados restantes do cenário; `null` se nenhum |
| `sensors` | `object` | Mesmo mapa do tick (sensor_id → `{valor, unidade}`) |
| `derived` | `object` | Mesmo objeto derivado do tick |
| `alert_level` | `AlertLevel` | Nível de alerta geral atual |
| `active_risks` | `RiskEntry[]` | Lista de riscos ativos neste ciclo |
| `active_predictions` | `PredictionEntry[]` | Lista de previsões ativas neste ciclo |

### Estrutura de `RiskEntry`

```json
{
  "codigo":     "RISCO_01",
  "severidade": "ALTA",
  "mensagem":   "24 de Janeiro de 2026, às 18:00 - Risco de Transbordamento...",
  "sensores": {
    "sensor_volume_01":     92.0,
    "sensor_chuva_01":      15.3,
    "sensor_enchimento_01": 135.0,
    "sensor_fluxo_01":      120.0
  }
}
```

- `sensores`: mapa de `sensor_id → valor` (somente os sensores envolvidos no risco; sem unidade — apenas o número)

### Estrutura de `PredictionEntry`

```json
{
  "tanque":      "superior",
  "tipo":        "overflow",
  "tempo_horas": 36.5,
  "severidade":  "ALERTA",
  "mensagem":    "24 de Janeiro de 2026, às 18:00 - ALERTA: Previsão de transbordamento..."
}
```

| Campo | Tipo | Valores possíveis |
|---|---|---|
| `tanque` | `string` | `"superior"` \| `"inferior"` |
| `tipo` | `PredictionType` | `"overflow"` \| `"vazio"` |
| `tempo_horas` | `float` | Horas simuladas até o limite |
| `severidade` | `PredictionSeverity` | `"ALERTA"` \| `"CRITICO"` |
| `mensagem` | `string` | Texto formatado conforme Seção 5.1 das Specs |

### Exemplo completo

```json
{
  "simulated_hours": 42,
  "simulated_time": "Dia 2, Mês 1 de 2026, às 18:00",
  "fator_aceleracao": 10.0,
  "status": "RODANDO",
  "paused_reason": null,
  "scenario_active": null,
  "scenario_days_remaining": null,
  "sensors": {
    "sensor_chuva_01":        { "valor": 15.3,    "unidade": "mm/h" },
    "sensor_chuva_02":        { "valor": 320.5,   "unidade": "mm" },
    "sensor_comporta_01":     { "valor": 75.0,    "unidade": "%" },
    "sensor_enchimento_01":   { "valor": 135.0,   "unidade": "m³/h" },
    "sensor_comporta_02":     { "valor": 60.0,    "unidade": "%" },
    "sensor_fluxo_01":        { "valor": 120.0,   "unidade": "m³/h" },
    "sensor_comporta_03":     { "valor": 60.0,    "unidade": "%" },
    "sensor_fluxo_02":        { "valor": 120.0,   "unidade": "m³/h" },
    "sensor_comporta_04":     { "valor": 50.0,    "unidade": "%" },
    "sensor_esvaziamento_01": { "valor": 100.0,   "unidade": "m³/h" },
    "sensor_turbina_01":      { "valor": "LIGADO","unidade": null },
    "sensor_energia_01":      { "valor": 6000.0,  "unidade": "kW/h" },
    "sensor_volume_01":       { "valor": 87.5,    "unidade": "%" },
    "sensor_volume_02":       { "valor": 91.2,    "unidade": "%" }
  },
  "derived": {
    "capacidade_atual":   180.0,
    "contribuicao_chuva":  15.3,
    "taxa_liquida_01":     30.3,
    "taxa_liquida_02":     35.3
  },
  "alert_level": "AMARELO",
  "active_risks": [
    {
      "codigo": "RISCO_06",
      "severidade": "MEDIA",
      "mensagem": "2 de Janeiro de 2026, às 18:00 - Comportas do interior da barragem em estados de abertura diferentes. O estado ideal é que ambas estejam no mesmo percentual.",
      "sensores": {
        "sensor_comporta_02": 40.0,
        "sensor_comporta_03": 60.0
      }
    }
  ],
  "active_predictions": []
}
```

---

## 4. API do Simulation Engine (Backend → Engine)

O engine expõe sua própria API HTTP interna. O backend chama esses endpoints para comandar o engine.  
Todas as rotas retornam `200 OK` com `{"ok": true}` em caso de sucesso.

### `POST /engine/start`

Dispara a sequência de startup da barragem (assíncrona — retorna imediatamente, sequência roda em background).

**Body:** nenhum  
**Response:** `{"ok": true}`

---

### `POST /engine/pause`

Suspende o loop de simulação. O engine para de avançar ticks mas permanece em execução. O motivo é registrado em `state.paused_reason` e propagado no campo `paused_reason` dos próximos payloads de tick e broadcast.

**Body:**
```json
{ "reason": "manual" }
```

| Campo | Tipo | Valores |
|---|---|---|
| `reason` | `PausedReason` | `"previsao_critica"` \| `"manual"` |

**Response:** `{"ok": true}`

---

### `POST /engine/resume`

Retoma o loop de simulação após uma pausa.

**Body:** nenhum  
**Response:** `{"ok": true}`

---

### `POST /engine/speed`

Altera o `fator_aceleracao` e reescalona o job APScheduler.

**Body:**
```json
{ "fator": 10.0 }
```

| Campo | Tipo | Restrição |
|---|---|---|
| `fator` | `float` | 0.1 ≤ fator ≤ 100.0 |

**Response:** `{"ok": true, "fator": 10.0}`

---

### `POST /engine/scenario`

Inicia um cenário de chuva intensa ou seca sobrescrevendo a série de chuva.

**Body:**
```json
{ "tipo": "chuva_intensa", "duracao_dias": 7 }
```

| Campo | Tipo | Valores |
|---|---|---|
| `tipo` | `ScenarioType` | `"chuva_intensa"` \| `"seca"` |
| `duracao_dias` | `int` | chuva_intensa: 1, 7 ou 15 · seca: 15, 30 ou 60 |

**Response:** `{"ok": true, "tipo": "chuva_intensa", "duracao_dias": 7}`

---

### `POST /engine/adjust`

Aplica novos valores de comportas e estado da turbina calculados pelo algoritmo de ajuste do backend. A turbina é controlada de forma independente das comportas (ver Specs Seção 4), portanto faz parte do payload.

**Body:**
```json
{
  "comporta_01": 50.0,
  "comporta_02": 60.0,
  "comporta_03": 60.0,
  "comporta_04": 40.0,
  "turbina": "LIGADO"
}
```

| Campo | Tipo | Restrição |
|---|---|---|
| `comporta_01` | `float` | 0.0 ≤ valor ≤ 100.0 |
| `comporta_02` | `float` | 0.0 ≤ valor ≤ `comporta_03` |
| `comporta_03` | `float` | 0.0 ≤ valor ≤ 100.0 |
| `comporta_04` | `float` | 0.0 ≤ valor ≤ 100.0 |
| `turbina` | `TurbineState` | `"LIGADO"` \| `"DESLIGADO"` |

**Response:** `{"ok": true}`

---

## 5. Endpoints REST Públicos (Frontend → Backend API)

### `GET /state`

Retorna o estado atual da simulação e as leituras mais recentes dos sensores (lidas do `StateCache` em memória).

**Response `200 OK`:**
```json
{
  "simulated_hours": 42,
  "simulated_time": "Dia 2, Mês 1 de 2026, às 18:00",
  "fator_aceleracao": 10.0,
  "status": "RODANDO",
  "paused_reason": null,
  "scenario_active": null,
  "scenario_days_remaining": null,
  "alert_level": "AMARELO",
  "sensors": { "...": "igual ao broadcast WebSocket" },
  "derived": { "...": "igual ao broadcast WebSocket" },
  "active_risks": [],
  "active_predictions": []
}
```

---

### `POST /simulation/start`

Aciona a sequência de startup da barragem via engine.

**Body:** nenhum  
**Response `202 Accepted`:** `{"ok": true}`

---

### `POST /simulation/pause`

Pausa o loop de simulação a pedido do usuário. Chama internamente `POST /engine/pause` com `reason = "manual"`. Idempotente — se a simulação já estiver pausada por qualquer motivo, o endpoint apenas confirma o estado atual; o `paused_reason` original é preservado (uma pausa por previsão crítica não é sobrescrita por uma pausa manual).

**Body:** nenhum  
**Response `200 OK`:**
```json
{ "ok": true, "paused_reason": "manual" }
```

O campo `paused_reason` da resposta reflete o motivo da pausa em vigor após a chamada (`"manual"` no caso comum, `"previsao_critica"` se já estava pausada por previsão).

---

### `POST /simulation/resume`

Retoma o loop de simulação após pausa manual. Chama internamente `POST /engine/resume`. **Não retoma** uma pausa por previsão crítica — nesse caso o usuário deve acionar `POST /simulation/adjust`, que calcula e aplica as correções antes de retomar.

**Body:** nenhum  
**Response `200 OK`:** `{"ok": true}` — quando `paused_reason = "manual"` ou simulação não está pausada (idempotente)  
**Response `409 Conflict`:**
```json
{ "detail": "Simulação pausada por previsão crítica — use /simulation/adjust" }
```
quando `paused_reason = "previsao_critica"`.

---

### `POST /simulation/speed`

Altera o fator de aceleração.

**Body:**
```json
{ "fator": 5.0 }
```

**Response `200 OK`:** `{"ok": true, "fator": 5.0}`  
**Response `422`:** se `fator < 0.1` ou `fator > 100.0`

---

### `POST /simulation/scenario`

Inicia um cenário de chuva intensa ou seca.

**Body:**
```json
{ "tipo": "seca", "duracao_dias": 30 }
```

**Response `202 Accepted`:** `{"ok": true, "tipo": "seca", "duracao_dias": 30}`

---

### `POST /simulation/adjust`

Aciona o ajuste automático de comportas. O backend calcula os valores ideais e os envia ao engine, depois retoma a simulação se estava pausada.

**Body:** nenhum  
**Response `200 OK`:**
```json
{
  "ok": true,
  "ajuste_aplicado": {
    "comporta_01": 50.0,
    "comporta_02": 60.0,
    "comporta_03": 60.0,
    "comporta_04": 40.0,
    "turbina": "LIGADO"
  }
}
```

---

### `GET /history/alerts`

Retorna o histórico de alertas paginado, ordenado por `simulated_timestamp DESC`.

**Query params:**
| Param | Tipo | Default |
|---|---|---|
| `page` | `int` | `1` |
| `per_page` | `int` | `50` |

**Response `200 OK`:**
```json
{
  "page": 1,
  "per_page": 50,
  "total": 142,
  "items": [
    {
      "id": 142,
      "simulated_timestamp": 42,
      "simulated_time": "Dia 2, Mês 1 de 2026, às 18:00",
      "tipo": "risco",
      "severidade": "ALTA",
      "mensagem": "2 de Janeiro de 2026, às 18:00 - Risco de Transbordamento...",
      "leituras": {
        "sensor_volume_01": 92.0,
        "sensor_enchimento_01": 135.0,
        "sensor_fluxo_01": 120.0
      }
    }
  ]
}
```

| Campo `tipo` | Descrição |
|---|---|
| `"risco"` | Alerta gerado pelo motor de riscos (Seção 6) |
| `"previsao"` | Alerta gerado pelo mecanismo de previsão (Seção 5.1) |

---

### `GET /history/sensors/{sensor_id}`

Retorna as últimas N leituras de um sensor, ordenadas por `simulated_timestamp ASC`.

**Path param:** `sensor_id` — um dos valores de `SensorId`  
**Query params:**

| Param | Tipo | Default |
|---|---|---|
| `horas` | `int` | `720` |

**Response `200 OK`:**
```json
{
  "sensor_id": "sensor_volume_01",
  "unidade": "%",
  "horas": 720,
  "items": [
    { "simulated_timestamp": 1,  "valor": 0.0 },
    { "simulated_timestamp": 2,  "valor": 0.8 },
    { "simulated_timestamp": 42, "valor": 87.5 }
  ]
}
```

**Response `404`:** se `sensor_id` não for um dos 14 sensores válidos.

---

## 6. Regras de compatibilidade

1. **Adição de campos**: campos novos podem ser adicionados ao payload sem quebrar o contrato — o receptor deve ignorar campos desconhecidos.
2. **Remoção ou renomeação de campos**: requer acordo explícito de ambos os devs e atualização deste documento antes de implementar.
3. **Tipos**: `float` nunca deve ser substituído por `int` nem vice-versa sem acordo — o frontend usa os valores diretamente em gráficos.
4. **Strings de enum**: devem ser tratadas como case-sensitive. `"LIGADO"` ≠ `"ligado"`.
5. **`null` vs campo ausente**: campos opcionais que podem ser `null` são sempre enviados com o valor `null` explícito — nunca omitidos do JSON.
