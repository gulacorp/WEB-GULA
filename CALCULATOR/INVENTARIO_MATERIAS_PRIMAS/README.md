# Inventario de Materias Primas

Proyecto para convertir las facturas PDF de `Facturas para inventario` en una biblioteca visual de productos base.

## Cómo generar la biblioteca

Desde la carpeta `INVENTARIO_MATERIAS_PRIMAS`, ejecuta:

```bash
python3 generate_inventory_library.py
```

## Archivos generados

- `output/biblioteca_materias_primas.html`: menú visual para consultar productos.
- `output/materias_primas.csv`: tabla editable/importable en Excel o Google Sheets.
- `output/materias_primas.json`: datos estructurados para futuras integraciones.

## Campos principales

- `Referencia`: código principal del producto.
- `Producto`: descripción de la materia prima.
- `Categoria`: sección detectada en factura.
- `Coste Medio Sin IVA`: promedio de compras detectadas.
- `Ultimo Coste Sin IVA`: último coste encontrado por fecha.
- `Historial`: detalle por factura en el archivo JSON y en la ficha del HTML.

## Nota

La extracción depende del texto interno de los PDFs. Si alguna factura viene escaneada como imagen, primero habría que pasarla por OCR.
