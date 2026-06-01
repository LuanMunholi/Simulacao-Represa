# ESPECIFICAÇÕES DO TRABALHO

Disciplina: XRSC07 - Computação em Nuvem  
Professor: Bruno Guazzelli Batista

**Grupo 12**  
Luan Rodrigues Munholi - 2020000119  
Diego Luis Valim - 2023001307

---

## 1. Problema

Barragens exigem monitoramento constante porque alterações no nível da água, pressão, vibração, infiltração e condições climáticas podem indicar situações de risco. Em muitos cenários, a leitura isolada de sensores não é suficiente: é necessário centralizar os dados, acompanhar em tempo real, armazenar histórico e permitir simulações de eventos para prever comportamentos e apoiar decisões.

O problema do projeto pode ser definido assim:

Como criar um ambiente de monitoramento e simulação de barragem, baseado em sensores, capaz de receber dados em tempo real, calcular riscos operacionais e apoiar análise preventiva por meio de painéis interativos?

---

## 2. Solução Proposta

A solução será uma plataforma composta por:

**1 backend central**
- recebe dados dos sensores da barragem em tempo real;
- armazena histórico em banco de dados;
- processa os dados;
- calcula indicadores e níveis de risco;
- envia atualizações em tempo real para os frontends.

**2 frontends**
1. **Frontend 1:** Painel de Monitoramento
   - exibe um painel de hora simulado;
   - exibe dados em tempo real de cada sensor;
   - mostra diferentes tipos de alertas;
   - apresenta gráficos;
   - mecanismo de ajuste de comportas.
2. **Frontend 2:** Painel de Simulação
   - permite simular eventos que impactam a barragem;
   - envia cenários ao backend;
   - o backend recalcula os sensores virtuais e os riscos;
   - o painel de monitoramento reflete imediatamente os efeitos da simulação.

A ideia central é representar um sistema de monitoramento inteligente de barragem, com foco em prevenção, observabilidade e resposta a cenários críticos.

---

## 3. Cenário do Projeto

Como não temos sensores físicos reais, o projeto trabalha com sensores simulados, o que nos permite mostrar conceitos de nuvem, tempo real, processamento e persistência.

O sistema pode funcionar assim:
- o backend recebe leituras periódicas de sensores simulados;
- essas leituras podem ser:
  - geradas automaticamente;
  - alteradas pelo painel de simulação;
- o backend processa e envia os dados para o painel de monitoramento;
- tudo fica salvo no banco para consulta.

---

## 4. Informações que a barragem "enviará" ao backend + Regras de negócio

A barragem é estruturada por um tanque superior, o interior da barragem com passagem para fluxo de água onde a energia é gerada, e um tanque inferior para deságue.

### Dimensões dos Tanques
- ambos os tanques possuem dimensões de 100m x 10m x 10m (comprimento x largura x altura)
- volume máximo de cada tanque 10.000.000 litros (= 10.000 m³)
- área de captação de chuva de cada tanque é de 1.000 m²
- conversão de chuva para volume: 1 mm/h sobre 1.000 m² equivale a 1.000 L/h = 1 m³/h
- portanto: `contribuição_chuva (m³/h) = sensor_chuva_01 (mm/h) × 1.000 m² ÷ 1.000 = sensor_chuva_01 (m³/h)`

### Simulação da Barragem
- a simulação da barragem irá durar 1 ano (12 meses, 52 semanas, 364 dias)
- a simulação inicia-se no dia 1, mês 1 às 00:00
- este tempo simulado pode ser acelerado ou desacelerado, controlado diretamente pelo painel de simulação, mas deve seguir um modelo de tempo real, que servirá como referência para as atividades e ações realizadas na barragem
- cada tick de simulação representa sempre **1 hora simulada** — o que varia com a aceleração é a frequência com que os ticks disparam, não o tamanho de cada tick
- `fator_aceleração` define quantos ticks de simulação ocorrem por segundo real, com faixa de 0.1x até 100x — controlado por uma barra no painel de simulação:
  - a 1x: 1 tick/segundo real (1 hora simulada/segundo real)
  - a 10x: 10 ticks/segundo real (10 horas simuladas/segundo real)
  - a 0.1x: 1 tick a cada 10 segundos reais (1 hora simulada a cada 10 segundos reais)
  - a 100x: 100 ticks/segundo real (~4,17 dias simulados/segundo real)
- o sistema possui **dois loops independentes**:
  - **Loop de simulação**: dispara a `fator_aceleração` Hz; cada tick avança 1 hora simulada e atualiza o estado interno dos sensores
  - **Loop de display**: dispara sempre a 1 Hz (1 vez por segundo real); lê o estado atual e envia broadcast WebSocket ao frontend
- os sensores exibidos no painel refletem sempre o estado mais recente calculado pelo loop de simulação no momento do último broadcast

### Representação Interna do Tempo Simulado

O tempo simulado é mantido internamente como um valor numérico contínuo (`simulated_hours: float`), incrementado de 1 a cada tick do loop de simulação:

```
simulated_hours += 1   (cada tick = 1 hora simulada, sempre)
```

O intervalo real entre ticks varia com a aceleração:

```
intervalo_real = 1.0 / fator_aceleração  [segundos reais]
```

| Aceleração | Ticks por segundo real | Intervalo entre ticks |
|---|---|---|
| 0.1x | 0,1 ticks/s | 10 segundos reais |
| 1x | 1 tick/s | 1 segundo real |
| 10x | 10 ticks/s | 0,1 segundo real |
| 100x | 100 ticks/s | 0,01 segundo real |

O painel de monitoramento exibe o tempo simulado no formato `Dia D, Mês M de AAAA, às HH:MM`, derivado da conversão:

```
total_minutos = int(simulated_hours × 60)
minutos       = total_minutos % 60
horas         = (total_minutos // 60) % 24
dias          = (total_minutos // 60) // 24  + 1   (dia 1 no início)
```

Os limiares de previsão da Seção 5.1 (24h e 48h) e os cálculos de delta-volume operam diretamente em horas inteiras (1h por tick), sem necessidade de conversão adicional.

### Cálculo de Volume por Tick (Motor de Simulação)

A cada tick do loop de simulação (sempre 1 hora simulada), o motor atualiza o volume de cada tanque:

**Para o tanque superior:**

```
taxa_liquida_01 = sensor_enchimento_01 + contribuição_chuva − sensor_fluxo_01  [m³/h]
delta_volume_01 = taxa_liquida_01 × 1h                                         [m³]
novo_volume_01% = clamp(volume_01% + delta_volume_01 / 100,  0%,  100%)
```

**Para o tanque inferior:**

```
taxa_liquida_02 = sensor_fluxo_02 + contribuição_chuva − sensor_esvaziamento_01  [m³/h]
delta_volume_02 = taxa_liquida_02 × 1h                                            [m³]
novo_volume_02% = clamp(volume_02% + delta_volume_02 / 100,  0%,  100%)
```

Onde:
- cada tick representa exatamente 1 hora simulada — o `fator_aceleração` controla a frequência dos ticks, não o tamanho deles;
- a divisão por 100 converte m³ para pontos percentuais (1% = 100 m³, dado volume máximo de 10.000 m³);
- `clamp` garante que o volume permaneça dentro do intervalo válido [0%, 100%].

### Estados de Chuva
- os estados de chuva é uma série gerada aleatoriamente no início da simulação, que irá definir os períodos que haverá e não haverá chuva durante a simulação de 1 ano da barragem, definindo as tendências que irão controlar as variações de leituras realizadas pelo sensor_chuva_01
- a série deve ser uma sequência de 364 dias (1 ano), que irá definir o estado de chuva de cada dia da simulação, mas que devem ser definidas pelas tendências de chuvas semanais (52 semanas total) definidas naquele ano
- tendências de chuvas semanais definem o volume de chuva de uma semana
- tendências de chuvas semanais definidas:
  - sem chuva — pode chover, com 20% de chance por dia, e se chover, sempre 1mm/h
  - pouca chuva — deve chover, mas sempre entre 1mm/h – 5mm/h por dia
  - chuva constante — deve chover, mas sempre entre 5mm/h – 10mm/h por dia
  - chuvas intensas — deve chover, mas sempre entre 10mm/h – 50mm/h por dia
- exemplo de série gerada:
  - semana 1 — sem chuva
    - dia 1 — 0mm/h
    - dia 2 — 1mm/h
    - dia 3 — 0mm/h
    - dia 4 — 0mm/h
    - dia 5 — 0mm/h
    - dia 6 — 0mm/h
    - dia 7 — 1mm/h
  - semana 2 — chuva constante
    - dia 1 — 5mm/h
    - dia 2 — 6mm/h
    - dia 3 — 8mm/h
    - dia 4 — 8mm/h
    - dia 5 — 7mm/h
    - dia 6 — 10mm/h
    - dia 7 — 9mm/h
  - semana 3 — chuvas intensas
    - dia 1 — 12mm/h
    - dia 2 — 35mm/h
    - dia 3 — 29mm/h
    - dia 4 — 26mm/h
    - dia 5 — 19mm/h
    - dia 6 — 10mm/h
    - dia 7 — 43mm/h
  - e assim segue até a última semana e dia do ano

### Sensores do Tanque Superior

- **sensor_volume_01** — Mede volume estimado armazenado do tanque superior (em % da capacidade máxima)
  - valor inicial deve ser 0%
  - o volume varia de acordo com a taxa de enchimento lida pelo sensor_enchimento_01 e pelo sensor_fluxo_01, podendo aumentar ou diminuir, dependendo dos valores
  - o volume também pode variar de acordo com o valor lido pelo sensor_chuva_01 (ver conversão acima)
  - estado operacional ideal: próximo de 90% da capacidade

- **sensor_comporta_01** — Indica estado atual da comporta de enchimento do tanque superior (em % da capacidade de abertura)
  - valor inicial deve ser 0%
  - a % de abertura da comporta implica diretamente no valor medido pelo sensor_enchimento_01
  - 0% de abertura implica que a comporta está fechada e a vazão de saída do sensor_enchimento_01 é 0m³/h
  - 100% de abertura implica que a comporta está completamente aberta e a vazão de saída está na sua capacidade máxima — 200m³/h
  - o valor pode variar de acordo com a necessidade de manter o tanque superior próximo de 90% da capacidade — sendo acionado manualmente pelo painel de monitoramento

- **sensor_enchimento_01** — Mede a taxa de enchimento do tanque superior (em metros cúbicos por hora)
  - valor inicial é definido pela % de abertura da comporta_01
  - a capacidade de vazão de água deste sensor é definida proporcionalmente pela chuva acumulada no último mês — isto é, caso a chuva acumulada no último mês seja 10mm ou mais, a capacidade de enchimento será de 200m³/h, reduzindo proporcionalmente
  - valor mínimo será 10m³/h se chuva = 0mm/h
  - `enchimento_01 = (comporta_01% / 100) × capacidade_atual`
  - `capacidade_atual = min(200, max(10, (chuva_acumulada / 10) × 200))`

- **sensor_comporta_02** — Indica estado atual da comporta de fluxo do tanque superior (em % da capacidade de abertura)
  - valor inicial deve ser 0%
  - só pode ser aberta caso a comporta_03 já esteja aberta
  - a % de abertura máxima é definida pela % de abertura da comporta_03 — isto é, caso a comporta_03 esteja 70% aberta, a comporta_02 só pode abrir até 70%
  - a % de abertura da comporta implica diretamente no valor medido pelo sensor_fluxo_01
  - 0% de abertura implica que a comporta está fechada e a vazão de saída do sensor_fluxo_01 é 0m³/h
  - 100% de abertura implica que a comporta está completamente aberta e a vazão de saída está no seu valor máximo — 200m³/h
  - o valor pode variar de acordo com a necessidade de manter o tanque superior próximo de 90% da capacidade — sendo acionado manualmente pelo painel de monitoramento

- **sensor_fluxo_01** — Mede a vazão de saída de água do tanque superior para dentro da barragem (em metros cúbicos por hora)
  - valor inicial é definido pela % de abertura da comporta_02
  - `sensor_fluxo_01 = (comporta_02% / 100) × 200 m³/h`
  - o valor lido implica diretamente no sensor_turbina_01

### Sensores do Tanque Inferior

- **sensor_volume_02** — Mede volume estimado armazenado do tanque inferior (em % da capacidade máxima)
  - valor inicial deve ser 0%
  - o volume varia de acordo com a taxa de enchimento lida pelo sensor_fluxo_02 e pelo sensor_esvaziamento_01, podendo aumentar ou diminuir, dependendo dos valores
  - o volume também pode variar de acordo com o valor lido pelo sensor_chuva_01 (ver conversão acima)
  - estado operacional ideal: próximo de 90% da capacidade

- **sensor_comporta_03** — Indica estado atual da comporta da barragem do tanque inferior (em % da capacidade de abertura)
  - valor inicial deve ser 0%
  - a % de abertura da comporta implica diretamente no valor máximo medido pelo sensor_fluxo_02
  - 0% de abertura implica que a comporta está fechada e a vazão de saída do sensor_fluxo_02 é 0m³/h
  - 100% de abertura implica que a comporta está completamente aberta e o potencial de vazão de saída está no seu valor máximo — 200m³/h
  - o valor pode variar de acordo com a necessidade de manter o tanque inferior próximo de 90% da capacidade — sendo acionado manualmente pelo painel de monitoramento

- **sensor_fluxo_02** — Mede a vazão de saída de água vinda do interior da barragem (em metros cúbicos por hora)
  - a comporta_03 define a capacidade de vazão máxima (`comporta_03% × 200m³/h`)
  - o sensor_fluxo_01 (ou equivalentemente a comporta_02) limita o valor real lido
  - portanto: `sensor_fluxo_02 = min((comporta_03% / 100) × 200, sensor_fluxo_01)`  [m³/h]
  - exemplo: se comporta_03 = 100% (capacidade de 200m³/h) e sensor_fluxo_01 = 100m³/h, então sensor_fluxo_02 = 100m³/h

- **sensor_comporta_04** — Indica estado atual da comporta de esvaziamento do tanque inferior (em % da capacidade de abertura)
  - valor inicial deve ser 0%
  - a % de abertura da comporta implica diretamente no valor medido pelo sensor_esvaziamento_01
  - 0% de abertura implica que a comporta está fechada e a vazão de saída do sensor_esvaziamento_01 é 0m³/h
  - 100% de abertura implica que a comporta está completamente aberta e a vazão de saída do sensor_esvaziamento_01 está no seu valor máximo — 200m³/h
  - o valor pode variar de acordo com a necessidade de manter o tanque inferior próximo de 90% da capacidade — sendo acionado manualmente pelo painel de monitoramento

- **sensor_esvaziamento_01** — Mede a taxa de esvaziamento do tanque inferior para o deságue (em metros cúbicos por hora)
  - valor inicial é definido pela % de abertura da comporta_04
  - `sensor_esvaziamento_01 = (comporta_04% / 100) × 200 m³/h`
  - o valor deve variar de acordo com a necessidade de manter o tanque inferior próximo de 90% da capacidade

### Sensores da Barragem

- **sensor_chuva_01** — Mede o volume de chuva atual (em milímetros por hora)
  - o valor deve variar diariamente de acordo com o estado de chuva, sempre seguindo uma tendência de aumento ou diminuição — isto é, caso esteja em um período sem chuva nos últimos 7 dias, o valor deve diminuir diariamente até que chova novamente, e caso a chuva seja contínua, o valor deve aumentar, e ao parar, ir diminuindo diariamente por até 7 dias, e caso chova novamente durante o período de 7 dias, o valor aumenta novamente, e ao encerrar, volta a diminuir continuamente por até 7 dias

- **sensor_chuva_02** — Mede o volume de chuva acumulado no último mês (em milímetros)
  - a cada tick do loop de simulação (1 hora simulada), o acumulado é atualizado:
    `sensor_chuva_02 += sensor_chuva_01 × 1h`  [mm]
  - o acumulado corresponde sempre à soma dos últimos 720 ticks de simulação (= 720 horas simuladas = 30 dias simulados); leituras mais antigas são descartadas da janela
  - este valor é usado diretamente como `chuva_acumulada` na fórmula `capacidade_atual` do sensor_enchimento_01

- **sensor_turbina_01** — Indica o estado atual da turbina da passagem de água (ligado ou desligado)
  - o valor inicial deve ser desligado
  - o estado da turbina é **controlado de forma independente** das comportas — definido pela sequência de startup (Seção 9), pelo algoritmo de ajuste automático (Seção 8) ou por comando explícito via `/engine/adjust` (campo `turbina`)
  - regra operacional: a turbina **deve** estar ligada sempre que as comportas 02 e 03 estiverem abertas, e desligada quando estiverem fechadas; qualquer desvio é detectado como risco (ver Riscos 8 e 9 na Seção 6)
  - o motor de simulação (`compute_tick`) **não** deriva o estado da turbina — apenas lê `state.sensor_turbina_01` para calcular `sensor_energia_01`

- **sensor_energia_01** — Mede a quantidade de energia sendo gerada pela turbina (em kilowats por hora)
  - o valor só irá variar caso a turbina 01 esteja ligada, caso contrário o valor lido é 0
  - caso a turbina esteja ligada, o valor de energia gerado deve variar de acordo com a leitura do sensor_fluxo_01
  - caso o sensor_fluxo_01 seja 0m³/h, a geração de energia é 0kw/h
  - caso o sensor_fluxo_01 seja 200m³/h, a geração de energia é 10000kw/h
  - a relação é linear: `sensor_energia_01 (kw/h) = sensor_fluxo_01 (m³/h) × 50`

Cada leitura pode ter algo assim:
- timestamp, id_sensor, valor, unidade

Exemplos:
- `24-03-2026T14:30:00, sensor_volume_01 → 82.4%`
- `17-05-2026T03:30:00, sensor_chuva_01 → 30 mm/h`

---

## 5. Dados importantes para cálculo de riscos

O backend não precisa apenas mostrar valores brutos. Ele deve interpretar esses valores.

Os mais importantes para cálculo de risco são:

- **volume de água em cada tanque**
  - o volume de água é um indicador para controlar as comportas e as vazões de água existentes na barragem
  - o estado operacional ideal é que ambos os tanques mantenham um volume próximo de 90% da capacidade
  - caso os tanques estejam acima de 90% com taxa de enchimento maior que o esvaziamento, ou abaixo de 20% com taxa de esvaziamento maior que o enchimento, as comportas devem ser ajustadas
  - uma diferença de 20% ou mais entre os volumes do tanque superior e do tanque inferior é considerada um alerta

- **taxa de enchimento e esvaziamento em cada tanque**
  - essas taxas devem variar de acordo com a necessidade atual, mas se encherem ou esvaziarem os tanques rapidamente podem causar riscos
  - essas taxas devem ser usadas para calcular os riscos de transbordamento ou esvaziamento dos tanques constantemente

- **volume de chuva**
  - afeta a taxa de enchimento de ambos os tanques (ver conversão na seção 4), portanto deve ser incluída no cálculo de risco

- **estado atual das comportas**
  - as comportas afetam e controlam diretamente o fluxo de enchimento e esvaziamento dos tanques, além do fluxo de água que passa pela turbina, portanto devem ser controladas constantemente para evitar situações de riscos
  - as comportas 02 e 03 podem estar em estados diferentes de abertura, e isso gera um alerta — o estado ideal é que ambas estejam no mesmo percentual de abertura
  - a comporta_02 não pode ultrapassar a abertura da comporta_03 (restrição operacional)

- **estado atual da turbina**
  - a turbina deve estar ligada caso as comportas 02 e 03 estejam abertas, e desligada quando estiverem fechadas, caso contrário isto é um risco

---

## 5.1 Mecanismo de Previsão de Limite dos Tanques

A cada ciclo de leitura (a cada 1 segundo real), além do cálculo de riscos por regras da Seção 6, o backend executa uma projeção linear do volume de cada tanque com base nas taxas de fluxo atuais. O objetivo é antecipar se algum tanque atingirá 100% (transbordamento) ou 0% (esvaziamento total) dentro de um horizonte de tempo, pausando a simulação preventivamente antes que o limite seja atingido.

### Fórmulas de projeção

**Para o tanque superior:**

```
taxa_liquida_01 = sensor_enchimento_01 + contribuição_chuva − sensor_fluxo_01  [m³/h]
```

Se `taxa_liquida_01 > 0` (enchendo):
```
volume_restante_m3 = (1 − volume_01% / 100) × 10.000  [m³]
tempo_para_overflow_01 = volume_restante_m3 / taxa_liquida_01  [horas simuladas]
```

Se `taxa_liquida_01 < 0` (esvaziando):
```
volume_atual_m3 = (volume_01% / 100) × 10.000  [m³]
tempo_para_vazio_01 = volume_atual_m3 / |taxa_liquida_01|  [horas simuladas]
```

*(volume_01% é sempre expresso como percentual 0–100, consistente com a Seção 4)*

**Para o tanque inferior:**

```
taxa_liquida_02 = sensor_fluxo_02 + contribuição_chuva − sensor_esvaziamento_01  [m³/h]
```

Se `taxa_liquida_02 > 0` (enchendo):
```
volume_restante_m3 = (1 − volume_02% / 100) × 10.000  [m³]
tempo_para_overflow_02 = volume_restante_m3 / taxa_liquida_02  [horas simuladas]
```

Se `taxa_liquida_02 < 0` (esvaziando):
```
volume_atual_m3 = (volume_02% / 100) × 10.000  [m³]
tempo_para_vazio_02 = volume_atual_m3 / |taxa_liquida_02|  [horas simuladas]
```

### Limiares e estados

Tempo projetado para atingir o limite (transbordamento **ou** esvaziamento):

| Tempo projetado | Estado | Ação |
|---|---|---|
| Entre 24h e 48h simuladas | **ALERTA** | exibido no painel; simulação continua |
| Menor que 24h simuladas | **CRÍTICO** | simulação pausada imediatamente |

### Comportamento ao entrar em estado CRÍTICO por previsão

1. A simulação é pausada imediatamente no ciclo atual
2. Um alerta de previsão crítica é registrado no histórico com o timestamp simulado, o tanque afetado, o tempo projetado e as leituras dos sensores envolvidos
3. O botão de ajuste de comportas é habilitado no Painel de Monitoramento
4. A simulação permanece pausada até que o botão de ajuste seja acionado
5. Ao clicar no botão, o backend recalcula os ajustes necessários nas comportas para afastar o volume do limite e retoma a simulação

### Formato das mensagens de alerta de previsão

#### Previsão de ALERTA — Transbordamento no Tanque Superior (ALERTA)
```
"DD de Mês de AAAA, às HH:MM - ALERTA: Previsão de transbordamento no Tanque Superior
em aproximadamente {X}h. Ajuste as comportas para evitar a situação crítica."
  sensor_volume_01: {valor}%
  taxa_liquida_01: {valor} m³/h
  tempo_projetado: {X} horas simuladas
```

#### Previsão de ALERTA — Esvaziamento no Tanque Superior (ALERTA)
```
"DD de Mês de AAAA, às HH:MM - ALERTA: Previsão de esvaziamento no Tanque Superior
em aproximadamente {X}h. Ajuste as comportas para evitar a situação crítica."
  sensor_volume_01: {valor}%
  taxa_liquida_01: {valor} m³/h  (valor negativo)
  tempo_projetado: {X} horas simuladas
```

#### Previsão Crítica — Transbordamento no Tanque Superior (CRÍTICA)
```
"DD de Mês de AAAA, às HH:MM - CRÍTICO: Previsão de transbordamento no Tanque Superior
em aproximadamente {X}h. Simulação pausada para intervenção."
  sensor_volume_01: {valor}%
  taxa_liquida_01: {valor} m³/h
  tempo_projetado: {X} horas simuladas
```

#### Previsão Crítica — Esvaziamento no Tanque Superior (CRÍTICA)
```
"DD de Mês de AAAA, às HH:MM - CRÍTICO: Previsão de esvaziamento no Tanque Superior
em aproximadamente {X}h. Simulação pausada para intervenção."
  sensor_volume_01: {valor}%
  taxa_liquida_01: {valor} m³/h  (valor negativo)
  tempo_projetado: {X} horas simuladas
```

#### Previsão de ALERTA — Transbordamento no Tanque Inferior (ALERTA)
```
"DD de Mês de AAAA, às HH:MM - ALERTA: Previsão de transbordamento no Tanque Inferior
em aproximadamente {X}h. Ajuste as comportas para evitar a situação crítica."
  sensor_volume_02: {valor}%
  taxa_liquida_02: {valor} m³/h
  tempo_projetado: {X} horas simuladas
```

#### Previsão de ALERTA — Esvaziamento no Tanque Inferior (ALERTA)
```
"DD de Mês de AAAA, às HH:MM - ALERTA: Previsão de esvaziamento no Tanque Inferior
em aproximadamente {X}h. Ajuste as comportas para evitar a situação crítica."
  sensor_volume_02: {valor}%
  taxa_liquida_02: {valor} m³/h  (valor negativo)
  tempo_projetado: {X} horas simuladas
```

#### Previsão Crítica — Transbordamento no Tanque Inferior (CRÍTICA)
```
"DD de Mês de AAAA, às HH:MM - CRÍTICO: Previsão de transbordamento no Tanque Inferior
em aproximadamente {X}h. Simulação pausada para intervenção."
  sensor_volume_02: {valor}%
  taxa_liquida_02: {valor} m³/h
  tempo_projetado: {X} horas simuladas
```

#### Previsão Crítica — Esvaziamento no Tanque Inferior (CRÍTICA)
```
"DD de Mês de AAAA, às HH:MM - CRÍTICO: Previsão de esvaziamento no Tanque Inferior
em aproximadamente {X}h. Simulação pausada para intervenção."
  sensor_volume_02: {valor}%
  taxa_liquida_02: {valor} m³/h  (valor negativo)
  tempo_projetado: {X} horas simuladas
```

### Observações
- A projeção é linear — assume que as taxas de fluxo permanecem constantes. Ela não prevê variações futuras de chuva ou mudanças nas comportas, sendo portanto conservadora
- Quando a simulação está pausada por previsão crítica, os sensores continuam exibindo os valores do momento da pausa. Apenas o ticker de avanço do tempo simulado é suspenso
- O mecanismo de previsão é executado em paralelo com o cálculo de riscos da Seção 6, e não substitui os riscos reativos — ambos coexistem
- A previsão de esvaziamento espelha a lógica de transbordamento: aplica-se quando `taxa_liquida < 0` e o tanque está se esvaziando em direção a 0%

---

## 6. Riscos que o sistema pode calcular

O projeto possui um cálculo simples de riscos por regras, sendo eles:

#### 1. Risco de Transbordamento — Tanque Superior (ALTA)
```
sensor_volume_01 > 90%
E (sensor_enchimento_01 + contribuição_chuva) > sensor_fluxo_01
→ ALERTA: risco de transbordamento iminente no tanque superior
```
*(contribuição_chuva = sensor_chuva_01 em m³/h, ver Seção 4)*

#### 2. Risco de Esvaziamento — Tanque Superior (MÉDIA)
```
sensor_volume_01 < 20%
E sensor_fluxo_01 > sensor_enchimento_01
→ ALERTA: tanque superior sendo drenado sem reposição suficiente
```

#### 3. Risco de Enchimento Estagnado — Tanque Superior (BAIXA)
```
sensor_volume_01 < 20%
E sensor_enchimento_01 = 0
E sensor_comporta_01 = 0%
→ ALERTA: sem entrada de água no tanque superior
```

#### 4. Risco de Transbordamento — Tanque Inferior (ALTA)
```
sensor_volume_02 > 90%
E sensor_fluxo_02 > sensor_esvaziamento_01
→ ALERTA: risco de transbordamento iminente no tanque inferior
```

#### 5. Risco de Esvaziamento — Tanque Inferior (MÉDIA)
```
sensor_volume_02 < 20%
E sensor_esvaziamento_01 > sensor_fluxo_02
→ ALERTA: tanque inferior sendo drenado sem reposição suficiente
```

#### 6. Risco de Desbalanceamento entre Comporta_02 e Comporta_03 (MÉDIA)
```
sensor_comporta_02 ≠ sensor_comporta_03
→ ALERTA: comportas do interior da barragem em estados diferentes
→ estado ideal: comporta_02 = comporta_03
```

#### 7. Risco de Comporta_02 Excedendo Comporta_03 (CRÍTICA)
```
sensor_comporta_02 > sensor_comporta_03
→ CRÍTICO: violação de restrição operacional — comporta_02 não pode exceder a abertura da comporta_03
```

#### 8. Risco de Turbina Desligada com Comportas Abertas (ALTA)
```
sensor_turbina_01 = DESLIGADO
E sensor_comporta_02 > 0%
E sensor_comporta_03 > 0%
→ ALERTA: água passando pelo interior da barragem com a turbina desativada
```

#### 9. Risco de Turbina Ligada sem Fluxo (CRÍTICA)
```
sensor_turbina_01 = LIGADO
E sensor_fluxo_01 = 0
→ CRÍTICO: turbina operando sem passagem de água — risco de dano mecânico
```

#### 10. Risco de Desequilíbrio entre Tanques (BAIXA)
```
|sensor_volume_01 - sensor_volume_02| ≥ 20%
→ ALERTA: diferença significativa entre os volumes dos dois tanques — fora do estado operacional ideal
```

---

## 7. Saída dos Cálculos de Risco

A cada ciclo de leitura, o backend contabiliza o total de riscos ativos e determina o nível de alerta geral da barragem:

```
0 riscos ativos  → VERDE    - Normal
1 risco ativo    → AMARELO  - Atenção
2 riscos ativos  → LARANJA  - Risco
3+ riscos ativos → VERMELHO - Crítico
```

O nível de alerta e os tipos de risco predominantes são exibidos no topo do Painel de Monitoramento e salvos no histórico de alertas junto com as mensagens geradas.

### Formato das Mensagens de Alerta

Cada risco ativo gera uma entrada no histórico de alertas com:
- timestamp formatado: "DD de Mês de AAAA, às HH:MM"
- descrição textual identificando o risco e as causas detectadas
- leituras dos sensores envolvidos no momento da detecção

### Mensagens e Leituras por Risco

#### Risco 1 — Transbordamento no Tanque Superior (ALTA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Risco de Transbordamento no Tanque Superior por alto volume de água, excesso de chuva e valor de enchimento maior que o de vazão."`  
Leituras:
```
sensor_volume_01: {valor}%
sensor_chuva_01: {valor} mm/h
sensor_enchimento_01: {valor} m³/h
sensor_fluxo_01: {valor} m³/h
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Risco de Transbordamento no Tanque Superior por alto volume de água, excesso de chuva e valor de enchimento maior que o de vazão."`
```
sensor_volume_01: 92%
sensor_chuva_01: 100 mm/h
sensor_enchimento_01: 200 m³/h
sensor_fluxo_01: 180 m³/h
```

#### Risco 2 — Esvaziamento no Tanque Superior (MÉDIA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Risco de Esvaziamento no Tanque Superior por volume baixo e vazão de saída superior à taxa de enchimento."`  
Leituras:
```
sensor_volume_01: {valor}%
sensor_enchimento_01: {valor} m³/h
sensor_fluxo_01: {valor} m³/h
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Risco de Esvaziamento no Tanque Superior por volume baixo e vazão de saída superior à taxa de enchimento."`
```
sensor_volume_01: 15%
sensor_enchimento_01: 40 m³/h
sensor_fluxo_01: 120 m³/h
```

#### Risco 3 — Enchimento Estagnado no Tanque Superior (BAIXA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Tanque Superior com volume baixo e sem entrada de água ativa. Comporta de enchimento está fechada."`  
Leituras:
```
sensor_volume_01: {valor}%
sensor_enchimento_01: {valor} m³/h
sensor_comporta_01: {valor}%
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Tanque Superior com volume baixo e sem entrada de água ativa. Comporta de enchimento está fechada."`
```
sensor_volume_01: 12%
sensor_enchimento_01: 0 m³/h
sensor_comporta_01: 0%
```

#### Risco 4 — Transbordamento no Tanque Inferior (ALTA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Risco de Transbordamento no Tanque Inferior por volume elevado e fluxo de entrada superior à taxa de esvaziamento."`  
Leituras:
```
sensor_volume_02: {valor}%
sensor_fluxo_02: {valor} m³/h
sensor_esvaziamento_01: {valor} m³/h
sensor_chuva_01: {valor} mm/h
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Risco de Transbordamento no Tanque Inferior por volume elevado e fluxo de entrada superior à taxa de esvaziamento."`
```
sensor_volume_02: 93%
sensor_fluxo_02: 160 m³/h
sensor_esvaziamento_01: 80 m³/h
sensor_chuva_01: 30 mm/h
```

#### Risco 5 — Esvaziamento no Tanque Inferior (MÉDIA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Risco de Esvaziamento no Tanque Inferior por volume baixo e taxa de esvaziamento superior ao fluxo de entrada."`  
Leituras:
```
sensor_volume_02: {valor}%
sensor_fluxo_02: {valor} m³/h
sensor_esvaziamento_01: {valor} m³/h
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Risco de Esvaziamento no Tanque Inferior por volume baixo e taxa de esvaziamento superior ao fluxo de entrada."`
```
sensor_volume_02: 17%
sensor_fluxo_02: 30 m³/h
sensor_esvaziamento_01: 140 m³/h
```

#### Risco 6 — Desbalanceamento entre Comporta_02 e Comporta_03 (MÉDIA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Comportas do interior da barragem em estados de abertura diferentes. O estado ideal é que ambas estejam no mesmo percentual."`  
Leituras:
```
sensor_comporta_02: {valor}%
sensor_comporta_03: {valor}%
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Comportas do interior da barragem em estados de abertura diferentes. O estado ideal é que ambas estejam no mesmo percentual."`
```
sensor_comporta_02: 40%
sensor_comporta_03: 70%
```

#### Risco 7 — Comporta_02 Excedendo Comporta_03 (CRÍTICA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - CRÍTICO: Violação operacional detectada. A comporta de fluxo do tanque superior está mais aberta do que a comporta da barragem, o que não é permitido."`  
Leituras:
```
sensor_comporta_02: {valor}%
sensor_comporta_03: {valor}%
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - CRÍTICO: Violação operacional detectada. A comporta de fluxo do tanque superior está mais aberta do que a comporta da barragem, o que não é permitido."`
```
sensor_comporta_02: 80%
sensor_comporta_03: 60%
```

#### Risco 8 — Turbina Desligada com Comportas Abertas (ALTA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Água circulando pelo interior da barragem com a turbina desligada. A turbina deve estar ativa sempre que as comportas 02 e 03 estiverem abertas."`  
Leituras:
```
sensor_turbina_01: {valor}
sensor_comporta_02: {valor}%
sensor_comporta_03: {valor}%
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Água circulando pelo interior da barragem com a turbina desligada. A turbina deve estar ativa sempre que as comportas 02 e 03 estiverem abertas."`
```
sensor_turbina_01: DESLIGADO
sensor_comporta_02: 50%
sensor_comporta_03: 50%
```

#### Risco 9 — Turbina Ligada sem Fluxo (CRÍTICA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - CRÍTICO: Turbina em operação sem passagem de água. Risco de dano mecânico iminente."`  
Leituras:
```
sensor_turbina_01: {valor}
sensor_fluxo_01: {valor} m³/h
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - CRÍTICO: Turbina em operação sem passagem de água. Risco de dano mecânico iminente."`
```
sensor_turbina_01: LIGADO
sensor_fluxo_01: 0 m³/h
```

#### Risco 10 — Desequilíbrio entre Tanques (BAIXA)
Mensagem: `"DD de Mês de AAAA, às HH:MM - Diferença significativa entre os volumes dos tanques superior e inferior. O estado ideal é que ambos se mantenham próximos de 90%."`  
Leituras:
```
sensor_volume_01: {valor}%
sensor_volume_02: {valor}%
```
Exemplo:  
Mensagem: `"24 de Março de 2026, às 14:30 - Diferença significativa entre os volumes dos tanques superior e inferior. O estado ideal é que ambos se mantenham próximos de 90%."`
```
sensor_volume_01: 88%
sensor_volume_02: 61%
```

---

## 8. Frontend 1 — Painel de Monitoramento

Esse painel será usado para visualizar a simulação da barragem em tempo real.

### O que mostrar
- data e horário atual da simulação;
- leituras atuais de cada um dos sensores;
- status atual da barragem (com base na quantidade riscos);
- riscos atuais ativos;
- gráfico de quantidade de riscos no últimos mês;
- gráficos de volume da água em cada tanque no último mês;
- gráfico do volume de chuva no último mês;
- gráfico de energia gerada no último mês;
- histórico recente de alertas;
- mecanismo de ajuste automático de comportas, acionado manualmente:
  - um botão de ajuste fica ativo no Painel de Monitoramento sempre que um ou mais riscos estiverem presentes ou a simulação estiver pausada por previsão crítica;
  - ao clicar no botão, o backend calcula os ajustes necessários nas comportas para eliminar os riscos ativos — deve estar alinhado e conectado com as simulações;
  - os ajustes buscam levar ambos os tanques ao estado operacional ideal (~90% de volume);
  - **algoritmo de ajuste**: para cada tanque, o backend avalia a direção do desvio e ajusta as comportas correspondentes:
    - tanque superior acima de 90% → reduzir comporta_01 e/ou aumentar comporta_02;
    - tanque superior abaixo de 20% → aumentar comporta_01 e/ou reduzir comporta_02;
    - tanque inferior acima de 90% → reduzir comporta_03 e/ou aumentar comporta_04;
    - tanque inferior abaixo de 20% → aumentar comporta_03 e/ou reduzir comporta_04;
    - a restrição comporta_02 ≤ comporta_03 deve ser sempre respeitada durante o ajuste;
    - após calcular os novos valores das comportas, definir o estado da turbina para manter o invariante operacional: `turbina = "LIGADO"` se `comporta_02 > 0` E `comporta_03 > 0`; caso contrário `"DESLIGADO"` (evita disparar os Riscos 8 e 9);
  - após o cálculo, os novos estados das comportas são aplicados e o painel de monitoramento reflete imediatamente os efeitos.

### Componentes visuais
- cards
- gráfico de linha para evolução temporal
- alertas coloridos:
  - verde = normal
  - amarelo = atenção
  - laranja = risco
  - vermelho = crítico

---

## 9. Frontend 2 — Painel de Simulação

O painel de simulação é responsável por dar início na simulação em tempo real da barragem. Esse painel será usado para controlar a barragem e simular diferentes cenários. Cada ação realizada no painel de simulação deve agir em um tempo simulado. Ou seja, as ações tomam tempo para agir na barragem. Por exemplo, abrir uma comporta para encher um tanque pode demorar dias, e estes intervalos de tempo devem ser calculados antes de realizar a simulação, e refletir suas mudanças no painel de monitoramento. Uma vez que uma simulação de um cenário se encerra, os dados alterados durante o processo devem persistir e devem ser refletidos no painel de monitoramento.

Neste painel deve haver botões para:

- **iniciar a barragem**
  - estado inicial dos sensores:
    - comportas 0%
    - volume dos tanques 0%
    - turbina desligada
    - sensores de enchimento, esvaziamento e fluxo em 0
    - sensores de chuva em 0
  - abre comporta_01 em sua capacidade máxima para encher o tanque superior
  - uma vez que o tanque superior atingir ≥ 90% de volume (estado operacional ideal), abre a comporta_02 e comporta_03 em suas capacidades máximas, e liga a turbina_01 simultaneamente para dar início à geração de energia, e para encher o tanque inferior
  - uma vez que o tanque inferior atingir ≥ 90% de volume, todas as comportas devem se ajustar para que o volume de ambos os tanques se mantenham próximo dos 90%
  - uma vez que ambos os tanques estejam próximos dos 90% de volume, o processo de início da barragem é encerrado, e o cenário é persistido como o estado atual, em tempo real simulado, da barragem

- **simular chuva intensa** (selecionar período de chuva intensa)
  - o sensor_chuva_01 passa a registrar 20mm/h de forma fixa durante o período selecionado (1, 7 ou 15 dias simulados), sobrepondo a série de chuva gerada
  - o sensor_chuva_02 (acumulado) começa a subir progressivamente, aumentando a capacidade de enchimento
  - os volumes dos tanques começam a variar
  - uma vez que os volumes dos tanques atingem um estado de risco, um sinal de alerta é enviado para o painel de monitoramento, habilitando o botão de ajuste das comportas
  - a simulação da barragem e da chuva intensa são pausados até o botão de ajuste ser clicado
  - uma vez que o botão é clicado as simulações retomam do estado que estavam e as comportas começam a se ajustar para suportar a chuva e manter um estado estável
  - uma vez que o período de chuva encerra, a série de chuva original é retomada, e o cenário é persistido como o estado atual, em tempo real simulado, da barragem

- **simular período de seca** (selecionar período sem chover)
  - o sensor_chuva_01 é fixado em 0mm/h durante todo o período selecionado, sobrepondo a série de chuva gerada
  - os volumes dos tanques começam a variar
  - uma vez que os volumes dos tanques atingem um estado de risco, um sinal de alerta é enviado para o painel de monitoramento, habilitando o botão de ajuste das comportas
  - a simulação da barragem e do período de seca são pausados até o botão de ajuste ser clicado
  - uma vez que o botão é clicado as simulações retomam do estado que estavam e as comportas começam a se ajustar para suportar a seca e manter um estado estável
  - uma vez que o período de seca encerra, o processo de simulação de seca é encerrado, e o cenário é persistido como o estado atual, em tempo real simulado, da barragem

### Simulação 1:
Chuva Intensa — fixa o sensor_chuva_01 em 20mm/h durante o período selecionado, sobrepondo a série de chuva gerada  
Tempo de Duração:
- 1 dia
- 7 dias
- 15 dias

Efeito:
- sensor_chuva_01 fixado em 20mm/h durante o período
- contribuição_chuva aumenta para 20 m³/h em ambos os tanques
- sensor_chuva_02 (acumulado) sobe progressivamente, aumentando a capacidade_atual do sensor_enchimento_01
- ao fim do período, a série de chuva original é retomada

### Simulação 2:
Dias de seca — fixa o sensor_chuva_01 em 0mm/h durante o período selecionado, sobrepondo a série de chuva gerada  
Tempo de Duração:
- 15 dias
- 30 dias
- 60 dias

Efeito:
- sensor_chuva_01 fixado em 0mm/h durante o período
- sensor_chuva_02 (acumulado) cai progressivamente, reduzindo a capacidade_atual do sensor_enchimento_01
- ao fim do período, a série de chuva original é retomada

---

## 10. Mapeamento com os Pilares da Disciplina

- **Virtualização**
  - cada serviço roda em um container Docker isolado
  - o docker-compose.yml orquestra os 4 containers

- **Computação Distribuída**
  - Simulation Engine e Backend API são processos independentes que se comunicam via HTTP/WebSocket
  - os dois frontends consomem a mesma API em paralelo

- **Computação Utilitária**
  - o projeto pode ser implantado em uma VM na nuvem (AWS EC2, GCP Compute Engine ou Oracle Cloud Free Tier — ainda vai ser definido)
  - os serviços são provisionados e destruídos sob demanda

- **Computação Autônoma**
  - o motor de risco + mecanismo de previsão + ajuste automático de comportas é o componente self-managing: monitora, detecta anomalias e reage sem intervenção humana até o ponto de pausa

---

## 11. Stack Tecnológico

### Backend + Simulation Engine: Python com FastAPI
- `fastapi` — framework web com WebSocket nativo
- `uvicorn` — ASGI server
- `sqlalchemy` — ORM
- `asyncpg` — driver PostgreSQL assíncrono
- `apscheduler` — scheduler para os dois loops independentes
- `pydantic` — validação dos modelos de sensores

**Dois loops gerenciados pelo APScheduler:**
- **Loop de simulação** — intervalo dinâmico de `1.0 / fator_aceleração` segundos; cada disparo executa 1 tick (1 hora simulada); atualiza estado interno, sensores, chuva acumulada
- **Loop de display** — intervalo fixo de 1 segundo real; lê estado atual, persiste no PostgreSQL, calcula riscos, executa previsão de limites, envia broadcast WebSocket

**Justificativa**
- FastAPI tem suporte nativo a WebSocket assíncrono — exatamente o que o projeto precisa
- APScheduler permite gerenciar os dois loops com intervalos independentes e alterar o intervalo do loop de simulação em tempo de execução ao mudar o fator_aceleração
- Pydantic garante tipagem forte nos modelos de sensores (timestamp, id_sensor, valor, unidade)
- Python é amplamente utilizado em projetos de IoT e simulação

### Banco de dados: PostgreSQL
- leituras de sensores têm estrutura tabular simples com timestamp
- queries de histórico mensal (para os gráficos) são diretas com SQL
- gratuito, open-source, robusto

### Frontend: React + TypeScript
- `react + typescript` — base
- `recharts` — gráficos de linha (histórico mensal)
- `WebSocket nativo (browser API)` — comunicação em tempo real com o backend FastAPI; reconnect gerenciado pelo frontend
- `zustand ou context` — estado global dos sensores
- `tailwindcss` — estilização rápida

### Containerização: Docker + Docker Compose

4 containers:
- `simulation-engine` — processo Python com APScheduler
- `backend-api` — FastAPI + WebSocket
- `postgres` — banco de dados
- `frontend` — ambos os painéis React servidos por nginx

---

## 12. Fluxo de Dados em Tempo Real

O sistema opera com dois loops assíncronos independentes:

**Loop de Simulação** — frequência dinâmica (`1.0 / fator_aceleração` Hz):
```
[APScheduler @ 1/fator_aceleração s]
  → Simulation Engine executa 1 tick (1 hora simulada)
  → Atualiza: simulated_hours, volumes, sensores derivados, sensor_chuva_02
  → Escreve estado em memória compartilhada (estado interno do engine)
```

**Loop de Display** — frequência fixa (1 Hz):
```
[APScheduler @ 1s]
  → Lê estado atual do Simulation Engine
  → Persiste leituras no PostgreSQL
  → Calcula 10 riscos (Seção 6)
  → Executa previsão de limites (Seção 5.1)
  → Se CRÍTICO: pausa loop de simulação
  → WebSocket broadcast para todos os clientes conectados
  → Frontend 1 (Monitoramento) e Frontend 2 (Simulação) atualizam em tempo real
```

**Mudança de velocidade** (via Painel de Simulação):
```
POST /simulation/speed  { fator_aceleracao: X }
  → APScheduler reescalona o loop de simulação para novo intervalo (1.0 / X segundos)
  → Loop de display permanece inalterado
```

---

## 13. Planejamento de Implementação

### Fase 1 — Infraestrutura

- Criar estrutura de diretórios do projeto (`/simulation-engine`, `/backend-api`, `/frontend`, `/postgres`)
- Criar `docker-compose.yml` com os 4 containers:
  - `simulation-engine` — processo Python isolado
  - `backend-api` — FastAPI + WebSocket
  - `postgres` — banco de dados
  - `frontend` — painéis React servidos por nginx
- Criar `Dockerfile` para cada serviço
- Criar `.env` com variáveis de ambiente (DATABASE_URL, portas, segredos)
- Validar que todos os containers sobem, se comunicam e reiniciam em caso de falha

### Fase 2 — Banco de Dados

Definir e aplicar o schema PostgreSQL via Alembic:

- **`simulation_state`** — estado global da simulação
  - `simulated_hours`, `fator_aceleracao`, `paused` (bool), `rain_series` (JSON), `created_at`, `updated_at`
- **`sensor_readings`** — leituras históricas de sensores
  - `id`, `simulated_timestamp`, `sensor_id`, `valor`, `unidade`
  - índice em (`sensor_id`, `simulated_timestamp`) para queries de histórico mensal
- **`alert_history`** — histórico de alertas e previsões
  - `id`, `simulated_timestamp`, `tipo` (`risco` | `previsao`), `severidade`, `mensagem`, `leituras` (JSON)

### Fase 3 — Simulation Engine

Processo Python independente responsável pelo loop de simulação:

- **Geração da série de chuva**: ao iniciar a simulação, gerar aleatoriamente 52 tendências semanais e expandir para 364 valores diários de `sensor_chuva_01`
- **Modelo completo de sensores**: implementar todas as fórmulas das Seções 4 e 5 na ordem de dependência:
  1. `sensor_chuva_01` (leitura da série)
  2. `sensor_chuva_02` (janela deslizante de 720 ticks)
  3. `capacidade_atual` e `sensor_enchimento_01`
  4. `sensor_fluxo_01`, `sensor_fluxo_02`
  5. `sensor_esvaziamento_01`
  6. `sensor_turbina_01`, `sensor_energia_01`
  7. `sensor_volume_01`, `sensor_volume_02` (com clamp)
- **Loop de simulação**: APScheduler com intervalo dinâmico `1.0 / fator_aceleração`; cada tick executa 1 hora simulada
- **Controle de estado**: `fator_aceleração` mutável; reescalonamento do job ao mudar velocidade; flag `paused` pausa o loop de simulação sem encerrar o processo
- **Comunicação com Backend API**: HTTP POST `/internal/tick` enviando o estado completo dos sensores a cada tick do loop de simulação

### Fase 4 — Backend API

Serviço FastAPI com dois loops próprios via APScheduler:

- **Loop de display (1 Hz)**: receber estado do Simulation Engine, persistir no PostgreSQL, calcular riscos, executar previsão de limites, enviar broadcast WebSocket
- **Endpoints REST**:
  - `GET /state` — estado atual da simulação e leituras dos sensores
  - `POST /simulation/start` — iniciar sequência de startup da barragem
  - `POST /simulation/pause` — pausar manualmente a simulação (`paused_reason = "manual"`); idempotente; não sobrescreve pausa por previsão crítica
  - `POST /simulation/resume` — retomar simulação após pausa manual; rejeita (409) se pausa atual for `previsao_critica`
  - `POST /simulation/speed` — alterar `fator_aceleração`; reescalona loop de simulação
  - `POST /simulation/scenario` — iniciar simulação de chuva intensa ou seca com duração selecionada
  - `POST /simulation/adjust` — acionar ajuste automático de comportas e turbina; retoma simulação se pausada (por qualquer motivo)
  - `GET /history/alerts` — histórico de alertas (paginado)
  - `GET /history/sensors/{sensor_id}` — histórico de leituras de um sensor (últimas N horas simuladas)
- **WebSocket `/ws`**: broadcast do estado completo a cada tick do loop de display; gerenciar múltiplas conexões simultâneas
- **Endpoint interno `POST /internal/tick`**: recebe estado do Simulation Engine; atualiza estado em memória

### Fase 5 — Motor de Riscos + Previsão de Limite

Executado pelo Backend API a cada tick do loop de display:

- **Motor de riscos**: implementar as 10 regras da Seção 6; calcular nível de alerta geral (VERDE/AMARELO/LARANJA/VERMELHO); gerar mensagens formatadas conforme Seção 7
- **Mecanismo de previsão (Seção 5.1)**:
  - Calcular `taxa_liquida` para cada tanque
  - Se `taxa_liquida > 0`: calcular `tempo_para_overflow`
  - Se `taxa_liquida < 0`: calcular `tempo_para_vazio`
  - Comparar com limiares (24h → CRÍTICO, 48h → ALERTA)
  - Se CRÍTICO: sinalizar pausa ao Simulation Engine via flag compartilhada
- **Algoritmo de ajuste automático de comportas**: ao acionar o botão de ajuste, calcular novos valores de comportas para levar ambos os tanques a ~90%; respeitar restrição `comporta_02 ≤ comporta_03`; retomar simulação após aplicar ajustes

### Fase 6 — Frontend 1 (Painel de Monitoramento)

Aplicação React + TypeScript:

- **Conexão WebSocket nativa**: conectar ao `/ws` do backend; reconectar automaticamente em caso de queda
- **Relógio simulado**: exibir tempo no formato `Dia D, Mês M de AAAA, às HH:MM`
- **Cards de sensores**: um card por sensor com valor atual e unidade
- **Indicador de nível de alerta**: badge colorido (VERDE/AMARELO/LARANJA/VERMELHO) e lista de riscos ativos
- **Histórico de alertas**: tabela com as últimas mensagens de risco e previsão
- **Gráficos Recharts** (histórico das últimas 720 horas simuladas):
  - Volume por tanque (%)
  - Volume de chuva (mm/h)
  - Energia gerada (kw/h)
  - Quantidade de riscos ativos
- **Botão de ajuste de comportas**: habilitado quando há riscos ativos ou simulação pausada por previsão crítica; chama `POST /simulation/adjust`

### Fase 7 — Frontend 2 (Painel de Simulação)

Aplicação React + TypeScript (pode ser rota separada no mesmo build):

- **Barra de velocidade**: slider de 0.1x a 100x; chama `POST /simulation/speed` ao soltar
- **Botão "Iniciar Barragem"**: executa a sequência de startup (Seção 9); feedback visual do progresso (enchendo tanque superior → enchendo tanque inferior → ajustando para 90%)
- **Botão "Simular Chuva Intensa"**: seletor de duração (1 / 7 / 15 dias); chama `POST /simulation/scenario`
- **Botão "Simular Período de Seca"**: seletor de duração (15 / 30 / 60 dias); chama `POST /simulation/scenario`
- **Indicador de estado**: exibir se a simulação está rodando, pausada ou em cenário ativo

### Fase 8 — Integração e Testes

- Testar fluxo completo: inicialização → operação normal → chuva intensa → pausa por previsão crítica → ajuste → retomada
- Testar mudanças de velocidade em tempo de execução (0.1x ↔ 100x) sem perda de estado
- Validar que motor de riscos e previsão coexistem corretamente (ambos ativos em paralelo)
- Validar janela deslizante de `sensor_chuva_02` (720 ticks) com diferentes acelerações
- Validar broadcast WebSocket com múltiplos clientes conectados simultaneamente
- Ajustes finais de UI e responsividade
