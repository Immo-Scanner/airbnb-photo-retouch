-- Redo flow: the customer (or admin) picks photos from a delivered batch
-- and asks for another retouch with a custom per-photo instruction. We
-- create a fresh batch that re-uses the EXISTING original_path of each
-- selected photo, and append the comment to the AI prompt.

alter table public.photos
  add column if not exists custom_prompt text;

alter table public.photos
  add column if not exists source_photo_id uuid references public.photos(id) on delete set null;

create index if not exists photos_source_photo_id_idx
  on public.photos(source_photo_id)
  where source_photo_id is not null;
