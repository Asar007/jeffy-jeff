-- ============================================================
-- Communication Triggers Migration
-- ============================================================

-- 1. Trigger for New Requests (Request Submitted)
create or replace function public.fn_on_request_insert()
returns trigger language plpgsql as $$
begin
  if new.customer_email is not null then
    insert into public.notification_queue (event_name, recipient_email, payload)
    values (
      'billing.request_submitted', -- Matches the Resend event name I'll use/create
      new.customer_email,
      jsonb_build_object(
        'FIRST_NAME', coalesce(new.client_name, 'Valued Client'),
        'SERVICE_TYPE', 'Custom Service',
        'REQUEST_TITLE', coalesce(new.description, 'New Service Request'),
        'DETAILS', new.description,
        'DASHBOARD_URL', 'https://nribridgeindia.com/dashboard.html?tab=requests'
      )
    );
  end if;
  return new;
end;
$$;

create trigger tr_request_insert
after insert on public.requests
for each row execute function public.fn_on_request_insert();

-- 2. Trigger for New Disputes (Dispute Raised)
create or replace function public.fn_on_dispute_insert()
returns trigger language plpgsql as $$
begin
  if new.client_email is not null then
    insert into public.notification_queue (event_name, recipient_email, payload)
    values (
      'billing.dispute_raised',
      new.client_email,
      jsonb_build_object(
        'FIRST_NAME', coalesce(new.client_name, 'Valued Client'),
        'CASE_ID', new.id::text,
        'PROPERTY_NAME', coalesce(new.service_label, 'Your Property'),
        'DISPUTE_REASON', coalesce(new.title, new.description),
        'DISPUTE_URL', 'https://nribridgeindia.com/dashboard.html?tab=disputes'
      )
    );
  end if;
  return new;
end;
$$;

create trigger tr_dispute_insert
after insert on public.disputes
for each row execute function public.fn_on_dispute_insert();

-- 3. Trigger for Document Acceptance (Document Accepted)
create or replace function public.fn_on_document_update()
returns trigger language plpgsql as $$
declare
  v_client_name text;
begin
  -- Fire only when status changes to 'verified'
  if new.status = 'verified' and old.status != 'verified' then
    -- Try to find client name
    select name into v_client_name from public.clients where email = new.client_email limit 1;

    insert into public.notification_queue (event_name, recipient_email, payload)
    values (
      'billing.document_accepted',
      new.client_email,
      jsonb_build_object(
        'FIRST_NAME', coalesce(v_client_name, 'Valued Client'),
        'DOC_TITLE', new.doc_name,
        'SERVICE_TYPE', coalesce(new.service_type, 'Service Request'),
        'DASHBOARD_URL', 'https://nribridgeindia.com/dashboard.html?tab=documents'
      )
    );
  end if;
  return new;
end;
$$;

create trigger tr_document_update
after update on public.documents
for each row execute function public.fn_on_document_update();

-- 4. Unified Status Update Trigger (Generic)
create or replace function public.fn_on_status_change()
returns trigger language plpgsql as $$
declare
  v_client_email text;
  v_client_name  text;
  v_event_name   text;
  v_payload      jsonb;
begin
  -- Only fire if status actually changed
  if new.status = old.status then return new; end if;

  -- Determine context based on table
  if TG_TABLE_NAME = 'tasks' then
    select email, name into v_client_email, v_client_name from public.clients where id = new.client_id;
    v_event_name := 'billing.task_update';
    v_payload := jsonb_build_object(
      'FIRST_NAME', v_client_name,
      'REQUEST_TITLE', new.service,
      'NEW_STATUS', new.status,
      'UPDATE_MESSAGE', 'A task associated with your service has been updated.',
      'DASHBOARD_URL', 'https://nribridgeindia.com/dashboard.html?tab=tasks'
    );
  elsif TG_TABLE_NAME = 'disputes' then
    v_client_email := new.client_email;
    v_client_name := new.client_name;
    v_event_name := 'billing.dispute_status_update';
    v_payload := jsonb_build_object(
      'FIRST_NAME', v_client_name,
      'CASE_ID', new.id::text,
      'NEW_STATUS', new.status,
      'UPDATE_MESSAGE', 'Your dispute case status has been updated.',
      'DISPUTE_URL', 'https://nribridgeindia.com/dashboard.html?tab=disputes'
    );
  elsif TG_TABLE_NAME = 'requests' then
    v_client_email := new.customer_email;
    v_client_name := new.client_name;
    v_event_name := 'billing.request_status_update';
    v_payload := jsonb_build_object(
      'FIRST_NAME', v_client_name,
      'REQUEST_TITLE', new.description,
      'NEW_STATUS', new.status,
      'UPDATE_MESSAGE', 'Your service request is progressing to the next stage.',
      'DASHBOARD_URL', 'https://nribridgeindia.com/dashboard.html?tab=requests'
    );
  end if;

  if v_client_email is not null then
    insert into public.notification_queue (event_name, recipient_email, payload)
    values (v_event_name, v_client_email, v_payload);
  end if;

  return new;
end;
$$;

create trigger tr_task_status_update after update on public.tasks for each row execute function public.fn_on_status_change();
create trigger tr_dispute_status_update after update on public.disputes for each row execute function public.fn_on_status_change();
create trigger tr_request_status_update after update on public.requests for each row execute function public.fn_on_status_change();

-- 5. Cron Job to process the queue every minute
-- Note: This requires the PROJECT_REF and SERVICE_ROLE_KEY to be accessible or for the function to be public.
-- Since I can't easily set ENV vars in SQL for a fetch call without pg_net, 
-- I'll rely on a simpler approach: the cron will call an RPC that performs the HTTP call if possible, 
-- or we tell the user they need to set up an external ping/webhook.
--
-- BUT! Supabase Edge Functions can be triggered by internal system events if configured.
-- For now, I'll add the pg_cron entry that calls a local function that could potentially 
-- trigger the edge function via an HTTP extension if available.
-- If not, the queue will stay 'pending' until the user manually triggers the processor.

create or replace function public.fn_trigger_notification_processor()
returns void language plpgsql as $$
begin
  -- This is a placeholder. In a real Supabase environment, you would use pg_net 
  -- or a Database Webhook on the notification_queue table.
  -- For now, it just logs intent.
  raise notice 'Notification processor triggered';
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'process-notifications',
      '* * * * *',
      'select public.fn_trigger_notification_processor();'
    );
  end if;
end;
$$;
