// Global email styles for GULA Resend templates
// Use wrapEmail() to wrap any body content with the standard GULA email shell.

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue:wght@400&display=swap');
  
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: 'Bebas Neue', sans-serif;
    color: #000000;
    -webkit-font-smoothing: antialiased;
  }
  .gula-wrap {
    max-width: 600px;
    margin: 40px auto;
    background: #ffffff;
    border: 1px solid rgba(255, 88, 0, 0.3);
    border-radius: 20px;
    box-shadow: 0 0 60px rgba(255, 88, 0, 0.15), 0 0 100px rgba(255, 88, 0, 0.05);
    overflow: hidden;
  }
  .gula-hero {
    background: linear-gradient(135deg, #FF5800 0%, #E64A00 50%, #FF5800 100%);
    padding: 60px 40px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .gula-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
    animation: pulse 4s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
  .gula-hero-content {
    position: relative;
    z-index: 1;
  }
  .gula-logo {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 48px;
    font-weight: 700;
    color: #000000;
    letter-spacing: 8px;
    text-transform: uppercase;
    margin-bottom: 20px;
    text-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
  }
  .gula-hero h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #000000;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .gula-body {
    padding: 50px 40px;
    background: #ffffff;
  }
  .gula-body h1, .gula-body h2, .gula-body h3 {
    font-family: 'Bebas Neue', sans-serif;
    color: #FF5800;
    margin-top: 0;
    font-weight: 700;
    letter-spacing: 1px;
  }
  .gula-body h1 {
    font-size: 1.8rem;
    margin-bottom: 25px;
  }
  .gula-body p {
    line-height: 1.8;
    color: #333333;
    font-size: 1rem;
    font-weight: 700;
  }
  .gula-body strong {
    color: #000000;
    font-weight: 900;
  }
  .gula-btn {
    display: inline-block;
    background: linear-gradient(135deg, #FF5800, #E64A00);
    color: #000000 !important;
    padding: 18px 50px;
    text-decoration: none;
    border-radius: 50px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem;
    margin-top: 30px;
    text-transform: uppercase;
    letter-spacing: 2px;
    box-shadow: 0 0 30px rgba(255, 88, 0, 0.4), 0 10px 30px rgba(255, 88, 0, 0.2);
    transition: all 0.3s ease;
  }
  .gula-btn:hover {
    box-shadow: 0 0 50px rgba(255, 88, 0, 0.6), 0 15px 40px rgba(255, 88, 0, 0.3);
  }
  .gula-btn-alt {
    display: inline-block;
    background: transparent;
    color: #FF5800 !important;
    padding: 15px 35px;
    text-decoration: none;
    border: 2px solid #FF5800;
    border-radius: 50px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem;
    margin-top: 20px;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 0 20px rgba(255, 88, 0, 0.2);
  }
  .gula-btn-maps {
    display: inline-block;
    background: linear-gradient(135deg, #4285F4, #34A853);
    color: #ffffff !important;
    padding: 18px 40px;
    text-decoration: none;
    border-radius: 50px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem;
    margin-top: 20px;
    text-transform: uppercase;
    letter-spacing: 2px;
    box-shadow: 0 0 30px rgba(66, 133, 244, 0.4), 0 10px 30px rgba(66, 133, 244, 0.2);
    transition: all 0.3s ease;
  }
  .gula-btn-maps:hover {
    box-shadow: 0 0 50px rgba(66, 133, 244, 0.6), 0 15px 40px rgba(66, 133, 244, 0.3);
  }
  .gula-code-box {
    background: linear-gradient(135deg, #000000 0%, #111111 100%);
    border: 2px solid #FF5800;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    margin: 40px 0;
    box-shadow: 0 0 40px rgba(255, 88, 0, 0.2), inset 0 0 30px rgba(255, 88, 0, 0.05);
  }
  .gula-code {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.5rem;
    font-weight: 400;
    color: #FF5800;
    letter-spacing: 6px;
    text-shadow: 0 0 20px rgba(255, 88, 0, 0.5);
  }
  .gula-points {
    display: inline-block;
    background: linear-gradient(135deg, #FF5800, #E64A00);
    color: #000000;
    padding: 12px 30px;
    border-radius: 30px;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem;
    margin-top: 20px;
    box-shadow: 0 0 20px rgba(255, 88, 0, 0.3);
  }
  .gula-card {
    background: linear-gradient(135deg, rgba(255, 88, 0, 0.05) 0%, rgba(255, 88, 0, 0.02) 100%);
    border: 1px solid rgba(255, 88, 0, 0.3);
    border-radius: 15px;
    padding: 30px;
    margin: 25px 0;
    box-shadow: 0 0 30px rgba(255, 88, 0, 0.1);
  }
  .gula-card h3 {
    font-family: 'Bebas Neue', sans-serif;
    color: #FF5800;
    margin-bottom: 20px;
    font-size: 1.2rem;
    letter-spacing: 1px;
  }
  .gula-card ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .gula-card li {
    padding: 12px 0;
    color: #333333;
    border-bottom: 1px solid rgba(255, 88, 0, 0.1);
  }
  .gula-card li:last-child {
    border-bottom: none;
  }
  .gula-card li::before {
    content: "✓ ";
    color: #FF5800;
    font-weight: bold;
    margin-right: 10px;
  }
  .gula-highlight {
    color: #FF5800;
    font-weight: 700;
    text-shadow: 0 0 10px rgba(255, 88, 0, 0.3);
  }
  .gula-badge {
    display: inline-block;
    background: linear-gradient(135deg, #FF5800, #E64A00);
    color: #000000;
    font-family: 'Bebas Neue', sans-serif;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 2px;
    padding: 12px 30px;
    border-radius: 30px;
    font-size: 1rem;
    margin: 20px 0;
    box-shadow: 0 0 25px rgba(255, 88, 0, 0.3);
  }
  .gula-total-box {
    background: linear-gradient(135deg, rgba(255, 88, 0, 0.15) 0%, rgba(255, 88, 0, 0.05) 100%);
    border: 2px solid #FF5800;
    border-radius: 20px;
    padding: 30px;
    margin: 30px 0;
    text-align: center;
    box-shadow: 0 0 40px rgba(255, 88, 0, 0.2);
  }
  .gula-total-box .gula-total {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.5rem;
    font-weight: 400;
    color: #FF5800;
    text-shadow: 0 0 20px rgba(255, 88, 0, 0.5);
  }
  .gula-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
  }
  .gula-table th, .gula-table td {
    padding: 15px;
    border-bottom: 1px solid rgba(255, 88, 0, 0.2);
    text-align: left;
  }
  .gula-table th {
    font-family: 'Bebas Neue', sans-serif;
    color: #FF5800;
    font-weight: 400;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 0.9rem;
  }
  .gula-footer {
    background: #000000;
    padding: 30px;
    text-align: center;
    color: #666666;
    font-size: 0.85rem;
    border-top: 1px solid rgba(255, 88, 0, 0.3);
  }
  .gula-footer a {
    color: #FF5800;
    text-decoration: none;
    font-weight: 900;
  }
  .center {
    text-align: center;
  }
  .gula-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 88, 0, 0.3) 50%, transparent 100%);
    margin: 40px 0;
  }
  .gula-subtitle {
    font-family: 'Bebas Neue', sans-serif;
    color: #FF5800;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 10px;
    font-weight: 700;
  }
`;

export function wrapEmail(bodyHtml: string, opts?: { title?: string; header?: string; noHeader?: boolean }): string {
  const headerHtml = opts?.noHeader
    ? ''
    : `<div class="gula-hero">
         <div class="gula-hero-content">
           <h1>${opts?.header || ''}</h1>
         </div>
       </div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts?.title || ''}</title>
  <style>${GLOBAL_CSS}</style>
</head>
<body>
  <div class="gula-wrap">
    ${headerHtml}
    <div class="gula-body">
      ${bodyHtml}
    </div>
    <div class="gula-footer">
      <p>marketing@thegulacorp.com</p>
      <p>© ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}
