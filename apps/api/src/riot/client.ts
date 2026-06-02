export type RegionalRoute = "americas" | "asia" | "europe" | "sea";

export type PlatformRegion =
  | "br1"
  | "eun1"
  | "euw1"
  | "jp1"
  | "kr"
  | "la1"
  | "la2"
  | "na1"
  | "oc1"
  | "tr1"
  | "ru";

export type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

export type RiotSummoner = {
  id?: string;
  accountId?: string;
  puuid: string;
  profileIconId?: number;
  revisionDate?: number;
  summonerLevel?: number;
};

export type RiotRankedEntry = {
  leagueId?: string;
  queueType: string;
  tier?: string;
  rank?: string;
  summonerId?: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak?: boolean;
  veteran?: boolean;
  freshBlood?: boolean;
  inactive?: boolean;
};

export type RiotMatch = {
  metadata: {
    matchId: string;
    dataVersion?: string;
    participants?: string[];
  };
  info: Record<string, unknown>;
};

export type RiotErrorKind =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "unsupported_media_type"
  | "rate_limited"
  | "server_error"
  | "unknown";

export class RiotMissingApiKeyError extends Error {
  constructor() {
    super("RIOT_API_KEY is required to call the Riot API");
    this.name = "RiotMissingApiKeyError";
  }
}

export class RiotApiError extends Error {
  status: number;
  kind: RiotErrorKind;
  url: string;
  retryAfterSeconds?: number;

  constructor(args: {
    status: number;
    kind: RiotErrorKind;
    url: string;
    message?: string;
    retryAfterSeconds?: number;
  }) {
    super(args.message ?? `Riot API request failed with status ${args.status}`);
    this.name = "RiotApiError";
    this.status = args.status;
    this.kind = args.kind;
    this.url = args.url;
    this.retryAfterSeconds = args.retryAfterSeconds;
  }
}

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type RiotClientOptions = {
  apiKey: string | undefined;
  fetcher?: Fetcher;
};

type RiotRequestOptions = {
  route: RegionalRoute | PlatformRegion;
  path: string;
  searchParams?: Record<string, string | number | undefined>;
};

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function getBaseUrl(route: RegionalRoute | PlatformRegion) {
  return `https://${route}.api.riotgames.com`;
}

function getErrorKind(status: number): RiotErrorKind {
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 415:
      return "unsupported_media_type";
    case 429:
      return "rate_limited";
    case 500:
    case 503:
      return "server_error";
    default:
      return "unknown";
  }
}

function parseRetryAfterSeconds(response: Response) {
  const retryAfter = response.headers.get("Retry-After");

  if (!retryAfter) {
    return undefined;
  }

  const parsed = Number.parseInt(retryAfter, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function parseErrorMessage(response: Response) {
  try {
    const body = (await response.clone().json()) as {
      status?: { message?: string };
    };
    return body.status?.message;
  } catch {
    return undefined;
  }
}

export function createRiotClient(options: RiotClientOptions) {
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(requestOptions: RiotRequestOptions): Promise<T> {
    if (!options.apiKey) {
      throw new RiotMissingApiKeyError();
    }

    const url = new URL(requestOptions.path, getBaseUrl(requestOptions.route));

    for (const [key, value] of Object.entries(
      requestOptions.searchParams ?? {},
    )) {
      if (value !== undefined) {
        url.searchParams.set(key, value.toString());
      }
    }

    const response = await fetcher(url.toString(), {
      headers: {
        "X-Riot-Token": options.apiKey,
      },
    });

    if (!response.ok) {
      throw new RiotApiError({
        status: response.status,
        kind: getErrorKind(response.status),
        url: url.toString(),
        message: await parseErrorMessage(response),
        retryAfterSeconds: parseRetryAfterSeconds(response),
      });
    }

    return (await response.json()) as T;
  }

  return {
    getAccountByRiotId(args: {
      regionalRoute: RegionalRoute;
      gameName: string;
      tagLine: string;
    }) {
      return request<RiotAccount>({
        route: args.regionalRoute,
        path: `/riot/account/v1/accounts/by-riot-id/${encodePathSegment(
          args.gameName,
        )}/${encodePathSegment(args.tagLine)}`,
      });
    },

    getSummonerByPuuid(args: {
      platformRegion: PlatformRegion;
      puuid: string;
    }) {
      return request<RiotSummoner>({
        route: args.platformRegion,
        path: `/lol/summoner/v4/summoners/by-puuid/${encodePathSegment(
          args.puuid,
        )}`,
      });
    },

    getRankedEntriesByPuuid(args: {
      platformRegion: PlatformRegion;
      puuid: string;
    }) {
      return request<RiotRankedEntry[]>({
        route: args.platformRegion,
        path: `/lol/league/v4/entries/by-puuid/${encodePathSegment(
          args.puuid,
        )}`,
      });
    },

    getMatchIdsByPuuid(args: {
      regionalRoute: RegionalRoute;
      puuid: string;
      start?: number;
      count?: number;
    }) {
      return request<string[]>({
        route: args.regionalRoute,
        path: `/lol/match/v5/matches/by-puuid/${encodePathSegment(
          args.puuid,
        )}/ids`,
        searchParams: {
          start: args.start,
          count: args.count,
        },
      });
    },

    getMatchById(args: { regionalRoute: RegionalRoute; matchId: string }) {
      return request<RiotMatch>({
        route: args.regionalRoute,
        path: `/lol/match/v5/matches/${encodePathSegment(args.matchId)}`,
      });
    },
  };
}
