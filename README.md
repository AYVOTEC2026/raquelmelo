# Raquel Melo Conceito de Beleza

Site institucional de uma página, estático (HTML, CSS e JavaScript puros), publicado no GitHub Pages. Pensado primeiro para o celular (Android e iPhone), com base no site de referência [especialistaloirocariacica.com.br](https://especialistaloirocariacica.com.br).

**Endereço:** https://ayvotec2026.github.io/raquelmelo/

## Editar os dados do salão

Tudo fica em [`assets/js/config.js`](assets/js/config.js). Campo vazio = item escondido no site.

| Campo | O que faz no site |
| --- | --- |
| `whatsapp` | DDI 55 + DDD + número, só dígitos (ex.: `5527999998888`). Todos os botões "Agendar" abrem a conversa com uma mensagem pronta; no provador, a mensagem leva o nome da cor escolhida. |
| `instagram` | Usuário sem `@`. Aparece no cabeçalho, nos botões de contato e no rodapé. |
| `endereco` | Endereço completo. Mostra o endereço, o botão "Ver o mapa" (o Google Maps só carrega quando a pessoa toca) e os botões Google Maps, Waze e Uber. |
| `horarios` | Uma linha por item, no formato `"Dia: horário"`. Vira uma tabela com o dia de hoje em destaque. |
| `pagamento` | Lista de formas de pagamento. |
| `google` | Link do perfil no Google (avaliações). Cria o botão "Avalie no Google". |
| `notaGoogle` | Nota no Google (ex.: `"5,0"`). Mostra o selo sobre a foto do topo. |

Com os dados preenchidos, as perguntas "Onde fica o salão?", "Qual é o horário de atendimento?", "Quais são as formas de pagamento?" e "Onde vejo as avaliações?" entram sozinhas no topo das perguntas frequentes.

## Publicar uma alteração

Qualquer `git push` na branch `main` atualiza o site em 1 a 2 minutos:

```bash
git add -A
git commit -m "Atualiza contatos"
git push
```

## Provador de cores

A pessoa escolhe uma cor (12 naturais e 11 fantasia), a técnica (cor inteira, ombré ou mechas) e a intensidade, e vê o resultado na foto da Raquel, numa foto própria ou ao vivo pela câmera. Um divisor de antes e depois pode ser arrastado sobre a foto.

- **Diagnóstico do tom:** mede o tom atual do cabelo na imagem (níveis 1 a 10 da colorimetria) e diz quantos tons é preciso clarear para a cor escolhida. Cada cor tem o nível de base que pede (`data-base` no `index.html`).
- **Só tinta:** simula o resultado realista sem clarear o fio antes.
- **Ajustar área do cabelo:** pincel para pintar ou apagar a área que recebe a cor, com desfazer e restaurar. Na câmera, "Capturar e ajustar" congela a imagem para ajustar com calma.
- **Refino automático:** a borda da máscara é refinada pela cor do fio, e a câmera é suavizada entre os quadros (a cor não treme).
- **Privacidade:** tudo roda no aparelho da pessoa (WebGL + MediaPipe). Nenhuma imagem é enviada ou salva. A detecção de cabelo (`assets/models/hair_segmenter.tflite` + motor da CDN jsDelivr) só é baixada quando a pessoa escolhe câmera ou foto.
- **Navegador do Instagram:** se o app bloquear a câmera, o site orienta a abrir no navegador ou enviar uma foto.
- **Trocar a foto de demonstração:** a nova foto precisa de uma máscara de cabelo em tons de cinza do mesmo tamanho (branco = cabelo), gerada com o modelo `selfie_multiclass_256x256` do MediaPipe (classe 1 = cabelo).

## Pronto para celular

- Toques com área mínima de 44 px, sem atraso de duplo toque, respeitando as áreas seguras do iPhone (notch).
- Pode ser instalado na tela inicial (`manifest.webmanifest` + ícones).
- Em aparelhos simples ou com economia de dados, o monograma 3D é trocado pela versão plana.
- Testado em telas de 360, 375, 390, 412 e 430 px (Android e iPhone).

## Estrutura

```
index.html                    página única (textos e seções)
404.html                      página de erro
manifest.webmanifest          instalação na tela inicial
assets/css/style.css          visual (cores e fontes no topo do arquivo)
assets/fonts/                 Playfair Display, Montserrat e Great Vibes (assinatura), no próprio site
assets/js/config.js           dados do salão
assets/js/main.js             menu, contatos, carrossel, animações e interface do provador
assets/js/3d/                 módulos gerados: monograma 3D, provador e o pedaço do MediaPipe
assets/models/                modelo de detecção de cabelo (provador)
src/                          código-fonte dos módulos (monograma3d.js e provador.js)
assets/img/                   fotos (AVIF, WebP e JPEG em vários tamanhos), logos em SVG
assets/video/                 vídeo dos cachos iluminados (H.264, sem áudio)
og-image.jpg                  imagem que aparece ao compartilhar o link
```

## Animações

- Tudo pende de um fio e balança: as mechas do topo (tons naturais e fantasia), as fotos e o retrato podem ser pegos com o mouse ou o dedo, puxados e soltos; também balançam com o embalo da rolagem.
- Faixa de serviços com duas fitas cruzadas; selo girando sobre a foto do topo.
- "Conceito": o monograma em ouro 3D (three.js) gira com a rolagem e com a mão, e a frase acende palavra por palavra.
- O selo do rodapé é uma moeda que gira com a mão.
- Quem ativa "reduzir movimento" vê o site sem animações e sem baixar o 3D; o provador continua disponível.

Para alterar os módulos em `src/`, gere os arquivos finais com:

```bash
npm i three esbuild @mediapipe/tasks-vision
npx esbuild src/monograma3d.js src/provador.js --bundle --splitting --minify --format=esm --target=es2020 --outdir=assets/js/3d --chunk-names=chunk-[hash]
```

## Fotos

Cada foto existe em três larguras e três formatos (`-500.avif`, `-500.webp`, `-500.jpg` etc.). Para trocar uma foto, gere os mesmos nomes e tamanhos com o mesmo enquadramento, ou exporte um único JPEG de ~1100 px de largura e ajuste o `<picture>` correspondente no `index.html`. Para incluir mais resultados no carrossel, copie um `<figure class="carrossel-item">` e troque a foto e a legenda.

## Domínio próprio

1. Em *Settings > Pages > Custom domain*, informe o domínio e configure o DNS conforme a orientação do GitHub.
2. No `index.html`, troque `https://ayvotec2026.github.io/raquelmelo/` pelo novo endereço (tags `canonical` e `og:`).
3. No `404.html`, troque `<base href="/raquelmelo/">` por `<base href="/">`.

## Identidade visual

- Cores: espresso `#241A10`, ouro `#D9A84C`, bronze `#64450B`, champanhe `#F3E8D4`.
- Fontes: Playfair Display (títulos), Montserrat (textos) e Great Vibes (assinatura).
- Logos convertidos em vetor (SVG) a partir do manual da marca.
