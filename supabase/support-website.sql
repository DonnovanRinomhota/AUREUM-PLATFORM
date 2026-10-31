-- =====================================================================
-- support-website.sql — lets visitors of the public website (www.aureumpos.com/support) send support tickets
-- to the AUREUM team and follow the replies, WITHOUT having an account.
-- Run once in the Supabase SQL Editor, AFTER support-schema.sql. Safe to run again.
--
-- ORDER (important): 1) deploy the updated admin-manage function  2) run this file.
--   (The updated function copes with tickets that have no business. If this file is run first, the control panel's
--    Support list would briefly show "(deleted business)" for every ticket's business name.)
--
-- How it is protected
--   * Visitors cannot read or write the tables directly (RLS stays on, no policy matches them).
--   * They can only call the three functions below. Each ticket gets a private random key (web_token) that is
--     shown to nobody but the visitor's own browser; without it nobody can read or answer that ticket.
--   * Rate limits: 3 tickets per email per hour, 60 website tickets per hour in total, 20 replies per ticket per hour.
--   * A hidden "honeypot" form field makes simple spam bots look successful without storing anything.
--   * Internal notes and the assistant chat attached to the ticket are never returned to the visitor.
-- =====================================================================

-- tickets that come from the website belong to no business
alter table public.support_tickets         alter column business_id drop not null;
alter table public.support_ticket_messages alter column business_id drop not null;

alter table public.support_tickets add column if not exists source           text not null default 'app';
alter table public.support_tickets add column if not exists contact_name     text;
alter table public.support_tickets add column if not exists contact_email    text;
alter table public.support_tickets add column if not exists contact_phone    text;
alter table public.support_tickets add column if not exists contact_business text;
alter table public.support_tickets add column if not exists web_token        uuid;

alter table public.support_tickets drop constraint if exists support_tickets_source_chk;
alter table public.support_tickets add  constraint support_tickets_source_chk check (source in ('app', 'website'));
alter table public.support_tickets drop constraint if exists support_tickets_owner_chk;
alter table public.support_tickets add  constraint support_tickets_owner_chk  check (business_id is not null or source = 'website');

create index if not exists support_tickets_web_idx on public.support_tickets (source, created_at desc) where source = 'website';

-- ---------- create a ticket ----------
create or replace function public.support_web_create_ticket(
  p_name text, p_email text, p_phone text, p_business text, p_subject text, p_category text, p_body text,
  p_transcript text default null, p_website text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  nm   text := btrim(coalesce(p_name, ''));
  em   text := lower(btrim(coalesce(p_email, '')));
  subj text := btrim(coalesce(p_subject, ''));
  body text := btrim(coalesce(p_body, ''));
  tid  uuid;
  tok  uuid := gen_random_uuid();
begin
  -- honeypot: real visitors never fill this in. Pretend it worked, store nothing.
  if btrim(coalesce(p_website, '')) <> '' then return jsonb_build_object('id', gen_random_uuid(), 'token', gen_random_uuid()); end if;
  if char_length(nm) < 2 or char_length(nm) > 80 then raise exception 'Please enter your name.' using errcode = 'P0001'; end if;
  if em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' or char_length(em) > 120 then raise exception 'Please enter a valid email address so we can reply.' using errcode = 'P0001'; end if;
  if char_length(subj) < 3 then raise exception 'Please give your ticket a short subject (at least 3 characters).' using errcode = 'P0001'; end if;
  if char_length(subj) > 140 then raise exception 'The subject is too long (140 characters at most).' using errcode = 'P0001'; end if;
  if char_length(body) < 5 then raise exception 'Please describe what you need (at least a few words).' using errcode = 'P0001'; end if;
  if char_length(body) > 6000 then raise exception 'The message is too long (6,000 characters at most).' using errcode = 'P0001'; end if;
  if (select count(*) from public.support_tickets where source = 'website' and contact_email = em and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'RATE_LIMIT: you have sent several tickets in the last hour. Please wait a little, or reply inside an existing ticket under My tickets.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.support_tickets where source = 'website' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'RATE_LIMIT: we are receiving a lot of tickets right now. Please try again in a little while, or email us.' using errcode = 'P0001';
  end if;
  insert into public.support_tickets (business_id, created_by, created_by_email, subject, category, priority, page_context, source, contact_name, contact_email, contact_phone, contact_business, web_token)
  values (null, null, em, subj,
          case when p_category in ('billing','problem','question','feature','account') then p_category else 'question' end,
          'normal', 'Website support', 'website', nm, em, nullif(left(btrim(coalesce(p_phone, '')), 40), ''), nullif(left(btrim(coalesce(p_business, '')), 100), ''), tok)
  returning id into tid;
  insert into public.support_ticket_messages (ticket_id, business_id, author_type, author_email, author_name, body)
  values (tid, null, 'customer', em, nm, body);
  if p_transcript is not null and char_length(btrim(p_transcript)) > 0 then
    insert into public.support_ticket_messages (ticket_id, business_id, author_type, body)
    values (tid, null, 'bot', 'Chat with AUREUM Bot on the website before this ticket:' || E'\n\n' || left(p_transcript, 11000));
  end if;
  return jsonb_build_object('id', tid, 'token', tok);
end;
$$;

-- ---------- read one ticket (needs its id AND its private key) ----------
create or replace function public.support_web_get_ticket(p_id uuid, p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.support_tickets;
begin
  select * into t from public.support_tickets where id = p_id and source = 'website' and web_token is not null and web_token = p_token;
  if not found then raise exception 'Ticket not found.' using errcode = 'P0001'; end if;
  return jsonb_build_object(
    'ticket', jsonb_build_object('id', t.id, 'subject', t.subject, 'category', t.category, 'status', t.status, 'created_at', t.created_at, 'last_message_at', t.last_message_at, 'last_admin_reply_at', t.last_admin_reply_at),
    'messages', coalesce((select jsonb_agg(jsonb_build_object('author_type', m.author_type, 'body', m.body, 'created_at', m.created_at) order by m.created_at)
                            from public.support_ticket_messages m
                           where m.ticket_id = t.id and m.internal = false and m.author_type in ('customer', 'admin')), '[]'::jsonb));
end;
$$;

-- ---------- reply on your own ticket (a reply to a solved/closed ticket reopens it) ----------
create or replace function public.support_web_add_message(p_id uuid, p_token uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare t public.support_tickets; body text := btrim(coalesce(p_body, ''));
begin
  if char_length(body) < 1 then raise exception 'Type a message first.' using errcode = 'P0001'; end if;
  if char_length(body) > 6000 then raise exception 'The message is too long (6,000 characters at most).' using errcode = 'P0001'; end if;
  select * into t from public.support_tickets where id = p_id and source = 'website' and web_token is not null and web_token = p_token;
  if not found then raise exception 'Ticket not found.' using errcode = 'P0001'; end if;
  if (select count(*) from public.support_ticket_messages where ticket_id = t.id and author_type = 'customer' and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'RATE_LIMIT: too many messages in the last hour. Please wait a little.' using errcode = 'P0001';
  end if;
  insert into public.support_ticket_messages (ticket_id, business_id, author_type, author_email, author_name, body)
  values (t.id, null, 'customer', t.contact_email, t.contact_name, body);
  update public.support_tickets
     set status = case when status in ('resolved','closed','pending') then 'open' else status end,
         closed_at = null, updated_at = now(), last_message_at = now()
   where id = t.id;
end;
$$;

revoke all on function public.support_web_create_ticket(text, text, text, text, text, text, text, text, text) from public;
revoke all on function public.support_web_get_ticket(uuid, uuid) from public;
revoke all on function public.support_web_add_message(uuid, uuid, text) from public;
grant execute on function public.support_web_create_ticket(text, text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.support_web_get_ticket(uuid, uuid) to anon, authenticated;
grant execute on function public.support_web_add_message(uuid, uuid, text) to anon, authenticated;

-- To undo: drop the three functions above (drop function public.support_web_create_ticket(text,text,text,text,text,text,text,text,text); ...).
-- The new columns and the nullable business_id are harmless to leave in place.
