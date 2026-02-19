-- Create flashcards table
create table if not exists public.flashcards (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    front text not null,
    back text not null,
    subject text,
    topic text,
    interval_days integer default 0,
    ease_factor float default 2.5,
    repetitions integer default 0,
    next_review_at timestamptz default now(),
    created_at timestamptz default now()
);

-- Enable RLS
alter table public.flashcards enable row level security;

-- Policies
create policy "Users can view their own flashcards"
    on public.flashcards for select
    using (auth.uid() = user_id);

create policy "Users can insert their own flashcards"
    on public.flashcards for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own flashcards"
    on public.flashcards for update
    using (auth.uid() = user_id);

create policy "Users can delete their own flashcards"
    on public.flashcards for delete
    using (auth.uid() = user_id);

-- Add index for performance
create index if not exists flashcards_user_next_review_idx on public.flashcards(user_id, next_review_at);
