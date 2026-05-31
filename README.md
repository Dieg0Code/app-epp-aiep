# Registro EPP — AIEP

PWA (instalable en celular y PC) para llevar el **control de EPP y asistencia** en los
talleres del AIEP. El docente pasa lista, marca el checklist de EPP (zapato de seguridad,
lentes, etc.) de cada estudiante y la app determina si **puede ingresar al taller**. Todo
queda guardado en la nube (respaldo ante fiscalización) y exportable a **PDF**.

## Stack
- **Frontend:** React + Vite + TypeScript + Tailwind, instalable como **PWA**.
- **Backend:** **Supabase** (Postgres + Auth + Row Level Security).
- **PDF:** jsPDF + autotable (acta de asistencia + checklist EPP).

## Funcionalidades
- Login / registro de docentes (rol `docente` o `coordinador`).
- Crear talleres con su **checklist de EPP configurable** (items obligatorios/opcionales).
- Cargar estudiantes (carga masiva: un nombre por línea, RUT opcional).
- Crear clases por fecha y **pasar lista**: presente + checklist EPP por estudiante.
- Cálculo automático de **"puede ingresar"** (presente + todos los EPP obligatorios ✓).
- Auto-guardado en la nube y **export a PDF** del acta de la clase.

---

## Puesta en marcha

> El backend **ya está aprovisionado** en el proyecto Supabase `epp-aiep`
> (ref `zisjoixnhmnfqabsdgzs`). El esquema está aplicado y `.env.local` ya tiene
> las credenciales. Para correrlo basta el paso 2.

### 1. (Solo si recreas el backend) Supabase vía CLI
```bash
supabase link --project-ref <ref>   # vincula el proyecto
supabase db push                     # aplica supabase/migrations/*.sql
supabase config push                 # aplica auth (enable_confirmations=false, etc.)
```
El esquema (tablas + RLS + triggers) vive en
[`supabase/migrations/`](supabase/migrations). Las credenciales del cliente van en
`.env.local` (plantilla en `.env.example`).

### 2. Correr en local
```bash
npm install      # si no lo hiciste aún
npm run dev      # http://localhost:5173
```

### 4. Build de producción
```bash
npm run build    # genera /dist (PWA lista para desplegar)
npm run preview  # previsualiza el build
```

Para desplegar gratis: **Vercel** o **Netlify** (importar el repo y definir las dos
variables `VITE_*`). Al ser PWA, desde el celular se puede "Agregar a pantalla de inicio".

---

## Roles
- **docente:** ve y administra solo sus propios talleres.
- **coordinador:** ve todos los talleres (para compartir/respaldar las actas).

Por defecto toda cuenta nueva nace como `docente`. Para convertir a alguien en
coordinador, cambia su fila en la tabla `profiles` (`rol = 'coordinador'`) desde el
panel de Supabase.

## Estructura
```
src/
  lib/        supabase.ts · types.ts · pdf.ts
  context/    AuthContext.tsx
  components/ Layout.tsx · ui.tsx
  pages/      Login · Dashboard · TallerDetalle · PasarLista
supabase/
  config.toml      configuración del proyecto (CLI)
  migrations/      esquema + RLS + triggers (versionado)
```
