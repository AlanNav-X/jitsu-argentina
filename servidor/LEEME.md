# Panel de clases

El ícono de ingreso del menú abre un panel donde el administrador indica, para cada fecha y sede, si hay clase o no. Por ejemplo, para confirmar una clase en un día feriado. Los cambios se guardan en una hoja de cálculo de Google mediante el script `Codigo.gs`, y el sitio los lee para mostrar los horarios.

El usuario y la contraseña no están en el repositorio. Se cargan como propiedades privadas del script.

## Instalación (una sola vez)

1. Crear una hoja de cálculo nueva en Google Drive, por ejemplo "Clases Jiu Jitsu".
2. En la hoja, ir a **Extensiones → Apps Script**.
3. Borrar el contenido de `Código.gs` y pegar el de `servidor/Codigo.gs`. Guardar.
4. Ir a **Configuración del proyecto** (ícono de engranaje) → **Propiedades del script** → **Agregar propiedad del script**, y cargar dos:
   - `ADMIN_USUARIO`: el nombre de usuario.
   - `ADMIN_CLAVE`: la contraseña.
5. Volver al editor y tocar **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**.
   - Ejecutar como: **Yo**.
   - Quién tiene acceso: **Cualquier usuario**.
6. Autorizar los permisos que pide Google (acceso a la hoja de cálculo).
7. Copiar la **URL de la aplicación web** (termina en `/exec`).
8. Generar el sitio con esa URL:

   ```bash
   API_CLASES=https://script.google.com/macros/s/…/exec node build.mjs
   ```

   o dejarla fija en la constante `API_CLASES` de `build.mjs`.

## Cambiar la contraseña

Editar la propiedad `ADMIN_CLAVE` en **Configuración del proyecto → Propiedades del script**. No hace falta volver a implementar.

## Si se modifica `Codigo.gs`

**Implementar → Administrar implementaciones → editar (lápiz) → Versión: nueva versión → Implementar.** Así la URL sigue siendo la misma.

## Seguridad

- Después de 10 intentos fallidos, el ingreso se bloquea 15 minutos.
- La sesión dura 6 horas.
- La hoja solo guarda fecha, sede, si hay clase, cuándo se cambió y quién lo hizo.
