-- Change license_plate_image to license_plate_number (text instead of image)
ALTER TABLE public.container_entries DROP COLUMN IF EXISTS license_plate_image;
ALTER TABLE public.container_entries ADD COLUMN license_plate_number TEXT;