// GULA - Footer estándar inyectado dinámicamente
// Uso: <script src="footer.js" defer></script> antes de </body>
// Inserta el footer al final de <body> si no existe ya uno con id="gula-footer"

(function () {
    if (document.getElementById('gula-footer')) return;
    const style = document.createElement('style');
    style.textContent = `
        #gula-footer{background:rgba(0,0,0,0.95);border-top:2px solid rgba(255,88,0,0.3);padding:60px 40px 30px;margin-top:80px;font-family:'Inter',sans-serif;color:#b0b0b0}
        #gula-footer .gf-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:40px;margin-bottom:40px}
        #gula-footer h4{color:#FF5800;font-size:1rem;font-weight:900;margin-bottom:20px;font-family:'Akira Expanded',sans-serif;text-transform:uppercase;letter-spacing:2px}
        #gula-footer ul{list-style:none;padding:0;margin:0}
        #gula-footer ul li{margin-bottom:10px}
        #gula-footer ul li a{color:#b0b0b0;text-decoration:none;font-weight:300;font-size:0.95rem;transition:color 0.3s ease}
        #gula-footer ul li a:hover{color:#FF5800}
        #gula-footer p{color:#b0b0b0;font-size:0.9rem;line-height:1.6;font-weight:300;margin:0}
        #gula-footer .gf-bottom{border-top:1px solid rgba(255,88,0,0.3);padding-top:30px;text-align:center;max-width:1200px;margin:0 auto;color:#b0b0b0;font-weight:300;font-size:0.85rem}
        #gula-footer .gf-social{display:flex;gap:15px;margin-top:15px}
        #gula-footer .gf-social a{color:#b0b0b0;font-size:1.1rem;transition:all 0.3s ease}
        #gula-footer .gf-social a:hover{color:#FF5800;transform:translateY(-2px)}
    `;
    document.head.appendChild(style);
    const footer = document.createElement('footer');
    footer.id = 'gula-footer';
    footer.innerHTML = `
        <div class="gf-grid">
            <div>
                <h4>GULA</h4>
                <p>Creamos la mejor experiencia gastronómica de calidad estimulando tu humanidad.</p>
                <div class="gf-social">
                    <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="#" aria-label="TikTok"><i class="fab fa-tiktok"></i></a>
                    <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                </div>
            </div>
            <div>
                <h4>Navegación</h4>
                <ul>
                    <li><a href="gulatemplate.html">Inicio</a></li>
                    <li><a href="sobre.html">Nosotros</a></li>
                    <li><a href="marketplace.html">Menú</a></li>
                    <li><a href="CLUBGULA.html">Club GULA</a></li>
                </ul>
            </div>
            <div>
                <h4>Servicios</h4>
                <ul>
                    <li><a href="dinein.html">Dine In</a></li>
                    <li><a href="takeaway.html">Take Away</a></li>
                    <li><a href="delivery.html">Delivery</a></li>
                    <li><a href="eventos.html">Eventos</a></li>
                    <li><a href="franquicias.html">Franquicias</a></li>
                </ul>
            </div>
            <div>
                <h4>Legal</h4>
                <ul>
                    <li><a href="privacidad.html">Privacidad</a></li>
                    <li><a href="legal.html">Legal</a></li>
                    <li><a href="cookies.html">Cookies</a></li>
                </ul>
            </div>
        </div>
        <div class="gf-bottom">
            <p>&copy; 2026 GULA Corp. Todos los derechos reservados.</p>
        </div>
    `;
    document.body.appendChild(footer);
})();
