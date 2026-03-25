# MeuDinDin

Aplicativo web de gerenciamento de finanças pessoais. Controle suas receitas e despesas com um dashboard moderno, gráficos e relatórios — tudo no navegador, sem necessidade de servidor.

## Funcionalidades

- **Dashboard** — Resumo de saldo, receitas e despesas totais
- **Transações** — Cadastro, listagem e exclusão de receitas e despesas com categorias
- **Filtros** — Por data, tipo (receita/despesa) e categoria
- **Relatórios** — Gráficos de pizza e barras por categoria, taxa de economia, maiores lançamentos
- **Exportar / Importar** — Backup e restauração dos dados em JSON
- **Tema claro / escuro** — Preferência salva automaticamente

## Categorias

Receitas: Salário, Freelance, Investimento
Despesas: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Outros

## Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- Canvas API (gráficos)
- LocalStorage (persistência de dados)
- Google Fonts (Plus Jakarta Sans)

## Como usar

1. Clone ou baixe o repositório
2. Abra o arquivo `versao1/index.html` diretamente no navegador
3. Nenhuma instalação ou dependência necessária

```bash
git clone https://github.com/arthurambo/meudindin.git
cd meudindin/versao1
# Abra index.html no navegador
```

## Estrutura

```
MeuDinDin/
└── versao1/
    ├── index.html   # Estrutura da aplicação (SPA)
    ├── script.js    # Lógica de negócio e armazenamento
    ├── ui.js        # Navegação, relatórios, exportação
    └── style.css    # Design system completo
```

## Dados

Todos os dados ficam salvos no `localStorage` do navegador — nenhuma informação é enviada para servidores externos.

Use a função **Exportar** para fazer backup dos seus dados em JSON e **Importar** para restaurá-los.

## Autor

Arthur Ambrosio — [ambrosio.arthur@gmail.com](mailto:ambrosio.arthur@gmail.com)
