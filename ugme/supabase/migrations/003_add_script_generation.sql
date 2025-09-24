-- Add columns for image selection and script generation
alter table public.products add column selected_image_url text;
alter table public.products add column script_segments text[];
alter table public.products add column script_generation_status text default 'pending' check (script_generation_status in ('pending', 'processing', 'completed', 'failed'));