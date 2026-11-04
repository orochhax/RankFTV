import libraryData from "./carlos-rocha-library.json";

export type CarlosRochaLibraryIdea = {
  id: string;
  title: string;
  score: number;
  scenario: string;
  premise: string;
  tension: string;
  visual: string;
  competitorReference: string;
  executionTip: string;
};

export type CarlosRochaLibraryCategory = {
  id: string;
  name: string;
  description: string;
  ideas: CarlosRochaLibraryIdea[];
};

export type CarlosRochaLibrary = {
  updatedAt: string;
  minActiveScore: number;
  categories: CarlosRochaLibraryCategory[];
};

export function getCarlosRochaLibrary(): CarlosRochaLibrary {
  return libraryData as CarlosRochaLibrary;
}
