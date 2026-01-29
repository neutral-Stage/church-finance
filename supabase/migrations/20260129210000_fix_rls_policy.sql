-- Update user_has_church_access to allow super_admin global access
CREATE OR REPLACE FUNCTION user_has_church_access(p_church_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_church_roles ucr
        JOIN roles r ON ucr.role_id = r.id
        WHERE ucr.user_id = auth.uid()
        AND (
            (ucr.church_id = p_church_id AND ucr.is_active = true)
            OR
            (r.name = 'super_admin' AND ucr.is_active = true)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
