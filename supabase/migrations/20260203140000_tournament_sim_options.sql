-- Demand curve + ghost AI policy for the whole tournament (shared by all teams)
alter table public.tournaments
  add column if not exists demand_profile text not null default 'classic';

alter table public.tournaments
  add column if not exists ai_style text not null default 'standard';

comment on column public.tournaments.demand_profile is 'Customer demand pattern id (e.g. classic, seasonal) — see demandCurve.js';
comment on column public.tournaments.ai_style is 'Ghost AI ordering policy id — see ghostPlayer.js';
