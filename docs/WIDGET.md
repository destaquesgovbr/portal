# Widget Embarcável DGB - Documentação

## Visão Geral

O Widget Embarcável do Destaques Gov.br (DGB) permite que portais governamentais integrem facilmente notícias do DGB em suas páginas, com filtros configuráveis por órgãos e temas.

## Características

- **Filtros Configuráveis**: Filtre notícias por órgãos (até 20) e temas (até 10)
- **4 Layouts Disponíveis**: Lista, Grade 2 colunas, Grade 3 colunas, Carrossel
- **Responsivo**: Adapta-se automaticamente a diferentes tamanhos de tela
- **Identidade Visual Fixa**: Mantém a marca do DGB
- **Fácil Integração**: Basta copiar e colar um código iframe
- **Performance**: Cache ISR de 5 minutos, otimizado para carregamento rápido

## Como Usar

### 1. Acesse o Configurador

Visite [destaques.gov.br/widgets/configurador](https://destaques.gov.br/widgets/configurador)

### 2. Configure o Widget

**Passo 1: Filtros de Conteúdo**
- Selecione até 20 órgãos governamentais
- Selecione até 10 temas
- Deixe vazio para mostrar todas as notícias

**Passo 2: Layout e Tamanho**
- Escolha entre 4 layouts:
  - **Lista Vertical**: Ideal para sidebars
  - **Grade 2 Colunas**: Ideal para seções de conteúdo
  - **Grade 3 Colunas**: Ideal para hero sections
  - **Carrossel**: Ideal para destaques rotativos
- Escolha um tamanho: Pequeno, Médio, Grande ou Customizado

**Passo 3: Marca e Opções**
- Logo DGB (recomendado manter ativo)
- Link para portal DGB
- Tooltip com informações de filtros
- Quantidade de artigos por página (5-20)

**Passo 4: Copie o Código**
- Clique em "Copiar Código"
- Cole no HTML do seu site

### 3. Exemplo de Código

```html
<iframe
  src="https://destaques.gov.br/embed?c=eyJhZ2VuY2llcyI6W10sInRoZW1lcyI6W10sImxheW91dCI6Imxpc3QiLCJzaXplIjoibWVkaXVtIiwic2hvd0xvZ28iOnRydWUsInNob3dMaW5rIjp0cnVlLCJzaG93VG9vbHRpcCI6dHJ1ZSwiYXJ0aWNsZXNQZXJQYWdlIjoxMH0"
  width="400"
  height="600"
  frameborder="0"
  scrolling="auto"
  title="Widget DGB - Destaques Gov.br"
></iframe>
```

## Layouts

### Lista Vertical
- **Uso**: Sidebars, espaços estreitos
- **Tamanhos**:
  - Pequeno: 300×400px (5 artigos)
  - Médio: 400×600px (10 artigos)
  - Grande: 500×800px (15 artigos)

### Grade 2 Colunas
- **Uso**: Seções de conteúdo principal
- **Tamanhos**:
  - Pequeno: 600×400px (6 artigos)
  - Médio: 700×600px (10 artigos)
  - Grande: 800×800px (14 artigos)
- **Responsivo**: 1 coluna em mobile, 2 em desktop

### Grade 3 Colunas
- **Uso**: Hero sections, full-width
- **Tamanhos**:
  - Pequeno: 900×400px (9 artigos)
  - Médio: 1000×600px (12 artigos)
  - Grande: 1200×800px (18 artigos)
- **Responsivo**: 1 coluna em mobile, 2 em tablet, 3 em desktop

### Carrossel
- **Uso**: Destaques rotativos
- **Tamanhos**:
  - Pequeno: 400×300px (5 artigos)
  - Médio: 700×400px (10 artigos)
  - Grande: 1000×500px (15 artigos)
- **Recursos**: Auto-advance a cada 5s, navegação prev/next

## API REST

O widget também expõe uma API REST pública para integrações customizadas.

### GET /api/widgets/articles

Retorna artigos filtrados.

**Parâmetros:**
- `agencies` (opcional): Lista de chaves de órgãos separadas por vírgula
- `themes` (opcional): Lista de códigos de temas separados por vírgula
- `limit` (opcional): Número de artigos (1-50, padrão 10)
- `page` (opcional): Página de resultados (padrão 1)

**Exemplo:**
```bash
curl "https://destaques.gov.br/api/widgets/articles?agencies=minc,ibram&limit=5"
```

**Resposta:**
```json
{
  "articles": [...],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 156,
    "hasMore": true
  },
  "filters": {
    "agencies": ["minc", "ibram"],
    "themes": []
  }
}
```

### GET /api/widgets/config

Retorna listas de órgãos e temas disponíveis.

**Exemplo:**
```bash
curl "https://destaques.gov.br/api/widgets/config"
```

**Resposta:**
```json
{
  "agencies": [
    { "key": "minc", "name": "Ministério da Cultura", "type": "Ministérios" }
  ],
  "themes": [
    { "key": "08", "name": "Cultura", "hierarchyPath": "Cultura" }
  ]
}
```

## Segurança

- **CORS**: Headers configurados para permitir uso em qualquer domínio
- **Read-Only**: API é somente leitura, sem mutações
- **Validação**: Todos os inputs são validados com Zod
- **XSS Prevention**: React auto-escapa JSX
- **CSP**: Content-Security-Policy permite embedding

## Performance

- **Cache ISR**: 5 minutos de revalidação
- **Bundle Size**: < 200KB
- **Lazy Loading**: Imagens carregadas sob demanda
- **CDN**: Assets servidos via CDN

## Suporte

Para dúvidas ou problemas, entre em contato:
- Email: [suporte@destaques.gov.br](mailto:suporte@destaques.gov.br)
- Issues: [GitHub](https://github.com/governo/destaques-govbr/issues)

## Changelog

### v1.0.0 (2025-02)
- Lançamento inicial
- 4 layouts disponíveis
- API REST pública
- Configurador web

---

**Desenvolvido por**: Ministério da Gestão e da Inovação (MGI)
**Licença**: Uso público para portais .gov.br
