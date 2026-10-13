# Seguimiento de seguridad

## GHSA-vfj7-8cjw-p6xm

- Aviso: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- Dependencia afectada: `braces@3.0.3`, mediante `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`.
- Riesgo: agotamiento de pila ante patrones profundamente anidados; dependencia de desarrollo empleada por ESLint, sin ruta identificada desde solicitudes de la aplicación.
- Tratamiento aprobado: mitigación documentada temporal. Mantener patrones de lint locales y controlados, sin aceptar patrones procedentes de solicitudes o entradas externas.
- Estado: abierto; el aviso no publica una versión corregida. No aplicar overrides hacia versiones inexistentes ni ocultar otros avisos.
- Revisar antes de cada entrega y actualización de ESLint. Actualizar cuando exista una corrección compatible, ejecutar todas las comprobaciones y retirar esta excepción cuando la auditoría confirme su resolución.

Ejecuta `pnpm audit --prod` y `pnpm audit`. La primera debe pasar; la segunda debe revisarse completa y solo admite temporalmente el aviso anterior en la cadena de desarrollo indicada. El código de salida no cero de la auditoría completa se conserva: no se ignora el aviso ni se modifica el comando para ocultarlo. Cualquier aviso adicional requiere una revisión propia. Una indisponibilidad del registro no constituye una auditoría satisfactoria.

## Actualizaciones consultadas y decisión

Consulta del registro npm y del [aviso oficial](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) el 2026-10-13:

| Paquete                    | Versión instalada | Última versión consultada | Dependencia relevante                         |
| -------------------------- | ----------------- | ------------------------- | --------------------------------------------- |
| `@next/eslint-plugin-next` | `16.3.8`          | `16.4.0`                  | Mantiene `fast-glob@3.3.1`.                   |
| `fast-glob`                | `3.3.1`           | `3.3.3`                   | Mantiene `micromatch@^4.0.8`.                 |
| `micromatch`               | `4.0.8`           | `4.0.8`                   | Mantiene `braces@^3.0.3`.                     |
| `braces`                   | `3.0.3`           | `3.0.3`                   | El aviso no identifica una versión corregida. |

`pnpm why braces` confirma una única cadena instalada: `eslint-config-next@16.3.8 → @next/eslint-plugin-next@16.3.8 → fast-glob@3.3.1 → micromatch@4.0.8 → braces@3.0.3`. Actualizar únicamente el plugin a la versión consultada todavía conserva la dependencia vulnerable; actualizar `fast-glob` a la versión consultada tampoco la elimina.

Decisión aprobada: conservar la mitigación temporal con patrones de lint definidos y revisados en el proyecto. La configuración actual no recibe patrones de peticiones ni entradas externas. Este seguimiento no aplica un parche local, cambia versiones ni retira reglas de lint. La vulnerabilidad sigue abierta y visible en la auditoría.

Antes de cada entrega o actualización de ESLint, repetir ambas auditorías y consultar las versiones y dependencias de esta cadena. Retirar la excepción cuando exista una corrección compatible o se elimine la dependencia afectada, manteniendo las reglas de lint. Verificar la nueva cadena, ejecutar las comprobaciones del proyecto descritas en [testing.md](testing.md) y confirmar que ambas auditorías quedan sin este aviso antes de declarar cerrado el seguimiento.

## Última comprobación

2026-10-09: `pnpm audit --prod` sin avisos. `pnpm audit` devuelve únicamente un aviso alto, GHSA-vfj7-8cjw-p6xm, por la cadena de ESLint indicada. Se revisó la auditoría después de añadir `tsx` y Playwright; la excepción temporal permanece abierta.

La incorporación del diagnóstico no añadió dependencias. Auditorías repetidas el 2026-10-09 con el mismo resultado. Los informes no incluyen credenciales ni respuestas originales de Redmine.

2026-10-13: adaptación a usuarios normales sin añadir dependencias. `pnpm audit --prod` no detecta vulnerabilidades; `pnpm audit` conserva únicamente GHSA-vfj7-8cjw-p6xm en la cadena de ESLint, sin versión corregida según el registro. La excepción temporal sigue abierta.

2026-10-13: auditorías repetidas tras el seguimiento de sesión y documentación T019–T020, sin cambios de dependencias. Producción sin avisos; auditoría completa con el mismo único aviso de desarrollo y sin versión corregida publicada por el registro. Se mantiene la mitigación anterior.

2026-10-13: seguimiento de la decisión de mantener la mitigación tras consultar las actualizaciones anteriores. Ambas auditorías se repiten: producción sin avisos (salida 0); auditoría completa con únicamente GHSA-vfj7-8cjw-p6xm, severidad alta y sin versión corregida (salida 1). No se modifican dependencias ni se oculta el resultado. La excepción sigue abierta.
