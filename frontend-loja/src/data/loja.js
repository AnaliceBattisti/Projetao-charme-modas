// Preencher somente com os dados confirmados pela loja.
export const loja = {
  cidade: "Garanhuns/PE",
  endereco: "Rua Capitão Pedro Rodrigues, 177",
  whatsapp: "5587981599661", // Formato internacional, somente dígitos: 55 + DDD + número.
  telefone: "(87) 98159-9661",
  instagram: "charmemodaas", // Nome de usuário sem @.
  horario: "Seg a sex, 8h30 às 18h · Sáb, 8h às 17h",
};

/**
 * Link do WhatsApp com a mensagem já escrita, ou null quando a loja ainda não
 * tem número cadastrado — aí quem chama mostra o caminho antigo (página de contato).
 */
export function linkWhatsApp(mensagem) {
  if (!loja.whatsapp) return null;
  const texto = mensagem || "Olá! Vim pelo site da Charme Modas.";
  return `https://wa.me/${loja.whatsapp}?text=${encodeURIComponent(texto)}`;
}

/** Mensagem padrão de quem quer falar sobre um pedido específico. */
export function mensagemPedido(id) {
  return `Olá! Quero falar sobre o meu pedido #${id} do site da Charme Modas.`;
}
