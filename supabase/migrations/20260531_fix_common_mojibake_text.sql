create or replace function public.grumm_fix_common_mojibake(input_text text)
returns text
language sql
immutable
as $$
  select case
    when input_text is null then null
    else replace(
      replace(
      replace(
      replace(
      replace(
      replace(
      replace(
      replace(
      replace(
      replace(
      replace(
      replace(input_text,
        'ÃƒÂ©', 'é'),
        'Ã©', 'é'),
        'Ã¨', 'è'),
        'Ãª', 'ê'),
        'Ã ', 'à'),
        'Ã¢', 'â'),
        'Ã§', 'ç'),
        'Ã®', 'î'),
        'Ã´', 'ô'),
        'Ã¹', 'ù'),
        'â€™', '’'),
        'Å“', 'œ')
  end;
$$;

update public.facts
set
  title = public.grumm_fix_common_mojibake(title),
  hook = public.grumm_fix_common_mojibake(hook),
  content = public.grumm_fix_common_mojibake(content),
  long_content = public.grumm_fix_common_mojibake(long_content),
  source = public.grumm_fix_common_mojibake(source),
  seo_title = public.grumm_fix_common_mojibake(seo_title),
  seo_description = public.grumm_fix_common_mojibake(seo_description)
where
  title is distinct from public.grumm_fix_common_mojibake(title)
  or hook is distinct from public.grumm_fix_common_mojibake(hook)
  or content is distinct from public.grumm_fix_common_mojibake(content)
  or long_content is distinct from public.grumm_fix_common_mojibake(long_content)
  or source is distinct from public.grumm_fix_common_mojibake(source)
  or seo_title is distinct from public.grumm_fix_common_mojibake(seo_title)
  or seo_description is distinct from public.grumm_fix_common_mojibake(seo_description);

update public.categories
set name = public.grumm_fix_common_mojibake(name)
where name is distinct from public.grumm_fix_common_mojibake(name);

drop function public.grumm_fix_common_mojibake(text);
