-- Rode no SQL Editor do Supabase DEPOIS de criar o usuário administrador.
-- Antes de rodar, substitua COLOQUE_O_UUID_DO_ADMIN pelo UUID real
-- (Authentication → Users → copiar UUID). Se não substituir, o casting falha
-- de propósito: melhor falhar fechado do que liberar o painel para qualquer conta.
-- NUNCA use service_role no navegador: a proteção é esta RLS.

create table if not exists public.ideias (
  id uuid primary key default gen_random_uuid(),
  nome text not null default '' check (char_length(nome) <= 80),
  mensagem text not null check (char_length(mensagem) between 10 and 2000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint ideias_atualizado_em_check check (atualizado_em >= criado_em)
);

create index if not exists ideias_criado_em_id_idx
  on public.ideias (criado_em desc, id desc);

-- Datas sempre vêm do servidor, nunca do relógio do navegador.
create or replace function public.nexus_ideias_timestamps()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.criado_em := now();
    new.atualizado_em := now();
  else
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

grant execute on function public.nexus_ideias_timestamps() to anon, authenticated;

drop trigger if exists nexus_ideias_timestamps on public.ideias;
create trigger nexus_ideias_timestamps
  before insert or update on public.ideias
  for each row execute function public.nexus_ideias_timestamps();

alter table public.ideias enable row level security;

-- Defesa em profundidade: a proteção real é o RLS abaixo.
grant usage on schema public to anon, authenticated;
revoke all on public.ideias from anon, authenticated;
grant insert on public.ideias to anon;
grant select, update, delete on public.ideias to authenticated;

-- Visitantes podem enviar, mas não podem ler nada.
drop policy if exists "anon_insert_ideias" on public.ideias;
create policy "anon_insert_ideias" on public.ideias
  for insert to anon
  with check (char_length(nome) <= 80 and char_length(mensagem) between 10 and 2000);

-- SOMENTE a conta do administrador lê, edita e exclui.
-- Mesmo que outra conta seja criada, ela não acessa nada.
drop policy if exists "admin_select_ideias" on public.ideias;
create policy "admin_select_ideias" on public.ideias
  for select to authenticated
  using (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);

drop policy if exists "admin_update_ideias" on public.ideias;
create policy "admin_update_ideias" on public.ideias
  for update to authenticated
  using (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid)
  with check (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);

drop policy if exists "admin_delete_ideias" on public.ideias;
create policy "admin_delete_ideias" on public.ideias
  for delete to authenticated
  using (auth.uid() = 'COLOQUE_O_UUID_DO_ADMIN'::uuid);
