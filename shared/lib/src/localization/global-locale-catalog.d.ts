export type LocaleEntry = {
    code: string;
    name: string;
};
export type GlobalLocaleCatalog = {
    metadata?: {
        source?: string;
        generatedAt?: string;
    };
    languages: LocaleEntry[];
    regions: LocaleEntry[];
};
export declare function loadGlobalLocaleCatalog(): GlobalLocaleCatalog;
export declare function isSupportedLanguage(code: string): boolean;
export declare function isSupportedRegion(code: string): boolean;
export declare function findLanguageName(code: string): string | undefined;
export declare function findRegionName(code: string): string | undefined;
