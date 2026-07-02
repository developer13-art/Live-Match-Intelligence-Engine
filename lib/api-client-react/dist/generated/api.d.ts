import type { QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AgentStatus, ErrorResponse, HealthStatus, IntelligenceSummary, Match, MatchEvent, MatchSnapshot, NarrativeEntry, OddsSnapshot, OnChainAnchor, SharpMovement, Signal, WalletInfo } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListMatchesUrl: () => string;
/**
 * @summary List all live matches
 */
export declare const listMatches: (options?: RequestInit) => Promise<Match[]>;
export declare const getListMatchesQueryKey: () => readonly ["/api/matches"];
export declare const getListMatchesQueryOptions: <TData = Awaited<ReturnType<typeof listMatches>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMatches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMatches>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMatchesQueryResult = NonNullable<Awaited<ReturnType<typeof listMatches>>>;
export type ListMatchesQueryError = ErrorType<unknown>;
/**
 * @summary List all live matches
 */
export declare function useListMatches<TData = Awaited<ReturnType<typeof listMatches>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMatches>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMatchUrl: (matchId: string) => string;
/**
 * @summary Get match details
 */
export declare const getMatch: (matchId: string, options?: RequestInit) => Promise<Match>;
export declare const getGetMatchQueryKey: (matchId: string) => readonly [`/api/matches/${string}`];
export declare const getGetMatchQueryOptions: <TData = Awaited<ReturnType<typeof getMatch>>, TError = ErrorType<ErrorResponse>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMatch>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMatchQueryResult = NonNullable<Awaited<ReturnType<typeof getMatch>>>;
export type GetMatchQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get match details
 */
export declare function useGetMatch<TData = Awaited<ReturnType<typeof getMatch>>, TError = ErrorType<ErrorResponse>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatch>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMatchSnapshotUrl: (matchId: string) => string;
/**
 * @summary Get full intelligence snapshot for a match
 */
export declare const getMatchSnapshot: (matchId: string, options?: RequestInit) => Promise<MatchSnapshot>;
export declare const getGetMatchSnapshotQueryKey: (matchId: string) => readonly [`/api/matches/${string}/snapshot`];
export declare const getGetMatchSnapshotQueryOptions: <TData = Awaited<ReturnType<typeof getMatchSnapshot>>, TError = ErrorType<ErrorResponse>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatchSnapshot>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMatchSnapshot>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMatchSnapshotQueryResult = NonNullable<Awaited<ReturnType<typeof getMatchSnapshot>>>;
export type GetMatchSnapshotQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get full intelligence snapshot for a match
 */
export declare function useGetMatchSnapshot<TData = Awaited<ReturnType<typeof getMatchSnapshot>>, TError = ErrorType<ErrorResponse>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatchSnapshot>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListSignalsUrl: (matchId: string) => string;
/**
 * @summary Get recent intelligence signals for a match
 */
export declare const listSignals: (matchId: string, options?: RequestInit) => Promise<Signal[]>;
export declare const getListSignalsQueryKey: (matchId: string) => readonly [`/api/matches/${string}/signals`];
export declare const getListSignalsQueryOptions: <TData = Awaited<ReturnType<typeof listSignals>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSignals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSignals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSignalsQueryResult = NonNullable<Awaited<ReturnType<typeof listSignals>>>;
export type ListSignalsQueryError = ErrorType<unknown>;
/**
 * @summary Get recent intelligence signals for a match
 */
export declare function useListSignals<TData = Awaited<ReturnType<typeof listSignals>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSignals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetNarrativeUrl: (matchId: string) => string;
/**
 * @summary Get live narrative entries for a match
 */
export declare const getNarrative: (matchId: string, options?: RequestInit) => Promise<NarrativeEntry[]>;
export declare const getGetNarrativeQueryKey: (matchId: string) => readonly [`/api/matches/${string}/narrative`];
export declare const getGetNarrativeQueryOptions: <TData = Awaited<ReturnType<typeof getNarrative>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNarrative>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getNarrative>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetNarrativeQueryResult = NonNullable<Awaited<ReturnType<typeof getNarrative>>>;
export type GetNarrativeQueryError = ErrorType<unknown>;
/**
 * @summary Get live narrative entries for a match
 */
export declare function useGetNarrative<TData = Awaited<ReturnType<typeof getNarrative>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getNarrative>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListMatchEventsUrl: (matchId: string) => string;
/**
 * @summary Get match event log
 */
export declare const listMatchEvents: (matchId: string, options?: RequestInit) => Promise<MatchEvent[]>;
export declare const getListMatchEventsQueryKey: (matchId: string) => readonly [`/api/matches/${string}/events`];
export declare const getListMatchEventsQueryOptions: <TData = Awaited<ReturnType<typeof listMatchEvents>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMatchEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMatchEvents>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMatchEventsQueryResult = NonNullable<Awaited<ReturnType<typeof listMatchEvents>>>;
export type ListMatchEventsQueryError = ErrorType<unknown>;
/**
 * @summary Get match event log
 */
export declare function useListMatchEvents<TData = Awaited<ReturnType<typeof listMatchEvents>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMatchEvents>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetMatchOddsUrl: (matchId: string) => string;
/**
 * @summary Get current TxLINE odds for a match
 */
export declare const getMatchOdds: (matchId: string, options?: RequestInit) => Promise<OddsSnapshot>;
export declare const getGetMatchOddsQueryKey: (matchId: string) => readonly [`/api/matches/${string}/odds`];
export declare const getGetMatchOddsQueryOptions: <TData = Awaited<ReturnType<typeof getMatchOdds>>, TError = ErrorType<ErrorResponse>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatchOdds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMatchOdds>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMatchOddsQueryResult = NonNullable<Awaited<ReturnType<typeof getMatchOdds>>>;
export type GetMatchOddsQueryError = ErrorType<ErrorResponse>;
/**
 * @summary Get current TxLINE odds for a match
 */
export declare function useGetMatchOdds<TData = Awaited<ReturnType<typeof getMatchOdds>>, TError = ErrorType<ErrorResponse>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMatchOdds>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetOddsHistoryUrl: (matchId: string) => string;
/**
 * @summary Get odds movement history for a match
 */
export declare const getOddsHistory: (matchId: string, options?: RequestInit) => Promise<OddsSnapshot[]>;
export declare const getGetOddsHistoryQueryKey: (matchId: string) => readonly [`/api/matches/${string}/odds/history`];
export declare const getGetOddsHistoryQueryOptions: <TData = Awaited<ReturnType<typeof getOddsHistory>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOddsHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getOddsHistory>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetOddsHistoryQueryResult = NonNullable<Awaited<ReturnType<typeof getOddsHistory>>>;
export type GetOddsHistoryQueryError = ErrorType<unknown>;
/**
 * @summary Get odds movement history for a match
 */
export declare function useGetOddsHistory<TData = Awaited<ReturnType<typeof getOddsHistory>>, TError = ErrorType<unknown>>(matchId: string, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getOddsHistory>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetIntelligenceSummaryUrl: () => string;
/**
 * @summary Cross-match intelligence summary
 */
export declare const getIntelligenceSummary: (options?: RequestInit) => Promise<IntelligenceSummary>;
export declare const getGetIntelligenceSummaryQueryKey: () => readonly ["/api/intelligence/summary"];
export declare const getGetIntelligenceSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getIntelligenceSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIntelligenceSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getIntelligenceSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetIntelligenceSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getIntelligenceSummary>>>;
export type GetIntelligenceSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Cross-match intelligence summary
 */
export declare function useGetIntelligenceSummary<TData = Awaited<ReturnType<typeof getIntelligenceSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIntelligenceSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAgentStatusUrl: () => string;
/**
 * @summary Get Sharp Movement Detector agent status and statistics
 */
export declare const getAgentStatus: (options?: RequestInit) => Promise<AgentStatus>;
export declare const getGetAgentStatusQueryKey: () => readonly ["/api/agent/status"];
export declare const getGetAgentStatusQueryOptions: <TData = Awaited<ReturnType<typeof getAgentStatus>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAgentStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAgentStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAgentStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getAgentStatus>>>;
export type GetAgentStatusQueryError = ErrorType<unknown>;
/**
 * @summary Get Sharp Movement Detector agent status and statistics
 */
export declare function useGetAgentStatus<TData = Awaited<ReturnType<typeof getAgentStatus>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAgentStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListDetectionsUrl: () => string;
/**
 * @summary List all sharp movement detections
 */
export declare const listDetections: (options?: RequestInit) => Promise<SharpMovement[]>;
export declare const getListDetectionsQueryKey: () => readonly ["/api/agent/detections"];
export declare const getListDetectionsQueryOptions: <TData = Awaited<ReturnType<typeof listDetections>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDetections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listDetections>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListDetectionsQueryResult = NonNullable<Awaited<ReturnType<typeof listDetections>>>;
export type ListDetectionsQueryError = ErrorType<unknown>;
/**
 * @summary List all sharp movement detections
 */
export declare function useListDetections<TData = Awaited<ReturnType<typeof listDetections>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listDetections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListAnchorsUrl: () => string;
/**
 * @summary List on-chain signal anchors (Solana devnet)
 */
export declare const listAnchors: (options?: RequestInit) => Promise<OnChainAnchor[]>;
export declare const getListAnchorsQueryKey: () => readonly ["/api/agent/anchors"];
export declare const getListAnchorsQueryOptions: <TData = Awaited<ReturnType<typeof listAnchors>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAnchors>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAnchors>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAnchorsQueryResult = NonNullable<Awaited<ReturnType<typeof listAnchors>>>;
export type ListAnchorsQueryError = ErrorType<unknown>;
/**
 * @summary List on-chain signal anchors (Solana devnet)
 */
export declare function useListAnchors<TData = Awaited<ReturnType<typeof listAnchors>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAnchors>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAgentWalletUrl: () => string;
/**
 * @summary Get agent wallet address and devnet balance
 */
export declare const getAgentWallet: (options?: RequestInit) => Promise<WalletInfo>;
export declare const getGetAgentWalletQueryKey: () => readonly ["/api/agent/wallet"];
export declare const getGetAgentWalletQueryOptions: <TData = Awaited<ReturnType<typeof getAgentWallet>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAgentWallet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAgentWallet>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAgentWalletQueryResult = NonNullable<Awaited<ReturnType<typeof getAgentWallet>>>;
export type GetAgentWalletQueryError = ErrorType<unknown>;
/**
 * @summary Get agent wallet address and devnet balance
 */
export declare function useGetAgentWallet<TData = Awaited<ReturnType<typeof getAgentWallet>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAgentWallet>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map