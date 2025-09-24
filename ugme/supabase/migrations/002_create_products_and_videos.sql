-- Create products table
create table public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amazon_url text not null,
  product_title text,
  product_description text,
  product_image_urls text[], -- Array of image URLs
  status text default 'pending' check (status in ('pending', 'processed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create videos table
create table public.videos (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_url text,
  thumbnail_url text,
  status text default 'generating' check (status in ('generating', 'completed', 'failed')),
  generation_prompt text,
  duration_seconds integer,
  file_size_bytes bigint,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.products enable row level security;
alter table public.videos enable row level security;

-- Create policies for products
create policy "Users can view their own products" on public.products
  for select using (auth.uid() = user_id);

create policy "Users can insert their own products" on public.products
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own products" on public.products
  for update using (auth.uid() = user_id);

create policy "Users can delete their own products" on public.products
  for delete using (auth.uid() = user_id);

-- Create policies for videos
create policy "Users can view their own videos" on public.videos
  for select using (auth.uid() = user_id);

create policy "Users can insert their own videos" on public.videos
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own videos" on public.videos
  for update using (auth.uid() = user_id);

create policy "Users can delete their own videos" on public.videos
  for delete using (auth.uid() = user_id);

-- Create indexes for better performance
create index products_user_id_idx on public.products(user_id);
create index products_status_idx on public.products(status);
create index videos_product_id_idx on public.videos(product_id);
create index videos_user_id_idx on public.videos(user_id);
create index videos_status_idx on public.videos(status);

-- Create function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Create triggers to automatically update updated_at
create trigger products_updated_at_trigger
  before update on public.products
  for each row execute procedure public.handle_updated_at();

create trigger videos_updated_at_trigger
  before update on public.videos
  for each row execute procedure public.handle_updated_at();