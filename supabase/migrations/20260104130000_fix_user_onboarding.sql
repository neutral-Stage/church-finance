-- Trigger function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_church_id UUID;
    v_role_id UUID;
    v_full_name TEXT;
    v_role TEXT;
BEGIN
    -- Extract metadata from raw_user_meta_data
    v_full_name := new.raw_user_meta_data->>'name';
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'viewer');

    -- 1. Insert into public.users
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (new.id, new.email, v_full_name, v_role);

    -- 2. Create a default "Main Church" for this user (since every user needs a church context initially)
    INSERT INTO public.churches (name, type, description, created_by)
    VALUES ('Main Church', 'church', 'Default church created on signup', new.id)
    RETURNING id INTO v_church_id;

    -- 3. Get the ID for the 'super_admin' role (or fallback to 'church_admin')
    SELECT id INTO v_role_id FROM public.roles WHERE name = 'super_admin';
    
    -- Fallback if super_admin doesn't exist (shouldn't happen with migration, but safe practice)
    IF v_role_id IS NULL THEN
        SELECT id INTO v_role_id FROM public.roles WHERE name = 'church_admin';
    END IF;

    -- 4. Link User to Church with Role
    INSERT INTO public.user_church_roles (user_id, church_id, role_id, is_active)
    VALUES (new.id, v_church_id, v_role_id, true);

    -- 5. Create default User Preferences
    INSERT INTO public.user_preferences (user_id, selected_church_id, theme, notifications_enabled)
    VALUES (new.id, v_church_id, 'dark', true);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON TABLE public.users TO service_role;
GRANT ALL ON TABLE public.churches TO service_role;
GRANT ALL ON TABLE public.user_church_roles TO service_role;
GRANT ALL ON TABLE public.user_preferences TO service_role;
