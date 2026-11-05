# Raquel Melo Conceito de Beleza

Site institucional de uma página, estático (HTML, CSS e JavaScript puros), publicado no GitHub Pages.

**Endereço:** https://ayvotec2026.github.io/raquelmelo/

## Editar WhatsApp, Instagram, endereço e horários

Tudo fica em [`assets/js/config.js`](assets/js/config.js). Preencha os campos e publique (veja abaixo).

- **WhatsApp:** DDI 55 + DDD + número, só dígitos (ex.: `5527999998888`). Com ele preenchido, todos os botões "Agendar" abrem a conversa com uma mensagem pronta, diferente para cada botão. No provador, a mensagem já leva o nome da cor escolhida.
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

## Provador de cores

A pessoa escolhe uma cor (naturais e fantasia), a técnica (cor inteira, ombré ou mechas) e a intensidade, e vê o resultado na foto da Raquel, numa foto própria ou ao vivo pela câmera. Um divisor de antes e depois pode ser arrastado sobre a foto.

- **Privacidade:** tudo roda no aparelho da pessoa (WebGL + MediaPipe). Nenhuma imagem é enviada ou salva.
- **Foto da Raquel:** abre na hora, com uma máscara de cabelo pré-calculada (`assets/img/provador-raquel-mascara.png`).
- **Câmera e foto enviada:** a detecção de cabelo usa o modelo `assets/models/hair_segmenter.tflite` (Google MediaPipe) e o motor WebAssembly da CDN jsDelivr, baixados só quando a pessoa escolhe essas opções.
- **Cores:** cada cor é um botão `.tom` no `index.html`, com `data-cor` (hex) e `data-nome`. Para incluir, remover ou renomear uma cor, edite esses botões.
- **Trocar a foto de demonstração:** a nova foto precisa de uma máscara de cabelo em tons de cinza, do mesmo tamanho (branco = cabelo). Dá para gerá-la com o modelo `selfie_multiclass_256x256` do MediaPipe (classe 1 = cabelo).

## Estrutura

```
index.html                    página única (textos e seções)
404.html                      página de erro
assets/css/style.css          visual (cores e fontes no topo do arquivo)
assets/fonts/                 Bodoni Moda e Jost, hospedadas no próprio site
assets/js/config.js           dados de contato
assets/js/main.js             menu, vídeo, WhatsApp, animações e provador (interface)
assets/js/3d/                 módulos gerados: monograma 3D, provador e o pedaço do MediaPipe
assets/models/                modelo de detecção de cabelo (provador)
src/                          código-fonte dos módulos (monograma3d.js e provador.js)
assets/img/                   fotos (AVIF, WebP e JPEG em 3 tamanhos), foto e máscara do provador, logos em SVG
assets/video/                 vídeo dos cachos iluminados (H.264, sem áudio)
og-image.jpg                  imagem que aparece ao compartilhar o link
```

## Animações

- Tudo pende de um fio e balança: as mechas do topo (tons naturais e fantasia), as fotos e o retrato podem ser pegos com o mouse ou o dedo, puxados e soltos; também balançam com o embalo da rolagem.
- "Conceito": o monograma em ouro 3D (three.js) gira com a rolagem e com a mão, e a frase acende palavra por palavra.
- O selo do rodapé é uma moeda que gira com a mão.
- Quem ativa "reduzir movimento" vê o site sem animações e sem baixar o 3D; o provador continua disponível.

Para alterar os módulos em `src/`, gere os arquivos finais com:

```bash
npm i three esbuild @mediapipe/tasks-vision
npx esbuild src/monograma3d.js src/provador.js --bundle --splitting --minify --format=esm --target=es2020 --outdir=assets/js/3d --chunk-names=chunk-[hash]
```

## Trocar ou adicionar fotos

Cada foto existe em três larguras e três formatos (`-500.avif`, `-500.webp`, `-500.jpg` etc.). Para trocar uma foto, gere os mesmos nomes e tamanhos com o mesmo enquadramento, ou exporte um único JPEG de ~1100 px de largura e ajuste o `<picture>` correspondente no `index.html`.

## Domínio próprio

1. Em *Settings > Pages > Custom domain*, informe o domínio e configure o DNS conforme a orientação do GitHub.
2. No `index.html`, troque `https://ayvotec2026.github.io/raquelmelo/` pelo novo endereço (tags `canonical` e `og:`).
3. No `404.html`, troque `<base href="/raquelmelo/">` por `<base href="/">`.

## Identidade visual

- Cores: espresso `#241A10`, ouro `#D9A84C`, bronze `#64450B`, champanhe `#F3E8D4`.
- Fontes: Bodoni Moda (títulos) e Jost (textos).
- Logos convertidos em vetor (SVG) a partir do manual da marca.
