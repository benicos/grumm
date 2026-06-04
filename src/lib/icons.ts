import {
  faAtom,
  faBookOpen,
  faBrain,
  faBriefcase,
  faBuildingColumns,
  faCameraRetro,
  faChartLine,
  faCompass,
  faEarthEurope,
  faFilm,
  faFlask,
  faGlobe,
  faLandmark,
  faLightbulb,
  faMicrochip,
  faMoon,
  faMusic,
  faPalette,
  faRocket,
  faScaleBalanced,
  faSeedling,
  faStar,
  faTheaterMasks,
  faUserAstronaut,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";

export type ThemeIconName =
  | "atom"
  | "book-open"
  | "brain"
  | "briefcase"
  | "camera-retro"
  | "chart-line"
  | "compass"
  | "earth-europe"
  | "film"
  | "flask"
  | "globe"
  | "landmark"
  | "lightbulb"
  | "microchip"
  | "moon"
  | "music"
  | "palette"
  | "rocket"
  | "scale-balanced"
  | "seedling"
  | "star"
  | "theater-masks"
  | "university"
  | "user-astronaut";

export type ThemeIconOption = {
  icon: IconDefinition;
  label: string;
  name: ThemeIconName;
};

export const themeIconOptions: ThemeIconOption[] = [
  { icon: faLandmark, label: "Histoire", name: "landmark" },
  { icon: faPalette, label: "Art", name: "palette" },
  { icon: faBookOpen, label: "Littérature", name: "book-open" },
  { icon: faAtom, label: "Science", name: "atom" },
  { icon: faBrain, label: "Psychologie", name: "brain" },
  { icon: faRocket, label: "Espace", name: "rocket" },
  { icon: faFilm, label: "Cinéma", name: "film" },
  { icon: faMusic, label: "Musique", name: "music" },
  { icon: faEarthEurope, label: "Géographie", name: "earth-europe" },
  { icon: faCompass, label: "Exploration", name: "compass" },
  { icon: faLightbulb, label: "Idées", name: "lightbulb" },
  { icon: faMicrochip, label: "Technologie", name: "microchip" },
  { icon: faFlask, label: "Expériences", name: "flask" },
  { icon: faSeedling, label: "Nature", name: "seedling" },
  { icon: faGlobe, label: "Monde", name: "globe" },
  { icon: faTheaterMasks, label: "Culture", name: "theater-masks" },
  { icon: faCameraRetro, label: "Images", name: "camera-retro" },
  { icon: faScaleBalanced, label: "Société", name: "scale-balanced" },
  { icon: faBriefcase, label: "Économie", name: "briefcase" },
  { icon: faChartLine, label: "Tendances", name: "chart-line" },
  { icon: faMoon, label: "Nocturne", name: "moon" },
  { icon: faUserAstronaut, label: "Personnalités", name: "user-astronaut" },
  { icon: faBuildingColumns, label: "Institutions", name: "university" },
  { icon: faStar, label: "Général", name: "star" },
];

export function getThemeIcon(name?: string | null) {
  return (
    themeIconOptions.find((option) => option.name === name)?.icon ??
    themeIconOptions[themeIconOptions.length - 1].icon
  );
}
