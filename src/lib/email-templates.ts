export function renderWaitlistApprovalEmail({
  name,
  code,
  portalUrl,
}: {
  name?: string
  code: string
  portalUrl: string
}): string {
  const greeting = name ? `Olá ${name}` : 'Olá'
  const inviteLink = `${portalUrl}/convite/${code}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden">

<!-- Header -->
<tr><td style="background:#1351b4;padding:24px 32px">
  <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600">Destaques Gov.br</h1>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px">
  <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px">
    ${greeting},
  </p>
  <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 24px">
    Seu acesso ao <strong>Destaques Gov.br</strong> foi aprovado! Use o código abaixo para criar sua conta:
  </p>

  <!-- Code -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:16px 0">
    <div style="display:inline-block;background:#f0f4fa;border:2px dashed #1351b4;border-radius:8px;padding:16px 32px">
      <span style="font-size:28px;font-weight:700;letter-spacing:4px;color:#1351b4;font-family:monospace">${code}</span>
    </div>
  </td></tr>
  </table>

  <p style="color:#333;font-size:16px;line-height:1.6;margin:24px 0 24px;text-align:center">
    Ou acesse diretamente pelo link:
  </p>

  <!-- CTA -->
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center">
    <a href="${inviteLink}" style="display:inline-block;background:#1351b4;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600">
      Acessar o Portal
    </a>
  </td></tr>
  </table>

  <p style="color:#666;font-size:13px;line-height:1.5;margin:24px 0 0;text-align:center">
    Se o botão não funcionar, copie e cole este link no navegador:<br>
    <a href="${inviteLink}" style="color:#1351b4">${inviteLink}</a>
  </p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f8f8f8;padding:20px 32px;border-top:1px solid #e0e0e0">
  <p style="color:#999;font-size:12px;line-height:1.5;margin:0;text-align:center">
    Destaques Gov.br — Portal de notícias do Governo Federal
  </p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
