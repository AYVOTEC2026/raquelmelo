# Raquel Melo Conceito de Beleza

Site institucional de uma página, estático (HTML, CSS e JavaScript puros), publicado no GitHub Pages. A estrutura e o estilo seguem o site de referência escolhido pela cliente, [especialistaloirocariacica.com.br](https://especialistaloirocariacica.com.br), nas cores e com o logo da Raquel. Pensado primeiro para o celular (Android e iPhone).

**Endereço:** https://ayvotec2026.github.io/raquelmelo/

## Seções (na ordem da referência)

1. **Topo:** nome, título "Colorista de todas as cores", botão de agendar, foto em arco com selo girando e nota do Google.
2. **Fitas cruzadas** com os serviços, rolando.
3. **Sobre a Raquel:** colagem de fotos, texto e assinatura.
4. **Cachos que iluminam:** galeria de resultados em polaroids (arrastar no celular, setas no computador).
5. **Vídeos do salão:** vídeos em pé, que tocam sem som quando aparecem na tela.
6. **Horários e como chegar:** tabela com o dia de hoje em destaque, aviso de horário agendado, endereço, mapa e botões (WhatsApp, avaliar no Google, Instagram, Google Maps, Waze, Uber, YouTube, TikTok).
7. **Perguntas frequentes.**
8. **Rodapé:** onde estamos, botões, menu e marca-d'água com o nome.
9. **Botão flutuante do WhatsApp**, que aparece depois do botão do topo.

## Editar os dados do salão

Tudo fica em [`assets/js/config.js`](assets/js/config.js). Campo vazio = item escondido no site.

| Campo | O que faz no site |
| --- | --- |
| `whatsapp` | DDI 55 + DDD + número, só dígitos (ex.: `5527999998888`). Todos os botões "Agendar" abrem a conversa com uma mensagem pronta. Sem ele, os botões levam até "Horários e como chegar". |
| `mensagemPadrao` | Mensagem que já vem escrita ao abrir o WhatsApp. |
| `instagram` | Usuário sem `@`. Aparece no cabeçalho, nos atalhos e no rodapé. |
| `cidade` | Ex.: `"Vitória · ES"`. Aparece no topo da página e no cabeçalho (computador). |
| `endereco` | Endereço completo. Mostra o endereço, o mapa do Google e os botões Google Maps, Waze e Uber. |
| `mapsUrl` | Link do Google Maps (opcional). Se ficar vazio, é criado a partir do endereço. |
| `horarios` | Uma linha por item, no formato `"Dia: horário"`. Vira uma tabela com o dia de hoje em destaque; "fechado" fica em cinza. |
| `pagamento` | Lista de formas de pagamento. |
| `google` | Link do perfil no Google. Cria o botão "Me avalie". |
| `notaGoogle` | Nota no Google (ex.: `"5,0"`). Mostra o selo sobre a foto do topo. |
| `youtube`, `tiktok` | Opcionais: link do canal e usuário do TikTok. Criam os botões correspondentes. |

Com os dados preenchidos, as perguntas "Onde fica o salão?", "Qual é o horário de atendimento?", "Quais formas de pagamento são aceitas?" e "Onde vejo as avaliações de quem já foi?" entram sozinhas nas perguntas frequentes, como na referência.

## Publicar uma alteração

Qualquer `git push` na branch `main` atualiza o site em 1 a 2 minutos:

```bash
git add -A
git commit -m "Atualiza contatos"
git push
```

## Incluir vídeos

Os vídeos originais do celular são grandes demais para o site. Cada vídeo novo é convertido para MP4 (H.264, 720 × 1280, cerca de 2 Mbps) e ganha uma capa em JPEG do mesmo tamanho. Depois:

1. Coloque o `.mp4` em `assets/video/` e a capa em `assets/img/`.
2. No `index.html`, na seção "Vídeos do salão", copie um `<figure class="polaroid polaroid-video">` e troque o arquivo, a capa, o `aria-label` e a legenda.

Com um vídeo, ele fica centralizado. No computador, até três vídeos ficam lado a lado; no celular (ou com mais vídeos), eles viram um carrossel para deslizar. Só um vídeo toca por vez, sem som; quem quiser, toca no botão para pausar ou continuar.

Músicas de reels do Instagram costumam ser licenciadas só para o Instagram, por isso os vídeos entram sem som. Se a Raquel tiver um vídeo com áudio próprio (narração, por exemplo), dá para manter o som com um botão de ativar.

## Incluir fotos de resultados

Cada foto existe em três larguras e três formatos (`-400.avif`, `-400.webp`, `-400.jpg` etc.). Para incluir mais resultados no carrossel, gere os mesmos tamanhos e copie um `<figure class="polaroid">` na seção "Cachos que iluminam", trocando a foto, o texto alternativo e a etiqueta. Uma galeria nova (por exemplo, "Cores fantasia") é uma cópia da seção inteira, com outro título.

## Pronto para celular

- Toques com área mínima de 44 px, respeitando as áreas seguras do iPhone (notch).
- Menu de tela cheia no celular, com botão de WhatsApp sempre à mão.
- Pode ser instalado na tela inicial (`manifest.webmanifest` + ícones).
- Fotos em AVIF/WebP no tamanho certo para cada tela; vídeo só baixa perto da tela.
- Quem ativa "reduzir movimento" vê o site sem animações e sem vídeo tocando sozinho.
- Testado em telas de 360, 375, 390, 412 e 430 px (Android e iPhone), tablet e computador, no Chrome e no Safari.

## Estrutura

```
index.html                    página única (textos e seções)
404.html                      página de erro
manifest.webmanifest          instalação na tela inicial
assets/css/style.css          visual (cores e fontes no topo do arquivo)
assets/fonts/                 Cormorant Garamond, Great Vibes e Montserrat, no próprio site
assets/js/config.js           dados do salão
assets/js/main.js             contatos, menu, carrosséis, vídeos, perguntas e animações
assets/img/                   fotos (AVIF, WebP e JPEG em vários tamanhos) e logos em SVG
assets/video/                 vídeos (H.264, sem áudio)
og-image.jpg                  imagem que aparece ao compartilhar o link
```

## Domínio próprio

1. Em *Settings > Pages > Custom domain*, informe o domínio e configure o DNS conforme a orientação do GitHub.
2. No `index.html`, troque `https://ayvotec2026.github.io/raquelmelo/` pelo novo endereço (tags `canonical` e `og:`).
3. No `404.html`, troque `<base href="/raquelmelo/">` por `<base href="/">`.

## Identidade visual

- Cores: espresso `#241A10`, ouro `#D9A84C`, bronze `#64450B`, champanhe `#F3E8D4`, com fundos creme claros como na referência.
- Fontes: Cormorant Garamond (títulos), Great Vibes (palavras em letra cursiva) e Montserrat (textos), as mesmas famílias do site de referência.
- Logos convertidos em vetor (SVG) a partir do manual da marca.
