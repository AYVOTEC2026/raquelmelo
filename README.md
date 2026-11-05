# Raquel Melo Conceito de Beleza

Site institucional de uma página, estático (HTML, CSS e JavaScript puros), publicado no GitHub Pages.

**Endereço:** https://ayvotec2026.github.io/raquelmelo/

## Editar WhatsApp, Instagram, endereço e horários

Tudo fica em [`assets/js/config.js`](assets/js/config.js). Preencha os campos e publique (veja abaixo).

- **WhatsApp:** DDI 55 + DDD + número, só dígitos (ex.: `5527999998888`). Com ele preenchido, todos os botões "Agendar" abrem a conversa com uma mensagem pronta, diferente para cada botão.
- **Instagram:** só o usuário, sem `@`.
- **Endereço:** texto completo. Os links "Abrir no Google Maps" e "Abrir no Waze" são criados automaticamente.
- **Horários:** uma linha por item.

Campo vazio = item escondido no site. Enquanto nada estiver preenchido, a seção de contato mostra o aviso "serão publicados aqui em breve" e os botões de agendamento levam até essa seção.

## Publicar uma alteração

Qualquer `git push` na branch `main` atualiza o site em 1 a 2 minutos:

```bash
git add -A
git commit -m "Atualiza contatos"
git push
```

## Estrutura

```
index.html                    página única (textos e seções)
404.html                      página de erro
assets/css/style.css          visual (cores e fontes no topo do arquivo)
assets/fonts/                 Bodoni Moda e Jost, hospedadas no próprio site
assets/js/config.js           dados de contato
assets/js/main.js             menu, vídeo, WhatsApp, animações e física dos pêndulos
assets/js/3d/                 módulos 3D gerados (monograma, fios e o three.js compartilhado)
src/                          código-fonte dos módulos 3D (monograma3d.js e cabelo3d.js)
assets/img/                   fotos (AVIF, WebP e JPEG em 3 tamanhos) e logos em SVG
assets/video/                 vídeo dos cachos iluminados (H.264, sem áudio)
og-image.jpg                  imagem que aparece ao compartilhar o link
```

## Animações

- Todo o movimento segue a ideia da cartela: tudo pende de um fio e balança. As mechas do topo, as fotos e o retrato podem ser pegos com o mouse ou o dedo, puxados e soltos; também balançam com o embalo da rolagem.
- "Faça suas mechas": cortina de fios 3D com física de cabelo. Onde o mouse ou o dedo passa, o castanho vira loiro (o cursor vira um pincel); ao iluminar 35% aparece o convite para agendar.
- "Conceito": o monograma em ouro 3D gira com a rolagem e também com a mão, e a frase acende palavra por palavra.
- O selo do rodapé é uma moeda que gira com a mão.
- Quem ativa "reduzir movimento" no celular ou no computador vê o site estático, sem baixar o 3D (a seção dos fios fica escondida).
- Para alterar os módulos 3D, edite os arquivos em `src/` e gere os finais:

```bash
npm i three esbuild
npx esbuild src/monograma3d.js src/cabelo3d.js --bundle --splitting --minify --format=esm --target=es2020 --outdir=assets/js/3d --chunk-names=three-[hash]
```

## Trocar ou adicionar fotos

Cada foto existe em três larguras e três formatos (`-500.avif`, `-500.webp`, `-500.jpg` etc.). Para trocar uma foto, gere os mesmos nomes e tamanhos com o mesmo enquadramento, ou exporte um único JPEG de ~1100 px de largura e ajuste o `<picture>` correspondente no `index.html`.

## Domínio próprio

1. Em *Settings > Pages > Custom domain*, informe o domínio e configure o DNS conforme a orientação do GitHub.
2. No `index.html`, troque `https://ayvotec2026.github.io/raquelmelo/` pelo novo endereço (tags `canonical` e `og:`).
3. No `404.html`, troque `<base href="/raquelmelo/">` por `<base href="/">`.

## Identidade visual

- Cores: espresso `#241A10`, ouro `#D9A84C`, bronze `#64450B`, champanhe `#F3E8D4`.
- Fontes: Bodoni Moda (títulos) e Jost (textos), via Google Fonts.
- Logos convertidos em vetor (SVG) a partir do manual da marca.
