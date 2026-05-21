with new_facts (
  category_slug,
  slug,
  title,
  hook,
  content,
  source,
  source_url,
  display_order
) as (
  values
    ('espace', 'lune-seloigne-de-la-terre', 'La Lune s''eloigne lentement de la Terre.', 'Notre ciel change, meme si c''est presque imperceptible.', 'Les mesures laser montrent que la Lune s''eloigne d''environ 3,8 centimetres par an, un mouvement lie aux interactions de maree avec la Terre.', 'NASA Science', 'https://science.nasa.gov/moon/', 210),
    ('espace', 'traces-astronautes-lune', 'Les traces laissees sur la Lune peuvent durer tres longtemps.', 'Sans vent ni pluie, une empreinte devient presque une archive.', 'La Lune n''a pas d''atmosphere dense ni de meteo comme la Terre, donc les empreintes des missions Apollo peuvent rester visibles pendant des millions d''annees.', 'NASA', 'https://www.nasa.gov/history/alsj/', 220),
    ('espace', 'jupiter-tourne-en-dix-heures', 'Jupiter boucle une rotation en moins de 10 heures.', 'La plus grande planete a des journees tres courtes.', 'Malgre sa taille enorme, Jupiter tourne tres vite sur elle-meme, ce qui contribue a son aplatissement aux poles et a ses bandes atmospheriques.', 'NASA Solar System Exploration', 'https://solarsystem.nasa.gov/planets/jupiter/in-depth/', 230),
    ('espace', 'mars-plus-grand-volcan', 'Mars abrite le plus grand volcan connu du systeme solaire.', 'Olympus Mons depasse largement l''Everest.', 'Olympus Mons mesure environ 22 kilometres de haut, une taille rendue possible par la faible gravite martienne et une activite volcanique ancienne.', 'NASA Solar System Exploration', 'https://solarsystem.nasa.gov/planets/mars/in-depth/', 240),
    ('ocean', 'poulpes-trois-coeurs', 'Les poulpes ont trois coeurs.', 'Deux coeurs pour les branchies, un pour le reste du corps.', 'Chez le poulpe, deux coeurs poussent le sang vers les branchies, tandis qu''un troisieme l''envoie vers les organes et les muscles.', 'Smithsonian Ocean', 'https://ocean.si.edu/ocean-life/invertebrates/octopus', 250),
    ('ocean', 'baleine-bleue-plus-grand-animal', 'La baleine bleue est le plus grand animal connu.', 'Elle depasse tous les dinosaures connus par la masse.', 'Une baleine bleue adulte peut mesurer plus de 30 metres et peser plus de 150 tonnes, tout en se nourrissant surtout de minuscules krills.', 'NOAA Fisheries', 'https://www.fisheries.noaa.gov/species/blue-whale', 260),
    ('ocean', 'mangroves-protegent-cotes', 'Les mangroves protegent les cotes et stockent du carbone.', 'Ces forets entre terre et mer sont de vraies infrastructures naturelles.', 'Leurs racines freinent les vagues, abritent de jeunes poissons et piegent du carbone dans les sediments pendant de longues durees.', 'NOAA Ocean Service', 'https://oceanservice.noaa.gov/facts/mangroves.html', 270),
    ('ocean', 'recifs-coralliens-abritent-biodiversite', 'Les recifs coralliens couvrent peu d''ocean mais abritent beaucoup de vie.', 'De petites zones peuvent concentrer une biodiversite immense.', 'Les recifs occupent une fraction reduite des fonds marins, mais ils servent d''habitat, de nurserie et de refuge a de nombreuses especes.', 'NOAA Ocean Service', 'https://oceanservice.noaa.gov/facts/coralreef-climate.html', 280),
    ('corps-humain', 'os-vivants-se-renouvellent', 'Tes os sont vivants et se renouvellent.', 'Un squelette n''est pas une structure figee.', 'Le tissu osseux se remodele en permanence grace a des cellules qui retirent l''ancien os et en construisent du nouveau.', 'NIH Osteoporosis and Related Bone Diseases', 'https://www.bones.nih.gov/health-info/bone/bone-health/what-is-bone', 290),
    ('corps-humain', 'coeur-bat-cent-mille-fois', 'Ton coeur bat environ 100 000 fois par jour.', 'Un muscle discret fait un travail colossal.', 'Au repos comme en mouvement, le coeur pompe le sang en continu pour apporter oxygene et nutriments aux tissus.', 'Cleveland Clinic', 'https://my.clevelandclinic.org/health/body/21704-heart', 300),
    ('corps-humain', 'odorat-memoire-emotion', 'L''odorat est fortement lie a la memoire et aux emotions.', 'Une odeur peut faire revenir un souvenir tres vite.', 'Les signaux olfactifs sont connectes a des zones cerebrales impliquees dans l''emotion et la memoire, ce qui rend certaines odeurs particulierement evocatrices.', 'Harvard Gazette', 'https://news.harvard.edu/gazette/story/2020/02/how-scent-emotion-and-memory-are-intertwined-and-exploited/', 310),
    ('corps-humain', 'sommeil-consolide-memoire', 'Le sommeil aide a consolider la memoire.', 'Apprendre ne se termine pas quand tu fermes le livre.', 'Pendant le sommeil, le cerveau reorganise certaines informations recentes, ce qui peut renforcer l''apprentissage et la retention.', 'NIH News in Health', 'https://newsinhealth.nih.gov/2013/04/benefits-slumber', 320),
    ('histoire', 'beton-romain-durable', 'Le beton romain pouvait devenir plus resistant avec le temps.', 'Certaines constructions antiques doivent leur duree a une chimie remarquable.', 'Des etudes montrent que des materiaux volcaniques et des reactions minerales ont contribue a la durabilite de certains betons romains.', 'MIT News', 'https://news.mit.edu/2023/roman-concrete-durability-lime-casts-0106', 330),
    ('histoire', 'calendrier-gregorien-1582', 'Le calendrier gregorien a ete introduit en 1582.', 'Notre calendrier actuel est une correction astronomique.', 'Il a ete adopte pour mieux aligner l''annee civile avec l''annee solaire, apres une derive accumulee par le calendrier julien.', 'Encyclopaedia Britannica', 'https://www.britannica.com/science/Gregorian-calendar', 340),
    ('histoire', 'route-soie-reseau-echanges', 'La Route de la soie etait un reseau, pas une seule route.', 'Les idees voyageaient avec les marchandises.', 'Elle reliait plusieurs itineraire terrestres et maritimes ou circulaient soie, epices, technologies, religions et savoirs entre regions d''Asie, d''Afrique et d''Europe.', 'UNESCO Silk Roads Programme', 'https://en.unesco.org/silkroad/about-silk-roads', 350),
    ('histoire', 'papier-invente-en-chine', 'Le papier a ete perfectionne en Chine il y a pres de deux mille ans.', 'Un support simple a change la circulation du savoir.', 'La fabrication du papier a facilite la copie, l''administration et la diffusion des textes bien avant l''imprimerie moderne.', 'Encyclopaedia Britannica', 'https://www.britannica.com/technology/papermaking', 360),
    ('nature', 'lichens-association-vivante', 'Les lichens sont une association entre plusieurs organismes.', 'Ce n''est pas une plante unique.', 'Un lichen reunit notamment un champignon et un partenaire capable de photosynthese, comme une algue ou une cyanobacterie.', 'Encyclopaedia Britannica', 'https://www.britannica.com/science/lichen', 370),
    ('nature', 'bambou-croissance-rapide', 'Certains bambous comptent parmi les plantes a croissance la plus rapide.', 'Une tige peut gagner plusieurs dizaines de centimetres en une journee.', 'La croissance rapide de certains bambous vient de tissus deja formes dans la pousse, capables de s''allonger tres vite lorsque les conditions sont favorables.', 'Royal Botanic Gardens, Kew', 'https://www.kew.org/plants/bamboo', 380),
    ('psychologie', 'memoire-reconstructive', 'La memoire reconstruit plus qu''elle ne rejoue.', 'Se souvenir, ce n''est pas relire une video intacte.', 'Le cerveau reconstruit les souvenirs avec des fragments, le contexte et des attentes, ce qui explique pourquoi un souvenir peut changer avec le temps.', 'American Psychological Association', 'https://www.apa.org/topics/memory', 390),
    ('psychologie', 'espacer-apprentissage', 'Espacer les revisions aide souvent a mieux retenir.', 'Revenir plusieurs fois vaut mieux que tout concentrer.', 'L''effet d''espacement montre que repartir l''apprentissage sur plusieurs sessions peut ameliorer la memorisation a long terme.', 'American Psychological Association', 'https://www.apa.org/science/about/psa/2016/06/learning-memory', 400)
)
insert into public.facts (
  category_id,
  slug,
  title,
  hook,
  content,
  source,
  source_url,
  status,
  published_at,
  display_order
)
select
  categories.id,
  new_facts.slug,
  new_facts.title,
  new_facts.hook,
  new_facts.content,
  new_facts.source,
  new_facts.source_url,
  'published',
  now(),
  new_facts.display_order
from new_facts
join public.categories as categories
  on categories.slug = new_facts.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  title = excluded.title,
  hook = excluded.hook,
  content = excluded.content,
  source = excluded.source,
  source_url = excluded.source_url,
  status = excluded.status,
  published_at = coalesce(public.facts.published_at, excluded.published_at),
  display_order = excluded.display_order,
  updated_at = now();
