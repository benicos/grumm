alter table public.categories
drop constraint if exists categories_visual_motif_check,
add constraint categories_visual_motif_check
check (
  visual_motif is null
  or visual_motif in (
    'timeline',
    'globe',
    'topography',
    'soundwave',
    'music-note',
    'projector',
    'film',
    'molecule',
    'orbit',
    'constellation',
    'book',
    'library',
    'antique-column',
    'laurel',
    'silhouette',
    'portrait',
    'brush',
    'frame',
    'map',
    'architecture',
    'star'
  )
);
