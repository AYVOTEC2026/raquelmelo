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
assets/js/main.js             menu, vídeo, WhatsApp e animações
assets/js/monograma3d.min.js  monograma RM em ouro 3D (three.js, carregado só perto da seção)
src/monograma3d.js            código-fonte do monograma 3D
assets/img/                   fotos (AVIF, WebP e JPEG em 3 tamanhos) e logos em SVG
assets/video/                 vídeo dos cachos iluminados (H.264, sem áudio)
og-image.jpg                  imagem que aparece ao compartilhar o link
```

## Animações

- Todo o movimento segue a ideia da cartela: as mechas do topo balançam com o mouse, o toque e a rolagem; as fotos e os itens das listas entram balançando, presos pelo topo; os títulos se levantam em 3D.
- A seção "Conceito" mostra o monograma em ouro 3D (WebGL), que gira conforme a rolagem enquanto a frase acende.
- Quem ativa "reduzir movimento" no celular ou no computador vê o site estático, sem baixar o 3D.
- Para alterar o monograma 3D, edite `src/monograma3d.js` e gere o arquivo final:

```bash
npm i three esbuild
npx esbuild src/monograma3d.js --bundle --minify --format=esm --target=es2020 --outfile=assets/js/monograma3d.min.js
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
