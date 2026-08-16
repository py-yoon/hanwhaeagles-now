-- Supabase SQL Editor에서 한 번 실행하세요. (기존 프로젝트에 테이블만 추가)
-- 댓글은 auth.uid()에 귀속되며, 익명 로그인도 하나의 사용자로 취급됩니다.

create table if not exists public.hanwhaeagles_comments (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '익명' check (char_length(nickname) between 1 and 24),
  body text not null check (char_length(body) between 1 and 800),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists hanwhaeagles_comments_created_at_idx
  on public.hanwhaeagles_comments (created_at desc);

alter table public.hanwhaeagles_comments enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.hanwhaeagles_comments to anon;
grant select, insert, delete on public.hanwhaeagles_comments to authenticated;

drop policy if exists "누구나 댓글을 읽을 수 있음" on public.hanwhaeagles_comments;
create policy "누구나 댓글을 읽을 수 있음"
  on public.hanwhaeagles_comments for select
  using (true);

drop policy if exists "로그인한 사용자만 댓글을 쓸 수 있음" on public.hanwhaeagles_comments;
create policy "로그인한 사용자만 댓글을 쓸 수 있음"
  on public.hanwhaeagles_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "자기 댓글만 지울 수 있음" on public.hanwhaeagles_comments;
create policy "자기 댓글만 지울 수 있음"
  on public.hanwhaeagles_comments for delete
  to authenticated
  using (auth.uid() = user_id);

-- 스팸 방지: 같은 사용자(익명 세션 포함)가 20초 안에 연속으로 댓글을 남기지 못하게 막습니다.
create or replace function public.enforce_hanwhaeagles_comment_rate_limit()
returns trigger as $$
begin
  if exists (
    select 1 from public.hanwhaeagles_comments
    where user_id = new.user_id
      and created_at > now() - interval '20 seconds'
  ) then
    raise exception 'rate_limited: 댓글은 20초에 한 번만 남길 수 있습니다.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists hanwhaeagles_comments_rate_limit on public.hanwhaeagles_comments;
create trigger hanwhaeagles_comments_rate_limit
  before insert on public.hanwhaeagles_comments
  for each row execute function public.enforce_hanwhaeagles_comment_rate_limit();

-- 선수단 페이지 하트(응원). 같은 사용자(익명 세션 포함)는 선수단 전체를 통틀어 하루
-- 한 번만 하트를 줄 수 있도록 (user_id, like_date) 유니크 제약으로 막습니다 — 트리거로
-- 시간 간격을 재는 게 아니라 DB가 자체적으로 중복 삽입을 거부하는 방식이라 동시 클릭에도
-- 안전합니다. like_date는 KST 기준 날짜(자정에 초기화)입니다.
create table if not exists public.hanwhaeagles_player_likes (
  id uuid primary key default gen_random_uuid(),
  player_id text not null check (char_length(player_id) between 1 and 80),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  like_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now(),
  unique (user_id, like_date)
);

create index if not exists hanwhaeagles_player_likes_player_id_idx
  on public.hanwhaeagles_player_likes (player_id);

alter table public.hanwhaeagles_player_likes enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.hanwhaeagles_player_likes to anon;
grant select, insert on public.hanwhaeagles_player_likes to authenticated;

drop policy if exists "누구나 하트 개수를 읽을 수 있음" on public.hanwhaeagles_player_likes;
create policy "누구나 하트 개수를 읽을 수 있음"
  on public.hanwhaeagles_player_likes for select
  using (true);

drop policy if exists "로그인한 사용자만 하트를 남길 수 있음" on public.hanwhaeagles_player_likes;
create policy "로그인한 사용자만 하트를 남길 수 있음"
  on public.hanwhaeagles_player_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============================================================================
-- 마이그레이션: 하트 제약을 "선수 1명당 하루 1번"에서 "선수단 전체 통틀어 하루 1번"으로
-- 좁힙니다. 위 create table 블록을 이미 실행해서 테이블이 있는 경우에만 이 아래를
-- 추가로 실행하세요 (새 프로젝트라면 위 블록이 이미 새 제약으로 만들어서 필요 없습니다).
-- ============================================================================

-- 제약을 좁히기 전에, 테스트 등으로 이미 같은 사용자가 같은 날 서로 다른 선수에게
-- 하트를 남긴 행이 있다면 가장 먼저 남긴 것만 남기고 나머지는 지웁니다 — 안 지우면
-- 아래 유니크 제약 추가가 기존 데이터와 충돌해서 실패합니다.
delete from public.hanwhaeagles_player_likes a
using public.hanwhaeagles_player_likes b
where a.user_id = b.user_id
  and a.like_date = b.like_date
  and a.created_at > b.created_at;

alter table public.hanwhaeagles_player_likes
  drop constraint if exists hanwhaeagles_player_likes_player_id_user_id_like_date_key;

alter table public.hanwhaeagles_player_likes
  add constraint hanwhaeagles_player_likes_user_id_like_date_key unique (user_id, like_date);
