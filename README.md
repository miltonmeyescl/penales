# Versiones — Penales

Esta carpeta reúne los archivos correspondientes a las distintas versiones del proyecto **Penales**, con el objetivo de mantener un historial ordenado y facilitar la identificación, consulta y recuperación de entregas anteriores.

> **Nota:** Este documento describe una convención recomendada para gestionar las versiones. No implica que todos los archivos, etiquetas o procedimientos mencionados ya existan en el repositorio.

## Repositorio

- **Proyecto:** [Penales](https://github.com/miltonmeyescl/penales)
- **Rama principal:** [`main`](https://github.com/miltonmeyescl/penales/tree/main)
- **Carpeta de versiones:** [`versiones/`](https://github.com/miltonmeyescl/penales/tree/main/versiones)

## Objetivo

- Conservar entregas anteriores del proyecto.
- Identificar los cambios incorporados en cada versión.
- Facilitar las tareas de revisión y respaldo.
- Permitir localizar una versión determinada cuando sea necesario.

## Consulta de versiones

1. Abrir la [carpeta `versiones`](https://github.com/miltonmeyescl/penales/tree/main/versiones).
2. Identificar el archivo o directorio que corresponda a la versión requerida.
3. Revisar la información que acompañe a esa entrega, si está disponible.
4. Descargar los archivos necesarios desde GitHub.

**Importante:** antes de ejecutar, instalar o reemplazar archivos, revisar las instrucciones y dependencias específicas de la versión elegida. No debe suponerse que dos versiones son compatibles entre sí.

## Registro de cambios

Se recomienda documentar cada entrega con el siguiente formato:

| Versión | Fecha | Tipo de cambio | Descripción |
| --- | --- | --- | --- |
| *Por completar* | *AAAA-MM-DD* | *Inicial / Mejora / Corrección* | *Resumen de los cambios* |

Las versiones reales deben incorporarse a esta tabla una vez revisado el contenido existente en `versiones/`.

## Convención recomendada de versiones

Para futuras entregas, puede adoptarse el formato `MAJOR.MINOR.PATCH`:

- **MAJOR:** cambios importantes o incompatibles con versiones anteriores.
- **MINOR:** nuevas funcionalidades compatibles.
- **PATCH:** correcciones y ajustes menores compatibles.

Ejemplo: `v1.2.3`.

Esta convención es una **propuesta** y no representa necesariamente el esquema ya utilizado por el proyecto.

## Procedimiento recomendado para publicar una versión

1. Confirmar que los cambios estén completos y revisados.
2. Definir el identificador de la nueva versión.
3. Incorporar los archivos de la entrega a `versiones/` siguiendo la organización existente.
4. Registrar fecha, descripción de cambios y requisitos especiales.
5. Verificar que la entrega se pueda recuperar y utilizar.
6. Crear una etiqueta (*tag*) de Git, si el equipo utiliza etiquetas para identificar versiones.

## Historial y trazabilidad

El historial completo de modificaciones puede consultarse mediante los [commits del repositorio](https://github.com/miltonmeyescl/penales/commits/main/). Si se utilizan etiquetas o publicaciones de GitHub, también pueden revisarse en [Releases](https://github.com/miltonmeyescl/penales/releases).

## Consideraciones

- Mantener los nombres de archivos y directorios consistentes.
- Evitar modificar entregas históricas ya publicadas; preferir una nueva versión cuando exista un cambio.
- No incluir contraseñas, claves privadas, tokens ni otras credenciales en los archivos versionados.
- Documentar cualquier requisito que cambie entre versiones.

---

**Mantenimiento:** repositorio [`miltonmeyescl/penales`](https://github.com/miltonmeyescl/penales).  
**Estado del documento:** README inicial, pendiente de completar con el inventario real de `versiones/`.
