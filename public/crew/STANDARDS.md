# GULA — Sistema de Diseño

**Documento de referencia único.** Toda nueva página o modificación debe seguir estos estándares. Los archivos de verdad que definen el sistema son `gulatemplate.html` (home) y `CLUBGULA.html` (registro). El resto de páginas los siguen.

---

## 1. Tipografía

### 1.1 Familias de fuentes

| Alias CSS | Archivo | Uso |
|-----------|---------|-----|
| `'Aveline'` | `AvelineRegular.otf` (local) | Títulos principales, logo, hero |
| `'Akira Expanded'` | `Akira Expanded Demo.otf` (local) | Botones, nav links, CTAs, badges |
| `'Inter'` | Google Fonts (`300;400;700;900`) | Cuerpo, descripciones, párrafos, formularios |

Cargar SIEMPRE en `<head>`:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet">
<style>
  @font-face { font-family: 'Akira Expanded'; src: url('Akira Expanded Demo.otf') format('opentype'); font-display: swap; }
  @font-face { font-family: 'Aveline'; src: url('AvelineRegular.otf') format('opentype'); font-display: swap; }
</style>
```

### 1.2 Jerarquía tipográfica (OBLIGATORIA en todas las páginas)

| Nivel | Clase / Tag | Fuente | Tamaño | Peso | Transform | Tracking |
|-------|-------------|--------|--------|------|-----------|----------|
| **Hero Title (H1)** | `.hero h1` | Aveline | `clamp(3rem, 8vw, 6rem)` | 900 | UPPER | 2px |
| **Section Title (H2)** | `.section-title` | Aveline | `clamp(2.5rem, 6vw, 4rem)` | 900 | UPPER | 1px |
| **Card / Sub Title (H3)** | `.store-card h3`, `.card-title` | Aveline | `1.3rem – 1.8rem` | 900 | UPPER | 1-2px |
| **Nav Links** | `.nav-center a` | Akira Expanded | `0.95rem` | 600 | UPPER | 1px |
| **Buttons Primary** | `.primary-btn`, `.nav-btn-primary` | Akira Expanded | `1rem` (CTA) / `0.75rem` (nav) | 900 | UPPER | 2px (CTA) / 1px (nav) |
| **Buttons Outline** | `.nav-btn-outline` | Akira Expanded | `0.75rem` | 900 | UPPER | 1px |
| **Hero Subtitle** | `.hero-subtitle` | Inter | `1.3rem` | 300 | none | normal |
| **Section Description** | `.section-description` | Inter | `1.1rem` | 300 | none | normal |
| **Body / Párrafos** | `p`, `body` | Inter | `1rem` | 400 | none | normal |
| **Small / Meta** | `span`, `.meta` | Inter | `0.85rem` | 400 | none | normal |

**Color de highlight** en títulos: envolver palabra clave en `<span class="highlight">` → naranja `var(--gula-orange)` con `text-shadow: 0 0 20px rgba(255,88,0,0.3)`.

---

## 2. Paleta de colores

```css
:root {
    --gula-orange:        #FF5800;   /* Primario - CTAs, acentos */
    --gula-orange-light:  #FF7A29;   /* Gradientes */
    --gula-orange-dark:   #E64A00;   /* Hover estados */
    --bg-dark:            #000000;   /* Fondo principal */
    --bg-card:            #111111;   /* Cards, paneles */
    --bg-hover:           #1a1a1a;   /* Hover de cards */
    --accent-white:       #ffffff;   /* Texto principal */
    --text-secondary:     #b0b0b0;   /* Texto secundario, meta */
    --border-color:       rgba(255, 88, 0, 0.3);   /* Bordes */
    --border-color-strong:rgba(255, 88, 0, 0.6);   /* Bordes activos */
}
```

### Uso de color
- **Fondo:** siempre `--bg-dark` (#000). NUNCA usar blanco de fondo.
- **Texto principal:** `#fff`.
- **Texto secundario:** `var(--text-secondary)` (#b0b0b0) para descripciones, labels, meta.
- **Acento naranja:** SOLO en CTAs, highlights de títulos, iconos destacados, bordes de hover. No abusar.
- **Gradientes:** `linear-gradient(135deg, #FF5800 0%, #FF7A29 100%)` para botones primarios.

---

## 3. Navbar (estándar único)

**Altura fija:** 80px. **Posición:** `fixed top 0`.

### Estructura HTML obligatoria

```html
<nav>
    <a href="gulatemplate.html" class="nav-logo">GULA</a>
    <ul class="nav-center">
        <li><a href="gulatemplate.html">Inicio</a></li>
        <li><a href="sobre.html">Nosotros</a></li>
        <li><a href="marketplace.html">Menú</a></li>
        <li><a href="franquicias.html">Franquicias</a></li>
        <li><a href="contacto.html">Contacto</a></li>
    </ul>
    <div class="nav-right">
        <input type="search" class="search-bar" placeholder="Buscar...">
        <div class="cart-icon">
            <i class="fas fa-shopping-bag"></i>
            <span class="cart-count">0</span>
        </div>
        <a href="franquiciado.html" class="nav-btn-outline">Hazte Franquiciado</a>
        <a href="CLUBGULA.html" class="nav-btn-primary">Club GULA</a>
    </div>
</nav>
```

### Características
- Fondo translúcido `rgba(0,0,0,0.7)` + `backdrop-filter: blur(20px)`
- Texto fantasma animado "GULA G GULA G..." en `::before` (desplazamiento 20s)
- Borde inferior `2px solid var(--border-color)` con `box-shadow` naranja
- **Enlaces relativos.** Nunca absolutos ni con `/`.

### `main` siempre con `padding-top: 80px` para compensar el navbar fijo.

---

## 4. Botones (3 variantes únicas)

| Variante | Clase | Uso |
|----------|-------|-----|
| **Primary** | `.nav-btn-primary`, `.primary-btn` | CTA principal — "Comprar", "Club GULA", "Enviar" |
| **Outline** | `.nav-btn-outline`, `.secondary-btn` | CTA secundario — "Hazte Franquiciado", "Ver más" |
| **Ghost** | `.ghost-btn` | Acciones terciarias — "Cancelar", "Cerrar" |

Reglas:
- **Border-radius** siempre 25px (navbar) o 50px (CTA grande).
- **Padding:** `10px 20px` (nav) / `16px 50px` (hero CTA).
- **Transición:** `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)` — efecto "pop" elástico.
- Hover primary: `transform: scale(1.05)` + glow más intenso.
- Hover outline: invierte colores (fondo naranja, texto negro).

---

## 5. Animaciones (catálogo)

Todas las keyframes vivienen en cada archivo (no hay CSS externo). Las estándar son:

```css
@keyframes fadeInUp   { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(50px); } to { opacity: 1; transform: translateX(0); } }
@keyframes slideHorizontal { 0% { transform: translateY(-50%) translateX(0); } 100% { transform: translateY(-50%) translateX(-50%); } }
@keyframes shimmer    { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes pulse      { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
@keyframes float      { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes glow       { 0%, 100% { box-shadow: 0 0 20px rgba(255,88,0,0.3); } 50% { box-shadow: 0 0 40px rgba(255,88,0,0.6); } }
```

### Timing estándar
- **Hover:** `0.3s ease` (simple) o `0.4s cubic-bezier(0.34, 1.56, 0.64, 1)` (elástico)
- **Entradas (load):** `0.8s ease-out` con delay escalonado `0.2s` por elemento
- **Fondos ambientales:** 20s+ linear infinite (texto animado, shimmer)

### Scroll reveal
Usar `IntersectionObserver` con clase `.reveal` → al entrar en viewport añade `.revealed` que aplica `fadeInUp`. Evitar librerías externas.

---

## 6. Layout & Espaciado

### Contenedores
- **Max-width:** `1400px` (marketplace/grids amplios), `1100px` (formularios), `800px` (texto legal).
- **Padding lateral:** `40px` desktop, `20px` móvil (breakpoint 768px).
- **Padding vertical de secciones:** `80px 40px` normal, `120px 40px` hero.

### Grids
- **Cards productos:** `repeat(auto-fill, minmax(300px, 1fr))` con gap `30px`.
- **Stores:** `repeat(auto-fit, minmax(280px, 1fr))` con gap `30px`.

### Cards (patrón único)
```css
.card {
    background: rgba(20,20,20,0.8);
    border: 1.5px solid var(--border-color);
    border-radius: 20px;
    padding: 40px;
    backdrop-filter: blur(10px);
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card:hover {
    transform: translateY(-8px);
    border-color: var(--border-color-strong);
    box-shadow: 0 20px 60px rgba(255,88,0,0.2);
}
```

---

## 7. Footer (estructura única)

```html
<footer>
    <div class="footer-grid">
        <!-- Columna 1: Marca -->
        <div class="footer-col">
            <div class="footer-logo">GULA</div>
            <p>La experiencia gastronómica que despierta tu humanidad.</p>
        </div>
        <!-- Columna 2: Servicios -->
        <div class="footer-col">
            <h4>Servicios</h4>
            <ul>
                <li><a href="dinein.html">Dine In</a></li>
                <li><a href="takeaway.html">Take Away</a></li>
                <li><a href="delivery.html">Delivery</a></li>
                <li><a href="eventos.html">Eventos</a></li>
                <li><a href="franquicias.html">Franquicias</a></li>
            </ul>
        </div>
        <!-- Columna 3: Empresa -->
        <div class="footer-col">
            <h4>Empresa</h4>
            <ul>
                <li><a href="sobre.html">Sobre Nosotros</a></li>
                <li><a href="contacto.html">Contacto</a></li>
                <li><a href="CLUBGULA.html">Club GULA</a></li>
            </ul>
        </div>
        <!-- Columna 4: Legal -->
        <div class="footer-col">
            <h4>Legal</h4>
            <ul>
                <li><a href="legal.html">Aviso Legal</a></li>
                <li><a href="privacidad.html">Privacidad</a></li>
                <li><a href="cookies.html">Cookies</a></li>
            </ul>
        </div>
    </div>
    <div class="footer-bottom">
        <p>&copy; 2026 GULA. Todos los derechos reservados.</p>
    </div>
</footer>
```

`h4` del footer: Akira Expanded, 0.9rem, uppercase, tracking 2px, color naranja.

---

## 8. Imágenes & Assets

- **Logo:** `14-removebg-preview.png` (no usar texto cuando haya espacio para el PNG).
- **Productos:** `images/{producto}.png` — fondo transparente, 800px ancho mínimo.
- **Placeholders:** si falta imagen, usar `<div class="img-placeholder">` con fondo gradiente naranja oscuro, nunca dejar `alt=""`.

---

## 9. Tono de marca

### Cómo escribir
- **Directo, sensual, premium.** Sin adjetivos huecos tipo "el mejor".
- Español neutro (evitar "tío", "crack", etc.).
- Frases cortas. Verbos activos.
- Hablar de **experiencia**, **calidad**, **humanidad**, **sabor**.

### Misión oficial
> "Creamos la mejor experiencia gastronómica de calidad estimulando tu humanidad."

### Visión oficial
> "Ser el referente global en gastronomía de calidad rápida, adaptándonos a ti."

### Palabras prohibidas
- Nada de **emojis**. Nunca.
- Nada de **"barato"**, **"fast food"**, **"comida rápida"** (decir "quick food service" o "servicio rápido").
- No mencionar **cifras financieras**, **inversores**, **valoraciones**, **rondas**.
- No mencionar **debilidades** ni **competidores** por nombre.

---

## 10. Páginas del sitio (mapa)

| Archivo | Propósito | Fuente de verdad estilística |
|---------|-----------|------------------------------|
| `index.html` | Redirige a gulatemplate.html | — |
| `gulatemplate.html` | Landing principal | **ORIGEN DEL SISTEMA** |
| `marketplace.html` | Menú / Pedido | Replica gulatemplate |
| `CLUBGULA.html` | Registro / Login Club | **ORIGEN DEL SISTEMA** |
| `sobre.html` | Historia, equipo, misión | Replica gulatemplate |
| `franquicias.html` | Info franquicias + tiers | Replica gulatemplate |
| `franquiciado.html` | Formulario solicitud | Replica gulatemplate |
| `contacto.html` | Formulario contacto + mapa | Replica gulatemplate |
| `profile.html` | Perfil usuario logueado | Replica CLUBGULA |
| `dinein.html` | Servicio Dine In (blog) | Replica gulatemplate |
| `takeaway.html` | Servicio Take Away (blog) | Replica gulatemplate |
| `delivery.html` | Servicio Delivery (blog) | Replica gulatemplate |
| `eventos.html` | Servicio Eventos (blog) | Replica gulatemplate |
| `legal.html` | Aviso legal | Replica gulatemplate (texto plano) |
| `privacidad.html` | Política privacidad | Replica gulatemplate |
| `cookies.html` | Política cookies | Replica gulatemplate |

---

## 11. Ubicaciones oficiales (nunca inventar)

| Ciudad | Dirección |
|--------|-----------|
| Móstoles | C. Río Segura, 30 — 28935 Móstoles, Madrid |
| Valencia | C/ de Cadis, 41 — L'Eixample, 46004 València |
| Cartagena | C. Jiménez de la Espada, 17 — 30204 Cartagena, Murcia |
| Sevilla | C. Chucena, s/n — Edificio Alcaitán local 7, 41006 Sevilla |

---

## 12. Checklist antes de hacer commit

- [ ] Navbar idéntico a gulatemplate.html
- [ ] Footer idéntico con los 5 servicios
- [ ] Tipografía sigue la jerarquía de la sección 1.2
- [ ] Colores solo usan las variables CSS de `:root`
- [ ] Enlaces relativos (sin `/` inicial)
- [ ] Sin emojis
- [ ] Animaciones usan el catálogo de keyframes estándar
- [ ] Main tiene `padding-top: 80px`
- [ ] Imágenes con `alt` descriptivo
- [ ] Responsive en 768px y 480px

---

**Última actualización:** Abril 2026
