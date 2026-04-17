-- ============================================================
-- Re-seed demo data into Supabase (real database records)
-- These are sample clients/tasks/requests for the admin dashboard
-- ============================================================

-- Only insert if demo clients don't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE email = 'rajan@example.com') THEN
    INSERT INTO public.clients (name, email, city, country, services, status) VALUES
      ('Rajan Mehta',   'rajan@example.com',   'Dubai',     'UAE', '{Property,Legal}',    'Active'),
      ('Priya Nair',    'priya@example.com',   'London',    'UK',  '{Tax Filing}',        'Pending'),
      ('Suresh Kumar',  'suresh@example.com',  'Toronto',   'CA',  '{Banking}',           'In Review'),
      ('Anita Sharma',  'anita@example.com',   'New York',  'US',  '{Property}',          'Done'),
      ('Vikram Iyer',   'vikram@example.com',  'Singapore', 'SG',  '{Aadhaar/OCI}',       'Pending');
  END IF;
END $$;

-- Insert tasks for demo clients
INSERT INTO public.tasks (client_id, service, status, progress, deadline, description)
SELECT c.id, 'Property Legal', 'In Progress', 60, (CURRENT_DATE + INTERVAL '10 days')::date, 'Property verification and PoA drafting'
FROM public.clients c WHERE c.email = 'rajan@example.com'
AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.client_id = c.id AND t.service = 'Property Legal');

INSERT INTO public.tasks (client_id, service, status, progress, deadline, description)
SELECT c.id, 'Tax Filing', 'Pending', 10, (CURRENT_DATE + INTERVAL '5 days')::date, 'ITR-2 filing for FY 2025-26'
FROM public.clients c WHERE c.email = 'priya@example.com'
AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.client_id = c.id AND t.service = 'Tax Filing');

INSERT INTO public.tasks (client_id, service, status, progress, deadline, description)
SELECT c.id, 'Bank Account', 'In Review', 75, (CURRENT_DATE + INTERVAL '14 days')::date, 'NRO account opening with SBI'
FROM public.clients c WHERE c.email = 'suresh@example.com'
AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.client_id = c.id AND t.service = 'Bank Account');

INSERT INTO public.tasks (client_id, service, status, progress, deadline, description)
SELECT c.id, 'Property Reg.', 'Completed', 100, (CURRENT_DATE + INTERVAL '1 day')::date, 'Sub-registrar registration completed'
FROM public.clients c WHERE c.email = 'anita@example.com'
AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.client_id = c.id AND t.service = 'Property Reg.');

INSERT INTO public.tasks (client_id, service, status, progress, deadline, description)
SELECT c.id, 'Aadhaar Update', 'Pending', 5, (CURRENT_DATE + INTERVAL '4 days')::date, 'Address update on Aadhaar via appointment'
FROM public.clients c WHERE c.email = 'vikram@example.com'
AND NOT EXISTS (SELECT 1 FROM public.tasks t WHERE t.client_id = c.id AND t.service = 'Aadhaar Update');

-- Insert demo requests (only if none exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.requests WHERE client_name = 'Deepak Pillai') THEN
    INSERT INTO public.requests (client_name, customer_email, amount, description, status, received_at) VALUES
      ('Deepak Pillai', 'deepak@example.com', 8500,  'Urgent property verification in Chennai — single visit required within 1 week', 'New', CURRENT_DATE),
      ('Kavitha Rao',   'kavitha@example.com', 5000,  'Fetch and courier Encumbrance Certificate from Coimbatore sub-registrar office', 'New', CURRENT_DATE - INTERVAL '1 day'),
      ('Arun Balaji',   'arun@example.com', 12000, 'Power of Attorney drafting + notarisation for property sale in Madurai', 'In Review', CURRENT_DATE - INTERVAL '4 days');
  END IF;
END $$;
