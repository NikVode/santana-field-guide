// Shapes of the site's JSON (only the fields the bot reads). See SCHEMA_NOTES.md.

export type EncounterType = "sword-trial" | "heros-realm";

export interface Mechanic { name: string; trigger: string; response: string; note?: string; needsVerification?: boolean }
export interface Talent { code: string; condition: string; smartAssist?: string; notes?: string; needsVerification?: boolean }
export interface Boss {
  id: string; name: string; summary?: string; worldBossNote?: string;
  mechanics?: Mechanic[]; talents?: Talent[]; needsVerification?: boolean; verifyNote?: string;
}
export interface Role { role: string; count?: number; duties?: Record<string, string> }
export interface Requirements {
  level?: string | number; mastery?: { value: string; source?: string }[];
  party?: string; bring?: string[]; notes?: string[];
}
export interface Encounter {
  id: string; name: string; type: EncounterType; level: number; players: number;
  coverage?: "full" | "partial" | "stub"; needsVerification?: boolean;
  variants?: { name: string; level: number; mastery?: string }[];
  requirements?: Requirements; roles?: Role[]; bosses: Boss[];
}
export interface Milestone { label: string; date?: string; at?: string; note?: string }
export interface Patch {
  version?: string; versionName?: string;
  season?: { name?: string; endDate?: string; endTime?: string; needsVerification?: boolean; verifyNote?: string; milestones?: Milestone[] };
  resets?: { utcOffset?: number; daily?: string; weekly?: { day: number; time: string }; note?: string };
  guildWar?: { days?: number[]; dayLabel?: string; time?: string; note?: string; battlegroups?: { name: string; region?: string; utcOffset: number }[] };
  comingSoon?: { title: string; date?: string; details?: string; needsVerification?: boolean }[];
}

export interface SiteData { siteUrl: string; encounters: Encounter[]; patch: Patch; stale?: boolean }

export const TYPE_LABEL: Record<string, string> = { "sword-trial": "Sword Trial", "heros-realm": "Hero's Realm" };
