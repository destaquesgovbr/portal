# Widget DGB - Guia Rápido de Integração

## 🚀 Integração em 3 Passos

### 1. Configure Seu Widget

Acesse: [destaques.gov.br/widgets/configurador](https://destaques.gov.br/widgets/configurador)

### 2. Copie o Código

Exemplo para mostrar notícias do Ministério da Cultura:

```html
<iframe
  src="https://destaques.gov.br/embed?c=<SUA_CONFIG>"
  width="400"
  height="600"
  frameborder="0"
  scrolling="auto"
  title="Widget DGB - Notícias do Governo Federal"
></iframe>
```

### 3. Cole no Seu HTML

Insira o código onde deseja exibir o widget:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Meu Portal</title>
</head>
<body>
  <h1>Notícias Recentes</h1>

  <!-- Widget DGB -->
  <iframe
    src="https://destaques.gov.br/widgets/embed?c=..."
    width="400"
    height="600"
    frameborder="0"
    scrolling="auto"
    title="Widget DGB"
  ></iframe>
</body>
</html>
```

## 📋 Exemplos de Uso

### Exemplo 1: Sidebar com Últimas Notícias

```html
<aside class="sidebar">
  <h2>Últimas Notícias</h2>
  <iframe
    src="https://destaques.gov.br/widgets/embed?c=eyJsYXlvdXQiOiJsaXN0Iiwic2l6ZSI6Im1lZGl1bSJ9"
    width="400"
    height="600"
    frameborder="0"
  ></iframe>
</aside>
```

### Exemplo 2: Grade de Notícias do Ministério da Cultura

```html
<section class="news-grid">
  <h2>Cultura</h2>
  <iframe
    src="https://destaques.gov.br/widgets/embed?c=eyJhZ2VuY2llcyI6WyJtaW5jIl0sImxheW91dCI6ImdyaWQtMiJ9"
    width="700"
    height="600"
    frameborder="0"
  ></iframe>
</section>
```

### Exemplo 3: Carrossel de Destaques

```html
<div class="hero-carousel">
  <iframe
    src="https://destaques.gov.br/widgets/embed?c=eyJsYXlvdXQiOiJjYXJvdXNlbCIsInNpemUiOiJsYXJnZSJ9"
    width="1000"
    height="500"
    frameborder="0"
  ></iframe>
</div>
```

## 🎨 Customização de Tamanho

### Tamanho Fixo
```html
<iframe
  src="..."
  width="400"
  height="600"
></iframe>
```

### Responsivo (100% da largura)
```html
<iframe
  src="..."
  width="100%"
  height="600"
  style="max-width: 800px;"
></iframe>
```

### Container Responsivo
```html
<div style="position: relative; padding-bottom: 75%; height: 0;">
  <iframe
    src="..."
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    frameborder="0"
  ></iframe>
</div>
```

## 🔧 Troubleshooting

### Widget não aparece

**Problema**: Iframe não carrega ou aparece em branco
**Solução**:
- Verifique se a URL está correta
- Confirme que não há bloqueadores de conteúdo ativos
- Teste em navegador anônimo

### Widget muito pequeno/grande

**Problema**: Tamanho inadequado para o espaço
**Solução**:
- Use o configurador para escolher outro tamanho preset
- Ou use tamanho customizado e ajuste width/height
- Considere usar outro layout (ex: lista em vez de grade)

### Notícias desatualizadas

**Problema**: Conteúdo não atualiza
**Solução**:
- Widget tem cache de 5 minutos
- Aguarde até 5 minutos para ver atualizações
- Recarregue a página (Ctrl+F5 ou Cmd+Shift+R)

### Conflito de estilos

**Problema**: Widget aparece com estilos quebrados
**Solução**:
- Widget é isolado em iframe, estilos não devem vazar
- Se houver problemas, adicione `!important` aos estilos do iframe:
  ```css
  iframe.widget-dgb {
    width: 400px !important;
    height: 600px !important;
  }
  ```

## 📞 Suporte

- **Email**: suporte@destaques.gov.br
- **Documentação**: [/docs/WIDGET.md](./WIDGET.md)
- **Issues**: [GitHub Issues](https://github.com/governo/destaques-govbr/issues)

## ✅ Checklist de Integração

- [ ] Acessei o configurador
- [ ] Selecionei filtros (opcional)
- [ ] Escolhi layout e tamanho
- [ ] Copiei o código iframe
- [ ] Colei no HTML do site
- [ ] Testei em desktop
- [ ] Testei em mobile
- [ ] Widget está carregando notícias
- [ ] Links funcionam corretamente

---

**Dica**: Use o Preview do configurador para ver como ficará antes de integrar!
