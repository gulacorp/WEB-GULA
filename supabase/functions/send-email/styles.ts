// Global email styles for GULA Resend templates
// Use wrapEmail() to wrap any body content with the standard GULA email shell.

export const GLOBAL_CSS = `
  body {
    margin: 0;
    padding: 0;
    background: #0a0a0a;
    font-family: 'Inter', Arial, Helvetica, sans-serif;
    color: #ffffff;
    -webkit-font-smoothing: antialiased;
  }
  .gula-wrap {
    max-width: 600px;
    margin: 0 auto;
    background: #111111;
    border-left: 4px solid #FF5800;
    border-right: 4px solid #FF5800;
  }
  .gula-header {
    background: linear-gradient(135deg, #FF5800, #FF7A29);
    padding: 40px 24px;
    text-align: center;
  }
  .gula-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 900;
    color: #000000;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .gula-body {
    padding: 40px 32px;
  }
  .gula-body h1, .gula-body h2, .gula-body h3 {
    color: #FF5800;
    margin-top: 0;
  }
  .gula-body p {
    line-height: 1.6;
    color: #cccccc;
  }
  .gula-body strong {
    color: #ffffff;
  }
  .gula-logo {
    font-size: 32px;
    font-weight: 900;
    color: #FF5800;
    text-align: center;
    margin-bottom: 30px;
    letter-spacing: 4px;
  }
  .gula-btn {
    display: inline-block;
    background: linear-gradient(135deg, #FF5800, #FF7A29);
    color: #000000 !important;
    padding: 15px 40px;
    text-decoration: none;
    border-radius: 50px;
    font-weight: 900;
    font-size: 1rem;
    margin-top: 20px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .gula-btn-alt {
    display: inline-block;
    background: #FF5800;
    color: #000000 !important;
    padding: 15px 30px;
    text-decoration: none;
    border-radius: 10px;
    font-weight: 700;
    margin-top: 20px;
  }
  .gula-code-box {
    background: #000000;
    border: 2px dashed #FF5800;
    border-radius: 15px;
    padding: 30px;
    text-align: center;
    margin: 30px 0;
  }
  .gula-code {
    font-size: 2rem;
    font-weight: 900;
    color: #FF5800;
    letter-spacing: 4px;
  }
  .gula-points {
    display: inline-block;
    background: #FF5800;
    color: #000000;
    padding: 8px 20px;
    border-radius: 20px;
    font-weight: 900;
    margin-top: 15px;
  }
  .gula-card {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    padding: 20px;
    margin: 20px 0;
  }
  .gula-card h3 {
    color: #FF5800;
    margin-bottom: 15px;
  }
  .gula-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .gula-card li {
    padding: 8px 0;
    color: #dddddd;
  }
  .gula-card li::before {
    content: "✓ ";
    color: #FF5800;
    font-weight: bold;
  }
  .gula-highlight {
    color: #FF5800;
    font-weight: 700;
  }
  .gula-badge {
    display: inline-block;
    background: #FF5800;
    color: #000000;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 10px 24px;
    border-radius: 30px;
    font-size: 1.1rem;
    margin: 16px 0;
  }
  .gula-total-box {
    background: rgba(255, 88, 0, 0.1);
    border: 1px solid #FF5800;
    border-radius: 15px;
    padding: 20px;
    margin: 24px 0;
    text-align: center;
  }
  .gula-total-box .gula-total {
    font-size: 28px;
    font-weight: 900;
    color: #FF5800;
  }
  .gula-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  .gula-table th, .gula-table td {
    padding: 10px;
    border-bottom: 1px solid #333333;
    text-align: left;
  }
  .gula-table th {
    color: #FF5800;
    font-weight: 700;
  }
  .gula-footer {
    background: #000000;
    padding: 24px;
    text-align: center;
    color: #666666;
    font-size: 0.8rem;
    border-top: 1px solid rgba(255, 88, 0, 0.13);
  }
  .gula-footer a {
    color: #FF5800;
    text-decoration: none;
  }
  .center {
    text-align: center;
  }
`;

export function wrapEmail(bodyHtml: string, opts?: { title?: string; header?: string; noHeader?: boolean }): string {
  const headerHtml = opts?.noHeader
    ? ''
    : `<div class="gula-header"><h1>${opts?.header || 'GULA'}</h1></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts?.title || 'GULA'}</title>
  <style>${GLOBAL_CSS}</style>
</head>
<body>
  <div class="gula-wrap">
    ${headerHtml}
    <div class="gula-body">
      ${bodyHtml}
    </div>
    <div class="gula-footer">
      <p>The Gula Corporation · marketing@thegulacorp.com</p>
      <p>© ${new Date().getFullYear()} GULA Corp</p>
    </div>
  </div>
</body>
</html>`;
}
