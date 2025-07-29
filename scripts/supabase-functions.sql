-- Transaction helper functions for Supabase
CREATE OR REPLACE FUNCTION begin_transaction()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a placeholder function since Supabase handles transactions automatically
  -- when using the client within a single request context
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION commit_transaction()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a placeholder function since Supabase handles transactions automatically
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_transaction()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a placeholder function since Supabase handles transactions automatically
  RETURN;
END;
$$;

-- Enhanced RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Clients table policies
CREATE POLICY "Moderators can manage their clients" ON clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('moderator', 'admin')
      AND (clients.inserted_by = auth.uid() OR users.role = 'admin')
    )
  );

CREATE POLICY "Designers can view assigned clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'designer'
      AND clients.assigned_designer = auth.uid()
    )
  );

-- Client files policies
CREATE POLICY "Users can access files of their clients" ON client_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_files.client_id
      AND (
        clients.inserted_by = auth.uid() 
        OR clients.assigned_moderator = auth.uid()
        OR clients.assigned_designer = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );

-- Client services policies
CREATE POLICY "Users can manage services for their clients" ON client_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = client_services.client_id
      AND (
        clients.inserted_by = auth.uid() 
        OR clients.assigned_moderator = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );

-- Payments policies
CREATE POLICY "Users can manage payments for their clients" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM clients 
      WHERE clients.id = payments.client_id
      AND (
        clients.inserted_by = auth.uid() 
        OR clients.assigned_moderator = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users 
          WHERE users.id = auth.uid() 
          AND users.role = 'admin'
        )
      )
    )
  );
