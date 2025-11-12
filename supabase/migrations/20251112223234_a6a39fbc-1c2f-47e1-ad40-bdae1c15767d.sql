-- Add entry_type column to container_entries
ALTER TABLE public.container_entries 
ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'receiving' CHECK (entry_type IN ('receiving', 'clearing'));