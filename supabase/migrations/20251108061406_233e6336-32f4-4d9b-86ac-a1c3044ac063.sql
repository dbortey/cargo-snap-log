-- Create container_entries table
CREATE TABLE public.container_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  container_number TEXT NOT NULL,
  container_size TEXT NOT NULL CHECK (container_size IN ('20ft', '40ft')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.container_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Anyone can view container entries" 
ON public.container_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create container entries" 
ON public.container_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update container entries" 
ON public.container_entries 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete container entries" 
ON public.container_entries 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_container_entries_created_at ON public.container_entries(created_at DESC);