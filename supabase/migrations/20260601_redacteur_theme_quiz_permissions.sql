-- Allow editors to prepare the themes and quiz questions needed for facts.
-- Sensitive user, role and grade management remains restricted to administrators.
update public.roles
set permissions = (
  select jsonb_agg(distinct permission)
  from jsonb_array_elements_text(
    coalesce(permissions, '[]'::jsonb) ||
    '["themes.manage","quizzes.manage"]'::jsonb
  ) as permission
)
where slug = 'redacteur';
