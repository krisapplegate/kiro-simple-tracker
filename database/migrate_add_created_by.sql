-- Migration: Add created_by column to objects table
-- This migration adds the created_by column to track object ownership

-- Add the created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'objects' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE objects ADD COLUMN created_by INTEGER REFERENCES users(id);
        
        -- Create index for the new column
        CREATE INDEX IF NOT EXISTS idx_objects_created_by ON objects(created_by);
        
        -- Update existing objects to be owned by the first admin user
        -- This is a safe default for existing data
        UPDATE objects 
        SET created_by = (
            SELECT id FROM users 
            WHERE role = 'admin' 
            ORDER BY id 
            LIMIT 1
        ) 
        WHERE created_by IS NULL;
        
        RAISE NOTICE 'Migration completed: added created_by column to objects table';
    ELSE
        RAISE NOTICE 'Migration skipped: created_by column already exists';
    END IF;
END $$;