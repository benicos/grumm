insert into public.categories (name, slug, accent_color, tone)
values
  ('Espace', 'espace', '#ffd166', 'from-[#0b1424] via-[#132744] to-[#f0a95a]'),
  ('Ocean', 'ocean', '#6ae3c0', 'from-[#06121d] via-[#0b3954] to-[#33c3b3]'),
  ('Corps humain', 'corps-humain', '#ffb3bd', 'from-[#130f24] via-[#3a2758] to-[#ff6b7a]'),
  ('Histoire', 'histoire', '#f7d982', 'from-[#17110a] via-[#443018] to-[#e7c66b]'),
  ('Nature', 'nature', '#b8f28f', 'from-[#07140d] via-[#1f4d32] to-[#9bcf7a]'),
  ('Psychologie', 'psychologie', '#d2b3ff', 'from-[#21172f] via-[#3a2758] to-[#d2b3ff]')
on conflict (slug) do update set
  name = excluded.name,
  accent_color = excluded.accent_color,
  tone = excluded.tone;

insert into public.facts (
  category_id,
  title,
  hook,
  content,
  source,
  source_url,
  status,
  published_at,
  display_order
)
values
  ((select id from public.categories where slug = 'espace'), 'Une journee sur Venus dure plus longtemps qu''une annee venusienne.', 'Venus defie notre intuition du temps.', 'Venus tourne tres lentement sur elle-meme, alors qu''elle boucle son orbite autour du Soleil en environ 225 jours terrestres.', 'NASA Solar System Exploration', 'https://solarsystem.nasa.gov/planets/venus/in-depth/', 'published', now(), 10),
  ((select id from public.categories where slug = 'ocean'), 'La majorite de l''ocean reste encore non cartographiee avec precision.', 'On connait encore mal le relief profond de notre propre planete.', 'Les fonds marins sont immenses, profonds et difficiles a observer, ce qui rend leur exploration plus lente que celle de nombreuses surfaces planetaires.', 'NOAA Ocean Exploration', 'https://oceanexplorer.noaa.gov/', 'published', now(), 20),
  ((select id from public.categories where slug = 'corps-humain'), 'Ton cerveau consomme une part enorme de ton energie au repos.', 'Meme immobile, ton cerveau travaille.', 'Il maintient la memoire, l''attention, les emotions et les fonctions vitales en activite, ce qui explique une consommation energetique elevee.', 'Harvard Medical School', 'https://hms.harvard.edu/', 'published', now(), 30),
  ((select id from public.categories where slug = 'histoire'), 'La bibliotheque d''Alexandrie etait aussi un centre de recherche.', 'Ce n''etait pas seulement une collection de livres.', 'Elle rassemblait des textes, mais aussi des savants, des traducteurs et des chercheurs venus du monde mediterraneen.', 'Encyclopaedia Britannica', 'https://www.britannica.com/topic/Library-of-Alexandria', 'published', now(), 40),
  ((select id from public.categories where slug = 'nature'), 'Certains arbres communiquent par des reseaux souterrains.', 'Sous la foret, les racines ne sont pas seules.', 'Des champignons mycorhiziens peuvent relier les racines et faciliter des echanges de nutriments ou de signaux chimiques.', 'Royal Botanic Gardens, Kew', 'https://www.kew.org/', 'published', now(), 50),
  ((select id from public.categories where slug = 'psychologie'), 'Le cerveau complete parfois ce qu''il ne voit pas.', 'Percevoir, c''est aussi predire.', 'Pour gagner du temps, le cerveau combine les signaux visuels avec des attentes construites par l''experience.', 'American Psychological Association', 'https://www.apa.org/', 'published', now(), 60),
  ((select id from public.categories where slug = 'espace'), 'La lumiere du Soleil met environ huit minutes a atteindre la Terre.', 'Quand tu vois le Soleil, tu le vois legerement dans le passe.', 'La lumiere parcourt environ 150 millions de kilometres entre le Soleil et la Terre avant d''arriver jusqu''a nous.', 'NASA Space Place', 'https://spaceplace.nasa.gov/sun-light/', 'published', now(), 70),
  ((select id from public.categories where slug = 'ocean'), 'Les courants oceaniques transportent de la chaleur sur toute la planete.', 'L''ocean agit comme un regulateur geant.', 'Ces mouvements d''eau influencent les climats regionaux en deplacant chaleur, sel et nutriments.', 'NOAA Ocean Service', 'https://oceanservice.noaa.gov/', 'published', now(), 80),
  ((select id from public.categories where slug = 'corps-humain'), 'La peau est le plus grand organe du corps humain.', 'Elle est une frontiere active, pas une simple enveloppe.', 'Elle protege, regule la temperature et participe a la perception du toucher, de la pression et de la douleur.', 'Cleveland Clinic', 'https://my.clevelandclinic.org/', 'published', now(), 90),
  ((select id from public.categories where slug = 'histoire'), 'L''imprimerie a accelere la circulation des idees en Europe.', 'Un changement technique peut transformer une societe.', 'La production plus rapide de livres a facilite la diffusion des textes religieux, scientifiques et politiques.', 'Encyclopaedia Britannica', 'https://www.britannica.com/technology/printing-press', 'published', now(), 100);
