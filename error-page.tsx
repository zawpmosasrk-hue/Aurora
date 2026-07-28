export function renderErrorPage(error?: Error) {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Ops! Algo deu errado</title>
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin:0; background:#111; color:#fff; padding:2rem; }
          h1 { font-size:2rem; margin-bottom:1rem; }
          p { font-size:1.1rem; opacity:0.8; }
        </style>
      </head>
      <body>
        <h1>Página não carregou</h1>
        <p>Tente novamente mais tarde ou volte para o início.</p>
      </body>
    </html>
  `
}
