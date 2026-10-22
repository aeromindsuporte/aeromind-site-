// Cadastro e edição de WhatsApp brasileiro. O número é armazenado em E.164.
// Isso NÃO comprova a titularidade; a verificação do telefone exigirá OTP futuro.
export const whatsappPattern=/^\+55[1-9][0-9]{9,10}$/;
export function normalizeWhatsAppBR(input:string):string|null{
 const trimmed=input.trim();
 if(!trimmed)return null;
 const digits=trimmed.replace(/\D/g,'');
 // Com DDI explícito, rejeitar números internacionais em vez de reinterpretar
 // o código estrangeiro como parte de um telefone brasileiro.
 if(trimmed.startsWith('+')&&!digits.startsWith('55'))return null;
 const local=digits.startsWith('55')&&(digits.length===12||digits.length===13)?digits.slice(2):digits;
 const formatted='+55'+local;
 return whatsappPattern.test(formatted)?formatted:null;
}
export function displayWhatsApp(input:string|null|undefined):string{
 if(!input)return 'Não cadastrado';
 const match=input.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
 return match?'+55 ('+match[1]+') '+match[2]+'-'+match[3]:input;
}
