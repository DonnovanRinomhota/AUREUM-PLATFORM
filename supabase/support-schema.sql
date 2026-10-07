-- =====================================================================
-- support-schema.sql — support tickets + help-assistant usage limits.
-- Run once in the Supabase SQL Editor, AFTER schema.sql (it uses current_business_id()). Safe to run again.
--
-- How it is protected
--   * A business can READ only its own tickets and the messages meant for it. Internal notes written by the
--     AUREUM team are never visible to customers.
--   * Customers cannot write to these tables directly. They create a ticket, add a message, mark it solved
--     or mark it seen ONLY through the functions below, which check who they are, validate the text and
--     rate-limit (so nobody can flood support or pretend to be the support team).
--   * The AUREUM team reads and answers tickets through the control panel (admin-manage function, which
--     uses the service role). No customer can reach that.
-- =====================================================================

-- ---------- daily limit for the help assistant (it costs money per question) ----------
create table if not exists public.help_usage (
  user_id     uuid not null,
  business_id uuid not null,
  day         date not null default ((now() at time zone 'utc')::date),
  count       integer not null default 0,
  primary key (user_id, day)
);
alter table public.help_usage enable row level security;     -- no policies: only the server (service role) uses it

-- ---------- tickets ----------
create table if not exists public.support_tickets (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  created_by         uuid references auth.users(id) on delete set null,
  created_by_email   text,
  subject            text not null check (char_length(subject) between 3 and 140),
  category           text not null default 'question' check (category in ('billing','problem','question','feature','account')),
  priority           text not null default 'normal'   check (priority in ('low','normal','high','urgent')),
  status             text not null default 'open'     check (status in ('open','pending','resolved','closed')),
  assigned_to        text,
  page_context       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  last_message_at    timestamptz not null default now(),
  last_admin_reply_at timestamptz,
  customer_seen_at   timestamptz,
  closed_at          timestamptz
);
create index if not exists support_tickets_business_idx on public.support_tickets (business_id, last_message_at desc);
create index if not exists support_tickets_status_idx   on public.support_tickets (status, priority, last_message_at desc);

create table if not exists public.support_ticket_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets(id) on delete cascade,
  business_id  uuid not null references public.businesses(id) on delete cascade,
  author_type  text not null check (author_type in ('customer','admin','bot')),
  author_email text,
  author_name  text,
  internal     boolean not null default false,
  body         text not null check (char_length(body) between 1 and 12000),
  created_at   timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists "business reads its own tickets" on public.support_tickets;
create policy "business reads its own tickets" on public.support_tickets
  for select using (business_id = public.current_business_id());

drop policy if exists "business reads its own ticket messages" on public.support_ticket_messages;
create policy "business reads its own ticket messages" on public.support_ticket_messages
  for select using (business_id = public.current_business_id() and internal = false);

-- no insert / update / delete policies = customers cannot write directly; belt and braces:
revoke insert, update, delete on public.support_tickets from anon, authenticated;
revoke insert, update, delete on public.support_ticket_messages from anon, authenticated;
revoke all on public.help_usage from anon, authenticated;

-- ---------- the only ways a customer changes anything ----------

-- create a ticket (and optionally attach the chat they had with the assistant)
create or replace function public.support_create_ticket(
  p_subject text, p_category text, p_priority text, p_body text,
  p_page text default null, p_transcript text default null
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  bid uuid := public.current_business_id();
  email text;
  tid uuid;
  subj text := btrim(coalesce(p_subject, ''));
  body text := btrim(coalesce(p_body, ''));
begin
  if uid is null or bid is null then raise exception 'Please sign in first.' using errcode = 'P0001'; end if;
  if char_length(subj) < 3 then raise exception 'Please give your ticket a short subject (at least 3 characters).' using errcode = 'P0001'; end if;
  if char_length(subj) > 140 then raise exception 'The subject is too long (140 characters at most).' using errcode = 'P0001'; end if;
  if char_length(body) < 5 then raise exception 'Please describe what happened (at least a few words).' using errcode = 'P0001'; end if;
  if char_length(body) > 8000 then raise exception 'The message is too long (8,000 characters at most).' using errcode = 'P0001'; end if;
  if (select count(*) from public.support_tickets where business_id = bid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'RATE_LIMIT: you have sent several tickets in the last hour. Please wait a little, or reply inside an existing ticket.' using errcode = 'P0001';
  end if;
  select u.email into email from auth.users u where u.id = uid;
  insert into public.support_tickets (business_id, created_by, created_by_email, subject, category, priority, page_context)
  values (bid, uid, email, subj,
          case when p_category in ('billing','problem','question','feature','account') then p_category else 'question' end,
          case when p_priority in ('low','normal','high','urgent') then p_priority else 'normal' end,
          left(coalesce(p_page, ''), 80))
  returning id into tid;
  insert into public.support_ticket_messages (ticket_id, business_id, author_type, author_email, body)
  values (tid, bid, 'customer', email, body);
  if p_transcript is not null and char_length(btrim(p_transcript)) > 0 then
    insert into public.support_ticket_messages (ticket_id, business_id, author_type, body)
    values (tid, bid, 'bot', 'Chat with the help assistant before this ticket:' || E'\n\n' || left(p_transcript, 11000));
  end if;
  return tid;
end;
$$;

-- reply on one of your own tickets (a reply to a solved/closed ticket reopens it)
create or replace function public.support_add_message(p_ticket_id uuid, p_body text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
  bid uuid := public.current_business_id();
  email text;
  body text := btrim(coalesce(p_body, ''));
begin
  if uid is null or bid is null then raise exception 'Please sign in first.' using errcode = 'P0001'; end if;
  if char_length(body) < 1 then raise exception 'Type a message first.' using errcode = 'P0001'; end if;
  if char_length(body) > 8000 then raise exception 'The message is too long (8,000 characters at most).' using errcode = 'P0001'; end if;
  perform 1 from public.support_tickets where id = p_ticket_id and business_id = bid;
  if not found then raise exception 'Ticket not found.' using errcode = 'P0001'; end if;
  if (select count(*) from public.support_ticket_messages where business_id = bid and author_type = 'customer' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'RATE_LIMIT: too many messages in the last hour. Please wait a little.' using errcode = 'P0001';
  end if;
  select u.email into email from auth.users u where u.id = uid;
  insert into public.support_ticket_messages (ticket_id, business_id, author_type, author_email, body)
  values (p_ticket_id, bid, 'customer', email, body);
  update public.support_tickets
     set status = case when status in ('resolved','closed') then 'open' when status = 'pending' then 'open' else status end,
         closed_at = null, updated_at = now(), last_message_at = now(), customer_seen_at = now()
   where id = p_ticket_id and business_id = bid;
end;
$$;

-- "this is solved" (the customer closing their own ticket)
create or replace function public.support_close_ticket(p_ticket_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare bid uuid := public.current_business_id();
begin
  if auth.uid() is null or bid is null then raise exception 'Please sign in first.' using errcode = 'P0001'; end if;
  update public.support_tickets set status = 'resolved', closed_at = now(), updated_at = now()
   where id = p_ticket_id and business_id = bid and status in ('open','pending');
end;
$$;

-- remember that the customer has read the replies (clears the "new reply" dot)
create or replace function public.support_mark_seen(p_ticket_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare bid uuid := public.current_business_id();
begin
  if auth.uid() is null or bid is null then return; end if;
  update public.support_tickets set customer_seen_at = now()
   where business_id = bid and (p_ticket_id is null or id = p_ticket_id)
     and last_admin_reply_at is not null and (customer_seen_at is null or customer_seen_at < last_admin_reply_at);
end;
$$;

revoke all on function public.support_create_ticket(text, text, text, text, text, text) from public, anon;
revoke all on function public.support_add_message(uuid, text) from public, anon;
revoke all on function public.support_close_ticket(uuid) from public, anon;
revoke all on function public.support_mark_seen(uuid) from public, anon;
grant execute on function public.support_create_ticket(text, text, text, text, text, text) to authenticated;
grant execute on function public.support_add_message(uuid, text) to authenticated;
grant execute on function public.support_close_ticket(uuid) to authenticated;
grant execute on function public.support_mark_seen(uuid) to authenticated;
