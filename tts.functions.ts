// VOZ NATIVA DO NAVEGADOR — NÃO PRECISA DE API NENHUMA!
export function falaTexto(texto: string) {
  // Para qualquer fala anterior
  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "pt-BR";
  voz.rate = 1.05;
  voz.pitch = 1;
  voz.volume = 1;

  speechSynthesis.speak(voz);
}

// Remove qualquer função que peça ElevenLabs
export async function inicializarTTS() {
  return { ok: true };
}
