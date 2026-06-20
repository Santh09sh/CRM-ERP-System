-- Run this in your Supabase SQL Editor to link Google Auth with the CRM's profiles table

-- 1. Create a function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert into public.profiles
  -- When using Google Auth, the user's name and avatar are stored in raw_user_meta_data
  insert into public.profiles (id, full_name, email, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    'sales_rep', -- Default role for new signups
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Now, whenever anyone logs in via Google (or signs up), they will automatically
-- be injected into the CRM's profiles table!
