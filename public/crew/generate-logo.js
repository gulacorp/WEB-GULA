// Script para generar imagen del logo GULA como base64
// Ejecutar con: node generate-logo.js

const fs = require('fs');

// SVG del logo GULA con fuente serif del sistema (similar a Aveline)
// Usamos fuentes del sistema porque los emails no cargan Google Fonts en SVG
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100" viewBox="0 0 300 100">
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Georgia, 'Times New Roman', serif" 
        font-size="72" 
        font-weight="900" 
        letter-spacing="12" 
        fill="#000000"
        style="text-transform: uppercase;">GULA</text>
</svg>`;

// Convertir SVG a base64
const base64Svg = Buffer.from(logoSvg).toString('base64');
const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

console.log('SVG Data URL para usar en emails:');
console.log(dataUrl);

// Guardar en archivo
fs.writeFileSync('gula-logo-base64.txt', dataUrl);
console.log('\nGuardado en gula-logo-base64.txt');
