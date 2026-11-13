# Raquel Melo Conceito de Beleza

Site institucional de uma página, estático (HTML, CSS e JavaScript puros), publicado no GitHub Pages. A estrutura e o estilo seguem o site de referência escolhido pela cliente, [especialistaloirocariacica.com.br](https://especialistaloirocariacica.com.br), nas cores e com o logo da Raquel. Pensado primeiro para o celular (Android e iPhone).

**Endereço:** https://ayvotec2026.github.io/raquelmelo/

## Seções (na ordem da referência)

1. **Topo:** nome, título "Colorista de todas as cores", botão de agendar, foto em arco com selo girando e nota do Google.
2. **Fitas cruzadas** com os serviços, rolando.
3. **Sobre a Raquel:** colagem de fotos, texto e assinatura.
4. **Galerias de resultados** ("Morena iluminada", "Transformações de cor e brilho" e as que a Raquel criar): fotos de antes e depois em polaroids, arrastar no celular, setas no computador, tocar para ampliar.
5. **Produtos (STIJL):** "Nutrição com algas marinhas", a linha Hydra Glow usada no salão, com foto.
6. **Vídeos do salão:** vídeos em pé, que tocam sem som quando aparecem na tela.
7. **Horários e como chegar:** tabela com o dia de hoje em destaque, aviso de horário agendado, endereço, mapa e botões (WhatsApp, avaliar no Google, Instagram, Google Maps, Waze, Uber, YouTube, TikTok).
8. **Perguntas frequentes.**
9. **Rodapé:** onde estamos, botões, menu e marca-d'água com o nome.
10. **Botão flutuante do WhatsApp**, que aparece depois do botão do topo.

## Painel do site da Raquel

Endereço: https://ayvotec2026.github.io/raquelmelo/admin/ (não aparece no site nem no Google).

Com a senha, a Raquel mexe no site inteiro pelo celular, em quatro abas:

- **Fotos:** adiciona fotos (até 15 por galeria; 1 no topo; 3 no "Sobre"; 1 na foto dos produtos; 3 no rodapé), troca, muda a ordem, leva para outro lugar do site ou remove; escreve a legenda e marca se é uma montagem de antes e depois. Cria até 4 galerias, muda os textos de cada uma, sobe, desce ou exclui. Também adiciona vídeos (até 6), muda a legenda e a ordem ou remove.
- **Textos:** topo, fitas com os serviços, "Sobre a Raquel", produtos (com a lista de produtos), vídeos, aviso de horário agendado e rodapé. Pode esconder as fitas, os produtos ou os vídeos.
- **Dúvidas:** adiciona, edita, reordena e remove as perguntas frequentes (ou esconde a seção).
- **Contato:** WhatsApp, mensagem pronta, Instagram, TikTok, YouTube, cidade, endereço, link do Maps, horários (um dia por linha), formas de pagamento e avaliações do Google.

Tudo vai num único envio ao tocar em **Publicar no site**, e o site se atualiza em 1 a 5 minutos. Um pontinho dourado na aba mostra o que ainda não foi publicado; **Desfazer** volta tudo para a última versão publicada. Antes de publicar, o painel confere o WhatsApp, os links (precisam começar com `https://`) e a nota do Google.

Nos textos, `**palavra**` vira negrito; nas perguntas e no "Sobre", cada linha vira um parágrafo e linhas que começam com `-` viram lista. O site mostra tudo como texto puro (não aceita HTML).

O site se ajusta sozinho: espaço sem foto não aparece (galeria vazia some, o topo fica só com o texto, o "Sobre" e o rodapé se reorganizam), campo de texto vazio some, e seção escondida sai também do menu. Nunca fica um card em branco.

As fotos são reduzidas no próprio celular (600 e 1200 px, JPEG), o que deixa o site leve e apaga dados escondidos da foto, como a localização. Fotos do iPhone funcionam normalmente: ao escolher a foto pelo celular, o iPhone já entrega em JPEG.

Os vídeos vão como estão: MP4 em H.264, até 30 MB (o reel salvo do Instagram já vem assim). O painel tira a capa do próprio vídeo. Vídeos gravados no iPhone em HEVC são recusados com a instrução para trocar a câmera para "Mais compatível", porque HEVC não toca em todo celular.

### Configurar o acesso (uma vez, pelo Italo)

O site é estático, então o painel publica pelo próprio GitHub, com um token só deste repositório:

1. Logado no GitHub da conta AYVOTEC2026, abra [este link já preenchido](https://github.com/settings/personal-access-tokens/new?name=Painel+do+site+Raquel&description=Painel+do+site+da+Raquel+Melo+%28raquelmelo%2Fadmin%29&expires_in=366&contents=write) (nome, validade de 1 ano e **Contents: Read and write**, nada mais). O mesmo link está no painel, em "Configurar o acesso".
2. Em *Repository access*, escolha *Only select repositories* e marque **raquelmelo** (o GitHub não deixa o link escolher o repositório). Toque em *Generate token* e copie.
3. Abra o painel, toque em "Configurar o acesso", cole o token e gere a senha da Raquel. Envie para ela o endereço do painel e a senha.

O token fica salvo em `admin/acesso.json` cifrado com a senha (AES-GCM com chave derivada por PBKDF2, 600 mil iterações); sem a senha ele não serve. Quando o token vencer, o painel avisa: gere outro e repita o passo 3. A Raquel pode trocar a senha pelo próprio painel.

## Onde ficam os dados

| Arquivo | O que tem |
| --- | --- |
| [`assets/data/conteudo.json`](assets/data/conteudo.json) | Textos de cada seção, fitas, produtos, perguntas frequentes, contato e horários. |
| [`assets/data/fotos.json`](assets/data/fotos.json) | Fotos (topo, "Sobre", galerias com seus textos, produtos, rodapé) e vídeos. |

O painel edita os dois; dá para editar à mão também. O `main.js` lê os arquivos e monta as seções. Os textos que estão no `index.html` são só a reserva, caso o `conteudo.json` não carregue: o que vale é o arquivo. Campo vazio (`""`) esconde o item no site; campo que não existe no arquivo deixa o texto do HTML.

Contato (`"contato"` no `conteudo.json`):

| Campo | O que faz no site |
| --- | --- |
| `whatsapp` | DDI 55 + DDD + número, só dígitos (ex.: `5585987261704`). Todos os botões "Agendar" abrem a conversa com uma mensagem pronta. Sem ele, os botões levam até "Horários e como chegar". |
| `mensagemPadrao` | Mensagem que já vem escrita ao abrir o WhatsApp. |
| `instagram` | Usuário sem `@`. Aparece no cabeçalho, nos atalhos e no rodapé. |
| `cidade` | Ex.: `"Fortaleza · CE"`. Aparece no topo da página e no cabeçalho (computador). |
| `endereco` | Endereço completo. Mostra o endereço, o mapa do Google e os botões Google Maps, Waze e Uber. |
| `mapsUrl` | Link do Google Maps (opcional). Se ficar vazio, é criado a partir do endereço. |
| `horarios` | Lista de `{ "dia": "Terça-feira", "horario": "09:00 – 18:00" }`. Vira uma tabela com o dia de hoje em destaque; "fechado" fica em cinza. |
| `pagamento` | Lista de formas de pagamento. |
| `google` | Link do perfil no Google. Cria o botão "Me avalie". |
| `notaGoogle` | Nota no Google (ex.: `"5,0"`). Mostra o selo sobre a foto do topo. |
| `youtube`, `tiktok` | Opcionais: link do canal e usuário do TikTok. Criam os botões correspondentes. |

Links (`mapsUrl`, `google`, `youtube`) só valem se começarem com `https://`. Com os dados preenchidos, as perguntas "Onde fica o salão?", "Qual é o horário de atendimento?", "Quais formas de pagamento são aceitas?" e "Onde vejo as avaliações de quem já foi?" entram sozinhas nas perguntas frequentes, como na referência.

## Publicar uma alteração

Qualquer `git push` na branch `main` atualiza o site em 1 a 2 minutos:

```bash
git add -A
git commit -m "Atualiza contatos"
git push
```

O GitHub Pages guarda os arquivos no navegador por até 10 minutos. Ao mudar `style.css` ou `main.js` (ou os arquivos do painel), troque o número `?v=` nas linhas que carregam esses arquivos no `index.html` (e no `404.html` e no `admin/index.html`, se for o caso): assim ninguém vê a página nova com o visual antigo. O que o painel publica (fotos, vídeos e os arquivos `.json`) não precisa disso.

## Vídeos

O jeito mais fácil é pelo painel (aba Fotos › Vídeos). Para incluir à mão um vídeo grande ou gravado em HEVC, converta para MP4 (H.264, 720 × 1280, cerca de 2 Mbps, sem áudio) com uma capa em JPEG do mesmo tamanho, coloque os dois em `assets/video/` e acrescente um item em `"videos"` no `fotos.json` (`video`, `capa`, `largura`, `altura`, `legenda`, `descricao`).

Com um vídeo, ele fica centralizado. No computador, até três vídeos ficam lado a lado; no celular (ou com mais vídeos), eles viram um carrossel para deslizar. Só um vídeo toca por vez, sem som; quem quiser, toca no botão para pausar ou continuar. Sem vídeo, a seção sai do site e do menu.

Músicas de reels do Instagram costumam ser licenciadas só para o Instagram, por isso os vídeos tocam sem som no site.

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
assets/js/main.js             monta textos, contato, fotos, galerias e vídeos; menu, carrosséis, perguntas e animações
assets/data/conteudo.json     textos, perguntas frequentes, contato e horários (editado pelo painel)
assets/data/fotos.json        fotos e vídeos do site (editado pelo painel)
assets/fotos/                 fotos de resultados (antes e depois) e fotos enviadas pelo painel
admin/                        painel do site da Raquel (index.html, admin.js, conteudo.js, admin.css e acesso.json)
assets/img/                   fotos (AVIF, WebP e JPEG em vários tamanhos) e logos em SVG
assets/video/                 vídeos (H.264) e capas dos vídeos enviados pelo painel
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
