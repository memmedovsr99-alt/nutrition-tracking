-- ============================================================
--  Menti (Mentimeter-style live Q&A) — one-time table setup
--  Run this ONCE in Supabase → SQL Editor → New query → Run.
--  Safe to re-run: uses IF NOT EXISTS everywhere.
-- ============================================================

-- 1) POLLS (a "presentation" / session that holds questions) --------------
create table if not exists public.menti_polls (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  join_code          text unique,
  access_mode        text not null default 'code',   -- 'code' | 'link' | 'qr'
  active_question_id uuid,                            -- which question is LIVE right now
  is_open            boolean not null default true,   -- accepting answers?
  created_at         timestamptz not null default now()
);

-- 2) QUESTIONS (one poll has many) ----------------------------------------
create table if not exists public.menti_questions (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.menti_polls(id) on delete cascade,
  type        text not null,                 -- 'multiple_choice' | 'open_text' | 'scale' | 'word_cloud' | 'ranking'
  prompt      text not null default '',
  options     jsonb not null default '[]',   -- choices for multiple_choice / ranking
  scale_min   int not null default 1,
  scale_max   int not null default 5,
  max_words   int not null default 1,        -- word_cloud: words allowed per student
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists menti_questions_poll_idx on public.menti_questions(poll_id);

-- 3) RESPONSES (who answered what — kept forever) -------------------------
create table if not exists public.menti_responses (
  id           uuid primary key default gen_random_uuid(),
  poll_id      uuid not null references public.menti_polls(id) on delete cascade,
  question_id  uuid not null references public.menti_questions(id) on delete cascade,
  student_name text not null default '',
  student_id   text not null default '',
  answer       jsonb not null default '{}',  -- shape depends on question type (see app)
  created_at   timestamptz not null default now(),
  -- one row per student per question; resubmitting UPDATES their answer
  unique (question_id, student_id)
);
create index if not exists menti_responses_question_idx on public.menti_responses(question_id);
create index if not exists menti_responses_poll_idx     on public.menti_responses(poll_id);

-- 4) Access for the public (anon) key used by the web pages ---------------
--    (Same pattern as the existing nutrition/finance tables: no RLS,
--     the anon publishable key can read/write these classroom tables.)
grant all on public.menti_polls     to anon, authenticated;
grant all on public.menti_questions to anon, authenticated;
grant all on public.menti_responses to anon, authenticated;

-- Done. You should see 3 new tables in Table Editor.
