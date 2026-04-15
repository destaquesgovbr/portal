# Transparência Algorítmica

O DestaquesGovBr é uma plataforma pública de informação governamental. Acreditamos que cidadãos têm o direito de entender como o conteúdo é organizado, priorizado e apresentado. Esta página documenta os algoritmos e critérios utilizados em cada seção da plataforma.

---

<span id="prateleira-de-clippings"></span>

## Galeria de Clippings

A Galeria de Clippings (`/clippings`) é o espaço onde cidadãos podem descobrir e seguir clippings temáticos publicados pela comunidade. Abaixo explicamos como funcionam a ordenação, os filtros e a curadoria algorítmica desta página.

### Ordenação "Mais recentes"

A ordenação padrão lista os clippings por **data de publicação no marketplace**, do mais recente ao mais antigo. Nenhum fator além da data influencia a posição. Esta é a ordenação default quando o usuário acessa a página pela primeira vez.

### Ordenação "Mais populares"

Calcula um **score de popularidade** para cada clipping com base no engajamento da comunidade:

> **Score = curtidas + (seguidores × 2)**

Seguidores têm peso maior que curtidas porque representam um compromisso mais duradouro — o cidadão optou por receber o conteúdo periodicamente, o que sinaliza maior relevância percebida.

### Ordenação "Em destaque"

Combina popularidade com **recência** para dar visibilidade a clippings novos que estão ganhando tração rapidamente. A fórmula:

> **Score = popularidade × boost de recência**
>
> **Boost de recência = 1 + max(0, 30 − dias desde publicação) / 30**

Na prática:
- Um clipping publicado **hoje** tem boost de **2×** (dobro da popularidade base)
- Um clipping publicado há **15 dias** tem boost de **1.5×**
- Um clipping publicado há **30+ dias** não recebe boost (multiplicador 1×)

O objetivo é que clippings recém-criados com engajamento inicial tenham chance de aparecer entre os mais visíveis, sem depender exclusivamente do volume acumulado de curtidas e seguidores.

### Chips temáticos dinâmicos

Os botões de filtro por tema (ex: "Meio Ambiente", "Cultura") são **calculados automaticamente** a partir dos dados. O sistema analisa todos os clippings publicados, identifica os temas mais frequentes nos recortes configurados, e exibe os **6 temas com maior presença**.

Se um novo tema se tornar popular entre os clippings publicados, ele aparecerá automaticamente como chip de filtro. Da mesma forma, temas pouco representados não são exibidos para evitar filtros sem resultados.

### Filtros de frequência

Os filtros "Diários" e "Dias úteis" categorizam clippings pela sua **frequência de publicação**, derivada do agendamento (cron schedule) configurado pelo autor:

- **Diários**: clippings que publicam todos os dias da semana
- **Dias úteis**: clippings que publicam de segunda a sexta-feira

### Busca por texto

A busca filtra clippings cujo **nome** ou **descrição curta** contenha o termo digitado. A filtragem é feita no navegador do usuário (client-side), sem envio de dados ao servidor, para proporcionar uma experiência de resposta instantânea.

---

## Uso de Inteligência Artificial Generativa

O DestaquesGovBr utiliza modelos de IA generativa em funcionalidades específicas. Os detalhes de cada uso serão documentados nesta seção à medida que forem implementados.

### Consolidação de digests (edições de clippings)

Cada edição de um clipping passa por um processo de **consolidação editorial** utilizando IA generativa (Claude 3 Haiku via AWS Bedrock). O modelo recebe os artigos selecionados pelos filtros do clipping e produz um resumo editorial estruturado, identificando fios narrativos, cruzando informações entre fontes e destacando implicações práticas.

O prompt utilizado pode ser personalizado pelo autor do clipping. O prompt padrão prioriza a identificação de temas dominantes, a criação de manchetes editoriais e o destaque de dados concretos (datas, valores, fatos-chave).

### Agente de recortes

O assistente de IA para criação de recortes utiliza Claude via AWS Bedrock com tool use para iterar sobre o índice de notícias (Typesense), calibrando temas, agências e palavras-chave até encontrar filtros com boa cobertura. O agente é transparente sobre seu processo de raciocínio, exibindo em tempo real as buscas realizadas e os resultados encontrados.
