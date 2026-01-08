export interface User {
    id: string;
    email: string;
    phone?: string;
    region?: string;
    status: 'active' | 'deactivated' | 'deleted';
    created_at: Date;
    updated_at: Date;
}
export interface AccountHistory {
    id: string;
    user_id: string;
    action: 'create' | 'modify' | 'deactivate' | 'delete';
    actor_type: 'founder' | 'system' | 'edge';
    reason_code: string;
    policy_version: string;
    device_fingerprint: string;
    created_at: Date;
    prev_hash?: string;
    curr_hash?: string;
}
export interface Transaction {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    subsystem: string;
    region: string;
    status: string;
    created_at: Date;
    prev_hash?: string;
    curr_hash?: string;
    reason_code: string;
    policy_version: string;
}
export interface PolicyVersion {
    version: string;
    council_refs?: any;
    notes: string;
    signature: string;
    activated_at: Date;
    retired_at?: Date;
}
export interface AuditLog {
    id: string;
    actor: string;
    subsystem: string;
    action: string;
    request_id: string;
    reason_code: string;
    policy_version: string;
    created_at: Date;
    prev_hash?: string;
    curr_hash?: string;
}
export interface Geocode {
    id: string;
    actor: string;
    address: string;
    lat: number;
    lng: number;
    provider: string;
    confidence: number;
    formatted_address: string;
    region_code: string;
    cached_at: Date;
}
export interface ProximityRule {
    id: string;
    rule_name: string;
    threshold_km: number;
    travel_time_target_ms: number;
    cluster_strategy: string;
    active: boolean;
    policy_version: string;
    created_at: Date;
}
export interface FounderContact {
    id: string;
    email: string;
    device_fingerprint: string;
    last_verified_at: Date;
    dmarc_aligned_at?: Date;
}
export interface FounderMessage {
    id: string;
    type: string;
    subject: string;
    body_hash: string;
    policy_version: string;
    reason_code: string;
    region: string;
    created_at: Date;
    signed_at?: Date;
    delivered_at?: Date;
    opened_at?: Date;
}
export interface FounderAction {
    id: string;
    message_id: string;
    action_type: 'approve' | 'deny' | 'rollback';
    actor_verification: string;
    result: string;
    timestamp: Date;
}
export interface DecisionRequest {
    actor: string;
    subsystem: string;
    purpose: string;
    context: {
        user_id: string;
        region: string;
        geocode?: Geocode;
        policy_version: string;
    };
}
export interface DecisionResponse {
    decision: boolean;
    reason_code: string;
    policy_version: string;
}
export interface GeocodeRequest {
    address: string;
}
export interface DistanceRequest {
    lat1: number;
    lng1: number;
    lat2: number;
    lng2: number;
}
export interface DistanceResponse {
    distance_km: number;
    verdict: boolean;
    reason_code: string;
    policy_version: string;
}
export interface ClusterRequest {
    points: Array<{
        lat: number;
        lng: number;
    }>;
    algorithm: 'kmeans' | 'dbscan';
    k?: number;
}
export interface ClusterResponse {
    clusters: Array<{
        id: number;
        points: Array<{
            lat: number;
            lng: number;
        }>;
        centroid: {
            lat: number;
            lng: number;
        };
    }>;
}
export interface HashChainable {
    prev_hash?: string;
    curr_hash?: string;
}
export interface CentralConfig {
    pc365MasterToken: string;
    founderEmail: string;
    serviceDeviceFingerprint: string;
    postgresUrl: string;
    redisUrl: string;
    kafkaUrl: string;
    googleMapsApiKey: string;
    emailSmtpUrl: string;
    emailDkimPrivateKey: string;
}
//# sourceMappingURL=types.d.ts.map