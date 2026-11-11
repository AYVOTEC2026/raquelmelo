/* ==========================================================================
   DADOS DO SALÃO: edite somente este arquivo.

   Deixe "" (ou [] nas listas) no que ainda não tiver: o site esconde o item
   automaticamente. Assim que o WhatsApp for preenchido, todos os botões
   "Agendar" passam a abrir a conversa com a mensagem já escrita.
   ========================================================================== */

window.SITE_CONFIG = {
  // WhatsApp com DDI 55 + DDD + número, só dígitos. Ex.: "5527999998888"
  whatsapp: "",

  // Mensagem que aparece pronta ao abrir o WhatsApp pelos botões genéricos
  mensagemPadrao: "Olá, Raquel! Vim pelo site e gostaria de agendar um horário.",

  // Usuário do Instagram, sem o @. Ex.: "raquelmelo.conceitodebeleza"
  instagram: "",

  // Cidade, para aparecer no topo do site. Ex.: "Vitória · ES"
  cidade: "Fortaleza · CE",

  // Endereço completo, do jeito que deve aparecer no site
  // Ex.: "Rua das Flores, 123, sala 4, Centro, Vitória, ES"
  endereco: "R. Cel. Jaime Rolemberg, 75 - Maraponga, Fortaleza - CE, 60712-175",

  // Link do Google Maps (opcional). Se ficar vazio, o link é criado a partir
  // do endereço acima.
  mapsUrl: "",

  // Horários de atendimento, um item por linha, no formato "Dia: horário".
  // O dia de hoje fica destacado no site.
  // Ex.: ["Terça a sexta: 9h às 18h", "Sábado: 8h às 16h", "Domingo e segunda: fechado"]
  horarios: [
    "Terça-feira: 09:00 – 18:00",
    "Quarta-feira: 09:00 – 18:00",
    "Quinta-feira: 09:00 – 18:00",
    "Sexta-feira: 08:00 – 18:00",
    "Sábado: 08:00 – 18:00",
    "Domingo e segunda: fechado",
  ],

  // Formas de pagamento, uma por item. Ex.: ["Pix", "Cartão de crédito e débito"]
  pagamento: [],

  // Link do perfil do salão no Google (para ver e deixar avaliações).
  // Ex.: "https://g.page/r/XXXXXXXX/review"
  google: "",

  // Nota no Google, para mostrar o selo na foto do topo (vazio = não mostra).
  // Ex.: "5,0"
  notaGoogle: "",

  // Opcionais: link do canal no YouTube e usuário do TikTok (sem o @)
  youtube: "",
  tiktok: "",
};
