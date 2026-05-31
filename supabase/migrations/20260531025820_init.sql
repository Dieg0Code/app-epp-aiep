-- =====================================================================
--  Registro EPP — AIEP   |   Esquema de base de datos (Supabase / Postgres)
-- ---------------------------------------------------------------------
--  Ejecutar en: Supabase Dashboard -> SQL Editor -> New query -> Run
--  Es idempotente en lo posible (usa IF NOT EXISTS / OR REPLACE).
-- =====================================================================

-- ---------- Perfiles (extiende auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nombre     text not null,
  rol        text not null default 'docente' check (rol in ('docente', 'coordinador')),
  created_at timestamptz not null default now()
);

-- ---------- Talleres ----------
create table if not exists public.talleres (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  sede        text,
  docente_id  uuid not null references public.profiles (id) on delete cascade,
  -- Checklist EPP configurable por taller. Cada item: { clave, etiqueta, obligatorio }
  epp_items   jsonb not null default '[
    {"clave":"zapato_seguridad","etiqueta":"Zapato de seguridad","obligatorio":true},
    {"clave":"lentes","etiqueta":"Lentes de seguridad","obligatorio":false},
    {"clave":"guantes","etiqueta":"Guantes","obligatorio":false},
    {"clave":"casco","etiqueta":"Casco","obligatorio":false}
  ]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ---------- Estudiantes (inscritos a un taller) ----------
create table if not exists public.estudiantes (
  id         uuid primary key default gen_random_uuid(),
  taller_id  uuid not null references public.talleres (id) on delete cascade,
  nombre     text not null,
  rut        text,
  created_at timestamptz not null default now()
);

-- ---------- Clases (una sesión con fecha) ----------
create table if not exists public.clases (
  id         uuid primary key default gen_random_uuid(),
  taller_id  uuid not null references public.talleres (id) on delete cascade,
  fecha      date not null default current_date,
  tema       text,
  docente_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------- Registros (asistencia + EPP por estudiante por clase) ----------
create table if not exists public.registros (
  id                 uuid primary key default gen_random_uuid(),
  clase_id           uuid not null references public.clases (id) on delete cascade,
  estudiante_id      uuid not null references public.estudiantes (id) on delete cascade,
  presente           boolean not null default false,
  -- Estado del checklist EPP: { "zapato_seguridad": true, "lentes": false, ... }
  epp                jsonb not null default '{}'::jsonb,
  autorizado_ingreso boolean not null default false,
  observacion        text,
  registrado_at      timestamptz not null default now(),
  unique (clase_id, estudiante_id)
);

create index if not exists idx_estudiantes_taller on public.estudiantes (taller_id);
create index if not exists idx_clases_taller       on public.clases (taller_id);
create index if not exists idx_registros_clase     on public.registros (clase_id);

-- =====================================================================
--  Funciones de ayuda (SECURITY DEFINER => evitan recursión de RLS)
-- =====================================================================
create or replace function public.is_coordinador()
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol = 'coordinador');
$$;

create or replace function public.can_access_taller(t uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.talleres
    where id = t and (docente_id = auth.uid() or public.is_coordinador())
  );
$$;

create or replace function public.can_access_clase(c uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.clases cl
    where cl.id = c and public.can_access_taller(cl.taller_id)
  );
$$;

-- =====================================================================
--  Trigger: crear profile automáticamente al registrarse
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'rol', 'docente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  Row Level Security
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.talleres    enable row level security;
alter table public.estudiantes enable row level security;
alter table public.clases      enable row level security;
alter table public.registros   enable row level security;

-- ----- profiles -----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_coordinador());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ----- talleres -----
drop policy if exists talleres_select on public.talleres;
create policy talleres_select on public.talleres for select
  using (docente_id = auth.uid() or public.is_coordinador());

drop policy if exists talleres_insert on public.talleres;
create policy talleres_insert on public.talleres for insert
  with check (docente_id = auth.uid());

drop policy if exists talleres_modify on public.talleres;
create policy talleres_modify on public.talleres for update
  using (docente_id = auth.uid() or public.is_coordinador());

drop policy if exists talleres_delete on public.talleres;
create policy talleres_delete on public.talleres for delete
  using (docente_id = auth.uid() or public.is_coordinador());

-- ----- estudiantes -----
drop policy if exists estudiantes_all on public.estudiantes;
create policy estudiantes_all on public.estudiantes for all
  using (public.can_access_taller(taller_id))
  with check (public.can_access_taller(taller_id));

-- ----- clases -----
drop policy if exists clases_all on public.clases;
create policy clases_all on public.clases for all
  using (public.can_access_taller(taller_id))
  with check (public.can_access_taller(taller_id));

-- ----- registros -----
drop policy if exists registros_all on public.registros;
create policy registros_all on public.registros for all
  using (public.can_access_clase(clase_id))
  with check (public.can_access_clase(clase_id));
