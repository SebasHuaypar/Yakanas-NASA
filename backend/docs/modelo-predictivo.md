# Modelo predictivo: comparación de métodos

Es un extra. No cambia la armonización ni las rutas de la API.

## Qué se predice

Si una zona de 0,06° (unos 6,6 km de lado) tendrá fuego a 15 días o menos de una fecha del calendario, el año siguiente. Es la misma pregunta que responde la página de prevención.

## El segundo pipeline

`backend/run_modelo.py` toma la tabla armonizada por celda y día (`data/processed/fire_cell_day.parquet`, la que escribe `run_serie.py`) y hace tres pasos:

1. **Lee y revisa repetidos.** De 823 513 filas, 991 comparten celda y día. Todas son celdas en el límite entre dos departamentos, con una fila por departamento y sus propios hotspots. No hay doble conteo, y al pasar a zonas se cuentan una vez.
2. **Arma la tabla de entrenamiento.** Una fila por zona, fecha y año, con 11 variables calculadas solo con años anteriores: la recurrencia en la ventana, la de los 3 últimos años, si ardió el último año, años desde la última vez, la recurrencia de las zonas vecinas, la recurrencia con ventanas de ±30 y ±7 días, la del año entero, la intensidad media y la época del año. Son 1,7 millones de filas.
3. **Compara los métodos.** Cada año de 2019 a 2025 se predice con modelos entrenados solo con los años anteriores, y se mide contra lo que ardió.

```bash
cd backend
pip install -r requirements-modelo.txt
python run_modelo.py        # unos 3 minutos; escribe data/out/modelos_comparacion.json
```

## Resultado

| Método | Precisión media | AUC | Aciertos en las zonas marcadas | Fuego que anticipan |
|---|---|---|---|---|
| Recurrencia (la regla que sirve la API) | 0,571 | 0,857 | 83,0 % | 28,1 % |
| Regresión lineal | 0,639 | 0,894 | 84,0 % | 28,5 % |
| Regresión logística | 0,637 | 0,893 | 83,7 % | 28,4 % |
| Bosque aleatorio | 0,641 | 0,894 | 84,4 % | 28,6 % |
| Gradient boosting | 0,638 | 0,893 | 84,1 % | 28,5 % |

La precisión media dice qué tan bien se ordenan las zonas de más a menos probable (1 es perfecto). En las dos últimas columnas todos los métodos marcan el mismo número de zonas: las que la recurrencia da con fuego en 7 de cada 10 años o más.

## Qué significa

- **Entrenar ayuda a ordenar.** Los cuatro modelos entrenados ordenan las zonas mejor que la recurrencia sola: la precisión media sube de 0,57 a 0,64.
- **En las alertas principales casi no cambia nada.** En las zonas más marcadas el acierto pasa de 83 % a 84 %.
- **Un modelo complejo no gana a uno simple.** El bosque aleatorio queda primero por milésimas; la regresión lineal y la logística dan lo mismo.
- **La actividad reciente no aporta.** Añadir si la zona ardió en los 30 días previos del mismo año sube la precisión media de 0,637 a 0,642.

La variable que más pesa es la recurrencia con ventana de ±30 días. Es decir, casi toda la señal está en dónde y cuándo se repite el fuego.

## Recomendación

Mantener la recurrencia en la API: se explica en una frase ("ardió en 12 de 15 años") y acierta casi lo mismo. Si se quiere un modelo entrenado, usar la regresión logística: rinde igual que los complejos, da probabilidades y sus pesos se pueden leer.

Ningún método usa lluvia, sequía ni viento. Para subir de verdad el acierto haría falta sumar datos de clima, no cambiar de algoritmo.

## El modelo que sirve la API (rama `backend-modelo-logistico`)

Se decidió pasar a un modelo entrenado, no por el clima (que no está en nuestros datos) sino porque es más robusto como base: da una probabilidad, se valida con años que no vio y admite nuevas variables sin rehacer la regla. Se eligió la regresión logística porque la pregunta es de sí o no, da probabilidades entre 0 y 1 y sus pesos se pueden leer.

- `run_modelo.py` ahora, además de comparar, entrena el modelo final con 2016–2025 y lo guarda como coeficientes en `data/out/modelo_logistico.json`.
- `app/modelo.py` calcula las mismas variables que el entrenamiento y evalúa el modelo con numpy, así que la API no necesita scikit-learn y lo validado es lo que se sirve.
- Rutas nuevas: `GET /prevention/model` y `GET /prevention/model/info` (ver `docs/API.md`). `/recurrence` no cambia y queda como respaldo.
- Pruebas: `tests/test_modelo_ml.py` comprueba que las variables no ven el año que se predice.

Qué mejora y qué no, con los números de la tabla de arriba: ordena mejor las zonas (precisión media 0,637 frente a 0,571) y acierta casi igual en las zonas marcadas (83,7 % frente a 83,0 %). Sigue cubriendo solo el 28 % del fuego y no usa clima. Si más adelante se suman lluvia o sequía, basta agregar columnas a `variables()` y volver a correr `run_modelo.py`.
