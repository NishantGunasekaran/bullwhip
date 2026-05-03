-- Optional nickname shown in tournament UI (creator-editable; auto-filled for all-AI teams)
alter table public.sessions
  add column if not exists team_label text;

comment on column public.sessions.team_label is 'Display name for tournament team (optional)';
