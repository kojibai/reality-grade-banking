export type ProfileOriginalAudioDistribution = {
  releaseTitle: string | null;
  primaryArtist: string | null;
  releaseType: "single" | "ep" | "album" | "mixtape" | "live" | null;
  genre: string | null;
  subgenre: string | null;
  explicit: boolean;
  isrc: string | null;
  writers: string | null;
  producer: string | null;
  label: string | null;
  releaseDate: string | null;
  territories: string | null;
};

export type ProfileOriginalEpubMetadata = {
  title: string | null;
  subtitle: string | null;
  primaryAuthor: string | null;
  contributors: string | null;
  publisher: string | null;
  imprint: string | null;
  genre: string | null;
  language: string | null;
  isbn: string | null;
  edition: string | null;
  series: string | null;
};

